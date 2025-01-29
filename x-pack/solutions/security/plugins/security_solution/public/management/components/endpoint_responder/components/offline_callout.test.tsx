/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../../common/endpoint/service/response_actions/constants';
import React from 'react';
import { HostStatus } from '../../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { OfflineCallout } from './offline_callout';
import { agentStatusGetHttpMock } from '../../../mocks';
import { agentStatusMocks } from '../../../../../common/endpoint/service/response_actions/mocks/agent_status.mocks';
import { waitFor } from '@testing-library/react';

describe('Responder offline callout', () => {
  let render: (agentType?: ResponseActionAgentType) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof agentStatusGetHttpMock>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    apiMocks = agentStatusGetHttpMock(mockedContext.coreStart.http);
    render = (agentType?: ResponseActionAgentType) =>
      (renderResult = mockedContext.render(
        <OfflineCallout
          endpointId={'abfe4a35-d5b4-42a0-a539-bd054c791769'}
          agentType={agentType || 'endpoint'}
          hostName="Host name"
        />
      ));
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)(
    'should be visible when agent type is %s and host is offline',
    async (agentType) => {
      apiMocks.responseProvider.getAgentStatus.mockReturnValue({
        data: {
          'abfe4a35-d5b4-42a0-a539-bd054c791769': agentStatusMocks.generateAgentStatus({
            agentType,
            status: HostStatus.OFFLINE,
          }),
        },
      });
      render(agentType);
      await waitFor(() => {
        expect(apiMocks.responseProvider.getAgentStatus).toHaveBeenCalled();
      });

      expect(renderResult.getByTestId('offlineCallout')).toBeTruthy();
    }
  );

  it.each(RESPONSE_ACTION_AGENT_TYPE)(
    'should NOT be visible when agent type is %s and host is online',
    async (agentType) => {
      render(agentType);
      await waitFor(() => {
        expect(apiMocks.responseProvider.getAgentStatus).toHaveBeenCalled();
      });

      expect(renderResult.queryByTestId('offlineCallout')).toBeNull();
    }
  );
});
