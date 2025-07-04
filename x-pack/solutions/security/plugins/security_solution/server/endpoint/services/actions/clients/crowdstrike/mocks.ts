/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CROWDSTRIKE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import { merge } from 'lodash';
import { BaseDataGenerator } from '../../../../../../common/endpoint/data_generators/base_data_generator';
import {
  createCrowdstrikeAgentDetailsMock,
  createCrowdstrikeGetAgentOnlineStatusDetailsMock,
  createCrowdstrikeGetAgentsApiResponseMock,
} from '../../../../../../scripts/endpoint/api_emulator/emulator_plugins/crowdstrike/mocks';
import type { ResponseActionsClientOptionsMock } from '../mocks';
import { responseActionsClientMock } from '../mocks';
import type { NormalizedExternalConnectorClient } from '../../..';
import { applyEsClientSearchMock } from '../../../../mocks/utils.mock';
import { CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION } from '../../../../../../common/endpoint/service/response_actions/crowdstrike';
import type { RunScriptActionRequestBody } from '../../../../../../common/api/endpoint';

export interface CrowdstrikeActionsClientOptionsMock extends ResponseActionsClientOptionsMock {
  connectorActions: NormalizedExternalConnectorClient;
}

const createConnectorActionsClientMock = (): ActionsClientMock => {
  const client = responseActionsClientMock.createConnectorActionsClient();

  (client.getAll as jest.Mock).mockImplementation(async () => {
    const result: ConnectorWithExtraFindData[] = [
      // Crowdstrike connector
      responseActionsClientMock.createConnector({
        actionTypeId: CROWDSTRIKE_CONNECTOR_ID,
        id: 'crowdstrike-connector-instance-id',
      }),
    ];

    return result;
  });

  (client.execute as jest.Mock).mockImplementation(
    async (options: Parameters<typeof client.execute>[0]) => {
      const subAction = options.params.subAction;

      switch (subAction) {
        case SUB_ACTION.GET_AGENT_DETAILS:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: createCrowdstrikeGetAgentsApiResponseMock([
              createCrowdstrikeAgentDetailsMock({}),
            ]),
          });

        default:
          return responseActionsClientMock.createConnectorActionExecuteResponse();
      }
    }
  );

  return client;
};

const createConstructorOptionsMock = (): CrowdstrikeActionsClientOptionsMock => {
  const options = {
    ...responseActionsClientMock.createConstructorOptions(),
    connectorActions: responseActionsClientMock.createNormalizedExternalConnectorClient(
      createConnectorActionsClientMock()
    ),
  };

  const crowdstrikeIndexDoc = BaseDataGenerator.toEsSearchHit({
    device: { id: '1-2-3' },
  });
  crowdstrikeIndexDoc.inner_hits = {
    most_recent: {
      hits: {
        hits: [
          {
            _index: '',
            _source: {
              agent: { id: 'fleet-agent-id-123' },
              device: { id: '1-2-3' },
            },
          },
        ],
      },
    },
  };
  applyEsClientSearchMock({
    esClientMock: options.esClient,
    index: CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION.crowdstrike[0],
    response: BaseDataGenerator.toEsSearchResponse([crowdstrikeIndexDoc]),
  });

  return options;
};

interface CrowdstrikeEventSearchResponseMock {
  hits: {
    hits: Array<{
      _id: string;
      _index: string;
      _source: Record<string, unknown>;
    }>;
  };
  _shards: { total: number; successful: number; failed: number };
  took: number;
  timed_out: boolean;
}

const createEventSearchResponseMock = (): CrowdstrikeEventSearchResponseMock => ({
  hits: {
    hits: [
      {
        _id: '1-2-3',
        _index: 'logs-crowdstrike.fdr-default',
        _source: {
          host: {
            name: 'Crowdstrike-1460',
          },
        },
      },
    ],
  },
  _shards: { total: 1, successful: 1, failed: 0 },
  took: 1,
  timed_out: false,
});

const createCrowdstrikeRunScriptOptionsMock = (
  overrides: Partial<RunScriptActionRequestBody> = {}
): RunScriptActionRequestBody => {
  const options: RunScriptActionRequestBody = {
    endpoint_ids: ['1-2-3'],
    comment: 'test comment',
    agent_type: 'crowdstrike',
    parameters: {
      raw: 'Write-Output "Hello from CrowdStrike script"',
      timeout: 60000,
    },
  };
  return merge(options, overrides);
};

export const CrowdstrikeMock = {
  createGetAgentsResponse: createCrowdstrikeGetAgentsApiResponseMock,
  createGetAgentOnlineStatusDetails: createCrowdstrikeGetAgentOnlineStatusDetailsMock,
  createCrowdstrikeAgentDetails: createCrowdstrikeAgentDetailsMock,
  createConnectorActionsClient: createConnectorActionsClientMock,
  createConstructorOptions: createConstructorOptionsMock,
  createEventSearchResponse: createEventSearchResponseMock,
  createCrowdstrikeRunScriptOptions: createCrowdstrikeRunScriptOptionsMock,
};
