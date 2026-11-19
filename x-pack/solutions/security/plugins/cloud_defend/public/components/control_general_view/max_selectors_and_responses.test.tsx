/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import userEvent from '@testing-library/user-event';
import { TestProvider } from '../../test/test_provider';
import {
  getCloudDefendNewPolicyMock,
  MOCK_YAML_TOO_MANY_FILE_SELECTORS_RESPONSES,
} from '../../test/mocks';
import { MAX_SELECTORS_AND_RESPONSES_PER_TYPE } from '../../common/constants';
import { ControlGeneralView } from '.';

// Rendering MAX + 1 real response forms in jsdom overruns the Jest timeout on CI.
// The limit under test lives in ControlGeneralView, not in the responses.
jest.mock('../control_general_view_response', () => ({
  ControlGeneralViewResponse: () => <div data-test-subj="cloud-defend-response-stub" />,
}));

describe('<ControlGeneralView /> at MAX_SELECTORS_AND_RESPONSES_PER_TYPE', () => {
  const params = coreMock.createAppMountParameters();

  it('prevents the user from adding more file selectors, but not process selectors', async () => {
    const { getAllByTestId, getByTestId } = render(
      <TestProvider params={params}>
        <ControlGeneralView
          policy={getCloudDefendNewPolicyMock(MOCK_YAML_TOO_MANY_FILE_SELECTORS_RESPONSES)}
          onChange={jest.fn()}
          show
        />
      </TestProvider>
    );

    expect(getAllByTestId('cloud-defend-response-stub')).toHaveLength(
      MAX_SELECTORS_AND_RESPONSES_PER_TYPE + 1
    );

    await userEvent.click(getByTestId('cloud-defend-btnAddSelector'));

    expect(getByTestId('cloud-defend-btnAddFileSelector')).toBeDisabled();
    expect(getByTestId('cloud-defend-btnAddProcessSelector')).toBeEnabled();
  });
});
