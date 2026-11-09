/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { act, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import {
  INFERENCE_CONNECTORS_INTERNAL_API_PATH,
  type InferenceConnectorsApiResponseBody,
} from '@kbn/inference-common';
import type {
  CreateWorkflowInsightResponse,
  GetPendingWorkflowInsightsResponse,
} from '../../../../../../../../../common/api/endpoint/workflow_insights/workflow_insights';
import type { SecurityWorkflowInsight } from '../../../../../../../../../common/endpoint/types/workflow_insights';
import {
  WORKFLOW_INSIGHTS_PENDING_ROUTE,
  WORKFLOW_INSIGHTS_ROUTE,
} from '../../../../../../../../../common/endpoint/constants';
import type { AppContextTestRender } from '../../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../../common/mock/endpoint';
import {
  composeHttpHandlerMocks,
  httpHandlerMockFactory,
  type ResponseProvidersInterface,
} from '../../../../../../../../common/mock/endpoint/http_handler_mock_factory';
import { useUserPrivileges as _useUserPrivileges } from '../../../../../../../../common/components/user_privileges';
import {
  fleetGetPackageHttpMock,
  type FleetGetPackageHttpMockInterface,
} from '../../../../../../../mocks/fleet_mocks';
import { WorkflowInsightsAB } from '../workflow_insights_ab';

jest.mock('../../../../../../../../common/components/user_privileges');

/** `POLL_INTERVAL_MS` in `hooks/insights/use_fetch_pending_scans.ts` (not exported). */
const POLL_INTERVAL_MS = 5000;

const ENDPOINT_ID = 'workflow-insights-ab-endpoint';

const CONNECTOR_ID = 'workflow-insights-ab-connector';

const RUNNING_EXECUTION: GetPendingWorkflowInsightsResponse['pending'][number] = {
  executionId: 'test-execution-id',
  status: 'running',
  conversationId: 'test-conversation-id',
  insightType: 'incompatible_antivirus',
  endpointId: ENDPOINT_ID,
  '@timestamp': '2024-12-16T13:45:03.055Z',
};

const INCOMPATIBLE_ANTIVIRUS_INSIGHT: SecurityWorkflowInsight = {
  id: 'CMm3z5MBPx3JiizjFx5g',
  '@timestamp': moment('2024-12-16T13:45:03.055Z'),
  message: 'Incompatible antiviruses detected',
  category: 'endpoint',
  type: 'incompatible_antivirus',
  source: {
    type: 'llm-connector',
    id: CONNECTOR_ID,
    data_range_start: moment('2024-12-16T13:45:03.055Z'),
    data_range_end: moment('2024-12-17T13:45:03.055Z'),
  },
  target: { type: 'endpoint', ids: [ENDPOINT_ID] },
  action: { type: 'refreshed', timestamp: moment('2024-12-16T13:45:03.055Z') },
  value: 'ClamAV',
  remediation: {
    exception_list_items: [
      {
        list_id: 'endpoint_trusted_apps',
        name: 'ClamAV',
        description: 'Suggested by Automatic Troubleshooting',
        entries: [
          {
            field: 'process.executable.caseless',
            type: 'match',
            value: '/usr/bin/clamscan',
            operator: 'included',
          },
        ],
        tags: ['policy:all'],
        os_types: ['linux'],
      },
    ],
  },
  metadata: { notes: { llm_model: '' } },
};

type WorkflowInsightsHttpMockInterface = ResponseProvidersInterface<{
  connectors: () => InferenceConnectorsApiResponseBody;
  pendingScans: () => GetPendingWorkflowInsightsResponse;
  insights: () => SecurityWorkflowInsight[];
  triggerScan: () => CreateWorkflowInsightResponse;
}>;

/** No scan running, no stored insights, one AI connector, and a POST that starts one execution. */
const workflowInsightsHttpMock = httpHandlerMockFactory<WorkflowInsightsHttpMockInterface>([
  {
    id: 'connectors',
    method: 'get',
    path: INFERENCE_CONNECTORS_INTERNAL_API_PATH,
    handler: () => ({
      connectors: [
        {
          connectorId: CONNECTOR_ID,
          name: 'AB-TEST-CONNECTOR',
          type: '.bedrock',
          config: {},
          isPreconfigured: false,
          isDeprecated: false,
          isMissingSecrets: false,
        },
      ],
      soEntryFound: false,
    }),
  },
  {
    id: 'pendingScans',
    method: 'get',
    path: WORKFLOW_INSIGHTS_PENDING_ROUTE,
    handler: () => ({ pending: [] }),
  },
  {
    id: 'insights',
    method: 'get',
    path: WORKFLOW_INSIGHTS_ROUTE,
    handler: () => [],
  },
  {
    id: 'triggerScan',
    method: 'post',
    path: WORKFLOW_INSIGHTS_ROUTE,
    handler: () => ({
      executions: [
        {
          executionId: RUNNING_EXECUTION.executionId,
          conversationId: RUNNING_EXECUTION.conversationId,
          insightType: 'incompatible_antivirus',
          endpointId: ENDPOINT_ID,
        },
      ],
    }),
  },
]);

const workflowInsightsPageHttpMock = composeHttpHandlerMocks<
  WorkflowInsightsHttpMockInterface & FleetGetPackageHttpMockInterface
>([workflowInsightsHttpMock, fleetGetPackageHttpMock]);

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('WorkflowInsightsAB scan flow (real hooks and children, mocked http)', () => {
  let user: UserEvent;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof workflowInsightsPageHttpMock>;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let authMockSetter: ReturnType<AppContextTestRender['getUserPrivilegesMockSetter']>;

  const scanButton = (): HTMLElement => renderResult.getByTestId('workflowInsightsScanButton');

  const advanceOnePoll = async (): Promise<void> => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockedContext = createAppRootMockRenderer();

    authMockSetter = mockedContext.getUserPrivilegesMockSetter(useUserPrivilegesMock);
    authMockSetter.set({
      canReadWorkflowInsights: true,
      canWriteWorkflowInsights: true,
      canWriteTrustedApplications: true,
    });

    apiMocks = workflowInsightsPageHttpMock(mockedContext.coreStart.http);

    render = () => {
      renderResult = mockedContext.render(<WorkflowInsightsAB endpointId={ENDPOINT_ID} />);
      return renderResult;
    };
  });

  afterEach(() => {
    authMockSetter.reset();
  });

  it('disables Scan after the user starts a scan', async () => {
    apiMocks.responseProvider.pendingScans.mockReturnValue({ pending: [RUNNING_EXECUTION] });
    apiMocks.responseProvider.pendingScans.mockReturnValueOnce({ pending: [] });
    render();
    await waitFor(() => expect(scanButton()).toBeEnabled());

    await user.click(scanButton());

    await waitFor(() => expect(apiMocks.responseProvider.triggerScan).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(scanButton()).toBeDisabled());
    await advanceOnePoll();
    expect(scanButton()).toBeDisabled();
  });

  it('keeps Scan disabled when a scan is already running on load', async () => {
    apiMocks.responseProvider.pendingScans.mockReturnValue({ pending: [RUNNING_EXECUTION] });
    render();

    await waitFor(() => expect(apiMocks.responseProvider.pendingScans).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(renderResult.getByTestId('connector-selector')).toHaveTextContent('AB-TEST-CONNECTOR')
    );
    expect(scanButton()).toBeDisabled();

    await advanceOnePoll();

    expect(apiMocks.responseProvider.pendingScans).toHaveBeenCalledTimes(2);
    expect(scanButton()).toBeDisabled();
  });

  it('renders the result after the scan completes', async () => {
    apiMocks.responseProvider.pendingScans.mockReturnValue({ pending: [RUNNING_EXECUTION] });
    apiMocks.responseProvider.pendingScans.mockReturnValueOnce({ pending: [] });
    render();
    await waitFor(() => expect(scanButton()).toBeEnabled());

    await user.click(scanButton());
    await waitFor(() => expect(scanButton()).toBeDisabled());
    expect(renderResult.queryByTestId('workflowInsightsResult-0')).toBeNull();

    // The scan finishes: the next poll finds no pending execution and the results are refetched.
    apiMocks.responseProvider.pendingScans.mockReturnValue({ pending: [] });
    apiMocks.responseProvider.insights.mockReturnValue([INCOMPATIBLE_ANTIVIRUS_INSIGHT]);
    await advanceOnePoll();

    const result = await renderResult.findByTestId('workflowInsightsResult-0');
    expect(result).toHaveTextContent('ClamAV');
    expect(result).toHaveTextContent('Incompatible antiviruses detected');
    expect(result).toHaveTextContent('/usr/bin/clamscan');
    expect(scanButton()).toBeEnabled();
  });
});
