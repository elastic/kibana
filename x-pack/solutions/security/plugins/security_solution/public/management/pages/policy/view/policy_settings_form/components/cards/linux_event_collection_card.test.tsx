/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactMatchText, expectIsViewOnly, getPolicySettingsFormTestSubjects } from '../../mocks';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import type { LinuxEventCollectionCardProps } from './linux_event_collection_card';
import { LinuxEventCollectionCard } from './linux_event_collection_card';
import { set } from '@kbn/safer-lodash-set';
import { ExperimentalFeaturesService } from '../../../../../../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../../../../../../common';

jest.mock('../../../../../../../common/experimental_features_service');

describe('Policy Linux Event Collection Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').linuxEvents;

  let mockedContext: AppContextTestRender;
  let formProps: LinuxEventCollectionCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    // Mock linuxDnsEvents FF as enabled by default
    (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
      ...allowedExperimentalValues,
      linuxDnsEvents: true,
    });

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };

    render = () =>
      (renderResult = mockedContext.render(<LinuxEventCollectionCard {...formProps} />));
  });

  it('should render card with expected content', () => {
    const { getByTestId } = render();

    expect(
      getByTestId(testSubj.optionsContainer).querySelectorAll('input[type="checkbox"]')
    ).toHaveLength(4);
    expect(getByTestId(testSubj.dnsCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.fileCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.networkCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.processCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.osValueContainer)).toHaveTextContent(exactMatchText('Linux'));
    expect(getByTestId(testSubj.sessionDataCheckbox)).not.toBeChecked();
    expect(getByTestId(testSubj.captureTerminalCheckbox)).toBeDisabled();
  });

  describe('and is displayed in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render card with expected content when session data collection is disabled', () => {
      render();
      const card = renderResult.getByTestId(testSubj.card);

      expectIsViewOnly(card);
      expect(card).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Event collection' +
            'Operating system' +
            'Linux ' +
            '4 / 4 event collections enabled' +
            'Events' +
            'DNS' +
            'File' +
            'Process' +
            'Network' +
            'Session data' +
            'Collect session data' +
            'Capture terminal output' +
            'Info'
        )
      );
    });

    it('should render card with expected content when session data collection is enabled', () => {
      set(formProps.policy, 'linux.events.session_data', true);
      set(formProps.policy, 'linux.events.tty_io', true);
      set(formProps.policy, 'linux.events.file', false);
      render();

      const card = renderResult.getByTestId(testSubj.card);

      expectIsViewOnly(card);
      expect(card).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Event collection' +
            'Operating system' +
            'Linux ' +
            '3 / 4 event collections enabled' +
            'Events' +
            'DNS' +
            'File' +
            'Process' +
            'Network' +
            'Session data' +
            'Collect session data' +
            'Capture terminal output' +
            'Info'
        )
      );
    });
  });

  describe('when linuxDnsEvents feature flag is disabled', () => {
    beforeEach(() => {
      (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue(allowedExperimentalValues);
      // Remove dns field from policy when FF is disabled
      delete formProps.policy.linux.events.dns;
    });

    it('should not render DNS checkbox', () => {
      const { getByTestId, queryByTestId } = render();

      expect(
        getByTestId(testSubj.optionsContainer).querySelectorAll('input[type="checkbox"]')
      ).toHaveLength(3);
      expect(queryByTestId(testSubj.dnsCheckbox)).not.toBeInTheDocument();
    });

    it('should render card with 3 total events in view mode', () => {
      formProps.mode = 'view';
      render();
      const card = renderResult.getByTestId(testSubj.card);

      expectIsViewOnly(card);
      expect(card).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Event collection' +
            'Operating system' +
            'Linux ' +
            '3 / 3 event collections enabled' +
            'Events' +
            'File' +
            'Process' +
            'Network' +
            'Session data' +
            'Collect session data' +
            'Capture terminal output' +
            'Info'
        )
      );
    });
  });
});
