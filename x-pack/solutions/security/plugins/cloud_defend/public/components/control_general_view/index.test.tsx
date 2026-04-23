/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import yaml from 'js-yaml';
import { render, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import userEvent from '@testing-library/user-event';
import { TestProvider } from '../../test/test_provider';
import {
  getCloudDefendNewPolicyMock,
  MOCK_YAML_INVALID_CONFIGURATION,
  MOCK_YAML_TOO_MANY_FILE_SELECTORS_RESPONSES,
} from '../../test/mocks';
import { ControlGeneralView } from '.';
import { getInputFromPolicy } from '../../../common/utils/helpers';
import { INPUT_CONTROL } from '../../../common/constants';

// FLAKY: https://github.com/elastic/kibana/issues/214268
describe.skip('<ControlGeneralView />', () => {
  const onChange = jest.fn();

  // defining this here to avoid a warning in testprovider with params.history changing on rerender.
  const params = coreMock.createAppMountParameters();

  const WrappedComponent = ({ policy = getCloudDefendNewPolicyMock() }) => {
    return (
      <TestProvider params={params}>
        <ControlGeneralView policy={policy} onChange={onChange} show />;
      </TestProvider>
    );
  };

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders a list of selectors and responses', () => {
    const { getAllByTestId } = render(<WrappedComponent />);

    const input = getInputFromPolicy(getCloudDefendNewPolicyMock(), INPUT_CONTROL);
    const configuration = input?.vars?.configuration?.value;

    try {
      const json = yaml.load(configuration);

      expect(json.file.selectors.length).toBe(getAllByTestId('cloud-defend-selector').length);
      expect(json.file.responses.length).toBe(getAllByTestId('cloud-defend-file-response').length);
      expect(json.file.selectors.length).toBe(3);
      expect(json.file.responses.length).toBe(2);
    } catch (err) {
      throw err;
    }
  });

  it('allows a user to add a new selector', async () => {
    const { getAllByTestId, getByTestId, rerender } = render(<WrappedComponent />);

    await userEvent.click(getByTestId('cloud-defend-btnAddSelector'));
    await userEvent.click(getByTestId('cloud-defend-btnAddFileSelector'));

    const policy = onChange.mock.calls[0][0].updatedPolicy;

    rerender(<WrappedComponent policy={policy} />);

    const input = getInputFromPolicy(policy, INPUT_CONTROL);
    const configuration = input?.vars?.configuration?.value;

    try {
      const json = yaml.load(configuration);

      expect(json.file.selectors.length).toBe(getAllByTestId('cloud-defend-selector').length);
    } catch (err) {
      throw err;
    }
  });

  it('allows a user to add a file response', async () => {
    const { getAllByTestId, getByTestId, rerender } = render(<WrappedComponent />);

    await userEvent.click(getByTestId('cloud-defend-btnAddResponse'));
    await userEvent.click(getByTestId('cloud-defend-btnAddFileResponse'));

    const policy = onChange.mock.calls[0][0].updatedPolicy;

    rerender(<WrappedComponent policy={policy} />);

    const input = getInputFromPolicy(policy, INPUT_CONTROL);
    const configuration = input?.vars?.configuration?.value;

    try {
      const json = yaml.load(configuration);

      expect(json.file.responses.length).toBe(getAllByTestId('cloud-defend-file-response').length);
    } catch (err) {
      throw err;
    }
  });

  it('allows a user to add a process response', async () => {
    const { getAllByTestId, getByTestId, rerender } = render(<WrappedComponent />);

    await userEvent.click(getByTestId('cloud-defend-btnAddResponse'));
    await userEvent.click(getByTestId('cloud-defend-btnAddProcessResponse'));

    const policy = onChange.mock.calls[0][0].updatedPolicy;

    rerender(<WrappedComponent policy={policy} />);

    const input = getInputFromPolicy(policy, INPUT_CONTROL);
    const configuration = input?.vars?.configuration?.value;

    try {
      const json = yaml.load(configuration);

      expect(json.process.responses.length).toBe(
        getAllByTestId('cloud-defend-process-response').length
      );
    } catch (err) {
      throw err;
    }
  });

  it('updates selector name used in response.match, if its name is changed', async () => {
    const { getByTitle, getAllByTestId, rerender } = render(<WrappedComponent />);

    const input = await waitFor(
      () => getAllByTestId('cloud-defend-selectorcondition-name')[1] as HTMLInputElement
    );

    await userEvent.type(input, '2');

    const policy = onChange.mock.calls[0][0].updatedPolicy;
    rerender(<WrappedComponent policy={policy} />);

    expect(getByTitle('Remove nginxOnly2 from selection in this group')).toBeTruthy(); // would be 'nginxOnly' had the update not worked
  });

  it('updates selector name used in response.exclude, if its name is changed', async () => {
    const { getByTitle, getAllByTestId, rerender } = render(<WrappedComponent />);

    const input = await waitFor(
      () => getAllByTestId('cloud-defend-selectorcondition-name')[2] as HTMLInputElement
    );

    await userEvent.type(input, '3');

    const policy = onChange.mock.calls[0][0].updatedPolicy;

    rerender(<WrappedComponent policy={policy} />);

    expect(getByTitle('Remove excludeCustomNginxBuild3 from selection in this group')).toBeTruthy();
  });

  it('removes a selector from a match/exclude list of a response if it is deleted', async () => {
    const { getByTestId, getAllByTestId } = render(<WrappedComponent />);
    const btnSelectorPopover = getAllByTestId('cloud-defend-btnselectorpopover')[0];
    btnSelectorPopover.click();

    await waitFor(() => getByTestId('cloud-defend-btndeleteselector').click());

    const policy = onChange.mock.calls[0][0].updatedPolicy;
    const input = getInputFromPolicy(policy, INPUT_CONTROL);
    const configuration = input?.vars?.configuration?.value;

    try {
      const json = yaml.load(configuration);

      expect(json.file.responses[0].match).toHaveLength(1);
    } catch (err) {
      throw err;
    }
  });

  it('doesnt blow up if invalid yaml passed in', async () => {
    const { queryAllByTestId } = render(
      <WrappedComponent policy={getCloudDefendNewPolicyMock(MOCK_YAML_INVALID_CONFIGURATION)} />
    );

    expect(queryAllByTestId('cloud-defend-selector')).toHaveLength(0);
    expect(queryAllByTestId('cloud-defend-response')).toHaveLength(0);
  });

  it('prevents the user from adding more than MAX_SELECTORS_AND_RESPONSES_PER_TYPE', async () => {
    const { getByTestId } = render(
      <WrappedComponent
        policy={getCloudDefendNewPolicyMock(MOCK_YAML_TOO_MANY_FILE_SELECTORS_RESPONSES)}
      />
    );

    await userEvent.click(getByTestId('cloud-defend-btnAddSelector'));
    expect(getByTestId('cloud-defend-btnAddFileSelector')).toBeDisabled();
  });

  it('allows the user to duplicate the selector', async () => {
    const { getByTestId, getAllByTestId } = render(<WrappedComponent />);
    const btnSelectorPopover = getAllByTestId('cloud-defend-btnselectorpopover')[0];
    btnSelectorPopover.click();

    await waitFor(() => getByTestId('cloud-defend-btnduplicateselector').click());
    const policy = onChange.mock.calls[0][0].updatedPolicy;
    const input = getInputFromPolicy(policy, INPUT_CONTROL);
    const configuration = input?.vars?.configuration?.value;

    try {
      const json = yaml.load(configuration);

      expect(json.file.selectors).toHaveLength(4);
      expect(json.file.selectors[3].name).toEqual(json.file.selectors[0].name + '1');
    } catch (err) {
      throw err;
    }
  });
});
