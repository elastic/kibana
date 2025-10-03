/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClient, ProcessPendingActionsMethodOptions } from '../lib/types';
import { responseActionsClientMock } from '../mocks';
import { SentinelOneActionsClient } from './sentinel_one_actions_client';
import { getActionDetailsById as _getActionDetailsById } from '../../action_details_by_id';
import { ResponseActionsNotSupportedError } from '../errors';
import type { SentinelOneActionsClientOptionsMock } from './mocks';
import { sentinelOneMock } from './mocks';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../../../common/endpoint/constants';
import type {
  NormalizedExternalConnectorClient,
  NormalizedExternalConnectorClientExecuteOptions,
} from '../../..';
import { applyEsClientSearchMock } from '../../../../mocks/utils.mock';
import { SENTINEL_ONE_ACTIVITY_INDEX_PATTERN } from '../../../../../../common';
import { SentinelOneDataGenerator } from '../../../../../../common/endpoint/data_generators/sentinelone_data_generator';
import type {
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  SentinelOneActivityEsDoc,
  SentinelOneIsolationRequestMeta,
  SentinelOneActivityDataForType80,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  SentinelOneGetFileRequestMeta,
  KillOrSuspendProcessRequestBody,
} from '../../../../../../common/endpoint/types';
import type { SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  ResponseActionGetFileRequestBody,
  GetProcessesRequestBody,
  RunScriptActionRequestBody,
  SentinelOneRunScriptActionRequestParams,
} from '../../../../../../common/api/endpoint';
import { SUB_ACTION } from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import { ACTIONS_SEARCH_PAGE_SIZE } from '../../constants';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { Readable } from 'stream';
import { RESPONSE_ACTIONS_ZIP_PASSCODE } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type {
  SentinelOneGetRemoteScriptStatusApiResponse,
  SentinelOneRemoteScriptExecutionStatus,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import {
  ENDPOINT_RESPONSE_ACTION_SENT_EVENT,
  ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT,
} from '../../../../../lib/telemetry/event_based/events';
import { FleetPackagePolicyGenerator } from '../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { SENTINEL_ONE_AGENT_INDEX_PATTERN } from '../../../../../../common/endpoint/service/response_actions/sentinel_one';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import { EndpointActionGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_action_generator';

jest.mock('../../action_details_by_id', () => {
  const originalMod = jest.requireActual('../../action_details_by_id');

  return {
    ...originalMod,
    getActionDetailsById: jest.fn(originalMod.getActionDetailsById),
  };
});

const getActionDetailsByIdMock = _getActionDetailsById as jest.Mock;

describe('SentinelOneActionsClient class', () => {
  let classConstructorOptions: SentinelOneActionsClientOptionsMock;
  let s1ActionsClient: ResponseActionsClient;
  let connectorActionsMock: DeeplyMockedKeys<NormalizedExternalConnectorClient>;

  const createS1IsolationOptions = (
    overrides: Omit<
      Parameters<typeof responseActionsClientMock.createIsolateOptions>[0],
      'agent_type'
    > = {}
  ) => responseActionsClientMock.createIsolateOptions({ ...overrides, agent_type: 'sentinel_one' });

  beforeEach(() => {
    classConstructorOptions = sentinelOneMock.createConstructorOptions();
    connectorActionsMock =
      classConstructorOptions.connectorActions as DeeplyMockedKeys<NormalizedExternalConnectorClient>;
    s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);

    getActionDetailsByIdMock.mockResolvedValue(
      new EndpointActionGenerator('seed').generateActionDetails({ id: 'abc' })
    );

    const fleetServices = classConstructorOptions.endpointService.getInternalFleetServices();
    const ensureInCurrentSpaceMock = jest.spyOn(fleetServices, 'ensureInCurrentSpace');

    ensureInCurrentSpaceMock.mockResolvedValue(undefined);

    const getInternalFleetServicesMock = jest.spyOn(
      classConstructorOptions.endpointService,
      'getInternalFleetServices'
    );
    getInternalFleetServicesMock.mockReturnValue(fleetServices);
  });

  it.each(['suspendProcess', 'execute', 'upload', 'scan'] as Array<keyof ResponseActionsClient>)(
    'should throw an un-supported error for %s',
    async (methodName) => {
      // @ts-expect-error Purposely passing in empty object for options
      await expect(s1ActionsClient[methodName]({})).rejects.toBeInstanceOf(
        ResponseActionsNotSupportedError
      );
    }
  );

  it('should error if multiple agent ids are received', async () => {
    const payload = createS1IsolationOptions();
    payload.endpoint_ids.push('second-host-id');

    await expect(s1ActionsClient.isolate(payload)).rejects.toMatchObject({
      message: `[body.endpoint_ids]: Multiple agents IDs not currently supported for SentinelOne`,
      statusCode: 400,
    });
  });

  describe(`#isolate()`, () => {
    it('should send action to sentinelone', async () => {
      await s1ActionsClient.isolate(createS1IsolationOptions());

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: 'isolateHost',
          subActionParams: {
            ids: '1-2-3',
          },
        },
      });
    });

    it('should write action request and response to endpoint indexes when `responseActionsSentinelOneV2Enabled` FF is Disabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled =
        false;
      await s1ActionsClient.isolate(createS1IsolationOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(2);
      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(
        1,
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'isolate',
                comment: 'test comment',
                parameters: undefined,
                hosts: {
                  '1-2-3': {
                    name: 'sentinelone-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: {
              id: ['1-2-3'],
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: expect.any(String),
                  elasticAgentId: '1-2-3',
                  integrationPolicyId: expect.any(String),
                },
              ],
            },
            originSpaceId: 'default',
            tags: [],
            user: { id: 'foo' },
            meta: {
              agentId: '1-2-3',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );

      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(2, {
        document: {
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: expect.any(String),
            data: { command: 'isolate' },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
            completed_at: expect.any(String),
          },
          agent: { id: ['1-2-3'] },
          error: undefined,
        },
        index: ENDPOINT_ACTION_RESPONSES_INDEX,
        refresh: 'wait_for',
      });
    });

    it('should write action request (only) to endpoint indexes when `responseActionsSentinelOneV2Enabled` FF is Enabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled =
        true;
      await s1ActionsClient.isolate(createS1IsolationOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(1);
      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(
        1,
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'isolate',
                comment: 'test comment',
                parameters: undefined,
                hosts: {
                  '1-2-3': {
                    name: 'sentinelone-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: {
              id: ['1-2-3'],
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: expect.any(String),
                  elasticAgentId: '1-2-3',
                  integrationPolicyId: expect.any(String),
                },
              ],
            },
            originSpaceId: 'default',
            tags: [],
            user: { id: 'foo' },
            meta: {
              agentId: '1-2-3',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should return action details', async () => {
      await s1ActionsClient.isolate(createS1IsolationOptions());

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should update cases', async () => {
      await s1ActionsClient.isolate(
        createS1IsolationOptions({
          case_ids: ['case-1'],
        })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });

    describe('telemetry events', () => {
      it('should send `isolate` action creation telemetry event', async () => {
        await s1ActionsClient.isolate(createS1IsolationOptions());

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_SENT_EVENT.eventType, {
          responseActions: {
            actionId: expect.any(String),
            agentType: 'sentinel_one',
            command: 'isolate',
            isAutomated: false,
          },
        });
      });
    });
  });

  describe('#release()', () => {
    it('should send action to sentinelone', async () => {
      await s1ActionsClient.release(createS1IsolationOptions());

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: 'releaseHost',
          subActionParams: {
            ids: '1-2-3',
          },
        },
      });
    });

    it('should write action request and response to endpoint indexes when `responseActionsSentinelOneV2Enabled` is Disabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled =
        false;
      await s1ActionsClient.release(createS1IsolationOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(2);
      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(
        1,
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'unisolate',
                comment: 'test comment',
                parameters: undefined,
                hosts: {
                  '1-2-3': {
                    name: 'sentinelone-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: {
              id: ['1-2-3'],
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: expect.any(String),
                  elasticAgentId: '1-2-3',
                  integrationPolicyId: expect.any(String),
                },
              ],
            },
            originSpaceId: 'default',
            tags: [],
            user: { id: 'foo' },
            meta: {
              agentId: '1-2-3',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(2, {
        document: {
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: expect.any(String),
            data: { command: 'unisolate' },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
            completed_at: expect.any(String),
          },
          agent: { id: ['1-2-3'] },
          error: undefined,
        },
        index: ENDPOINT_ACTION_RESPONSES_INDEX,
        refresh: 'wait_for',
      });
    });

    it('should write action request (only) to endpoint indexes when `responseActionsSentinelOneV2Enabled` is Enabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled =
        true;
      await s1ActionsClient.release(createS1IsolationOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(1);
      expect(classConstructorOptions.esClient.index).toHaveBeenNthCalledWith(
        1,
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'unisolate',
                comment: 'test comment',
                parameters: undefined,
                hosts: {
                  '1-2-3': {
                    name: 'sentinelone-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: {
              id: ['1-2-3'],
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: expect.any(String),
                  elasticAgentId: '1-2-3',
                  integrationPolicyId: expect.any(String),
                },
              ],
            },
            user: { id: 'foo' },
            meta: {
              agentId: '1-2-3',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
            },
            originSpaceId: 'default',
            tags: [],
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should return action details', async () => {
      await s1ActionsClient.release(createS1IsolationOptions());

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should update cases', async () => {
      await s1ActionsClient.release(
        createS1IsolationOptions({
          case_ids: ['case-1'],
        })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });

    describe('telemetry events', () => {
      it('should send `release` action creation telemetry event', async () => {
        await s1ActionsClient.release(createS1IsolationOptions());

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_SENT_EVENT.eventType, {
          responseActions: {
            actionId: expect.any(String),
            agentType: 'sentinel_one',
            command: 'unisolate',
            isAutomated: false,
          },
        });
      });
    });
  });

  describe('#processPendingActions()', () => {
    let abortController: AbortController;
    let processPendingActionsOptions: ProcessPendingActionsMethodOptions;

    const setGetRemoteScriptStatusConnectorResponse = (
      response: SentinelOneGetRemoteScriptStatusApiResponse
    ): void => {
      const executeMockFn = (connectorActionsMock.execute as jest.Mock).getMockImplementation();

      (connectorActionsMock.execute as jest.Mock).mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.GET_REMOTE_SCRIPT_STATUS) {
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: response,
          });
        }

        return executeMockFn!.call(connectorActionsMock, options);
      });
    };

    beforeEach(() => {
      abortController = new AbortController();
      processPendingActionsOptions = {
        abortSignal: abortController.signal,
        addToQueue: jest.fn(),
      };
    });

    describe('for Isolate and Release', () => {
      let actionRequestHits: Array<
        SearchHit<LogsEndpointAction<undefined, {}, SentinelOneIsolationRequestMeta>>
      >;
      let s1ActivityHits: Array<SearchHit<SentinelOneActivityEsDoc>>;

      beforeEach(() => {
        const s1DataGenerator = new SentinelOneDataGenerator('seed');
        const actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
          s1DataGenerator.generateActionEsHit<undefined, {}, SentinelOneIsolationRequestMeta>({
            agent: { id: 'agent-uuid-1' },
            EndpointActions: { data: { command: 'isolate' } },
            meta: {
              agentId: 's1-agent-a',
              agentUUID: 'agent-uuid-1',
              hostName: 's1-host-name',
            },
          }),
        ]);
        const actionResponsesSearchResponse = s1DataGenerator.toEsSearchResponse<
          LogsEndpointActionResponse | EndpointActionResponse
        >([]);
        const s1ActivitySearchResponse = s1DataGenerator.generateActivityEsSearchResponse([
          s1DataGenerator.generateActivityEsSearchHit({
            sentinel_one: {
              activity: {
                agent: {
                  id: 's1-agent-a',
                },
                type: 1001,
              },
            },
          }),
        ]);

        actionRequestHits = actionRequestsSearchResponse.hits.hits;
        s1ActivityHits = s1ActivitySearchResponse.hits.hits;

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: ENDPOINT_ACTIONS_INDEX,
          response: jest
            .fn(() => s1DataGenerator.toEsSearchResponse([]))
            .mockReturnValueOnce(actionRequestsSearchResponse),
          pitUsage: true,
        });

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
          response: actionResponsesSearchResponse,
        });

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
          response: s1ActivitySearchResponse,
        });
      });

      it('should generate action response docs for completed actions', async () => {
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith({
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
            completed_at: expect.any(String),
            data: {
              command: 'isolate',
            },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
          },
          agent: {
            id: 'agent-uuid-1',
          },
          error: undefined,
          meta: {
            activityLogEntryDescription: 'Some description here',
            activityLogEntryId: 'f4ab34cb-56f9-412d-9202-7691c3a6d70c',
            activityLogEntryType: 1001,
            elasticDocId: 'f28861a0-9771-4647-bb3f-b5a8e32a6126',
          },
        });
      });

      it('should NOT generate action responses if no activity received from S1', async () => {
        s1ActivityHits.length = 0;
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).not.toHaveBeenCalled();
      });

      it('should complete action as failure S1 agent id meta is missing (edge case)', async () => {
        actionRequestHits[0]!._source!.meta!.agentId = '';
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              message:
                "Unable to very if action completed. SentinelOne agent id ('meta.agentId') missing on action request document!",
            },
          })
        );
      });

      it('should generate failed isolate response doc if S1 activity `type` is 2010', async () => {
        s1ActivityHits[0]._source!.sentinel_one.activity.type = 2010;
        s1ActivityHits[0]._source!.sentinel_one.activity.description.primary =
          'Agent SOME_HOST_NAME was unable to disconnect from network.';
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              message: 'Agent SOME_HOST_NAME was unable to disconnect from network.',
            },
          })
        );
      });

      it('should search SentinelOne activity ES index with expected query for isolate', async () => {
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(classConstructorOptions.esClient.search).toHaveBeenNthCalledWith(4, {
          _source: false,
          collapse: {
            field: 'sentinel_one.activity.agent.id',
            inner_hits: {
              name: 'first_found',
              size: 1,
              sort: [{ 'sentinel_one.activity.updated_at': 'asc' }],
            },
          },
          index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
          query: {
            bool: {
              minimum_should_match: 1,
              must: [{ terms: { 'sentinel_one.activity.type': [1001, 2010] } }],
              should: [
                {
                  bool: {
                    filter: [
                      { term: { 'sentinel_one.activity.agent.id': 's1-agent-a' } },
                      {
                        range: {
                          'sentinel_one.activity.updated_at': { gt: expect.any(String) },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          size: ACTIONS_SEARCH_PAGE_SIZE,
          sort: [{ 'sentinel_one.activity.updated_at': { order: 'asc' } }],
        });
      });

      it('should search SentinelOne activity ES index with expected query for release', async () => {
        actionRequestHits[0]._source!.EndpointActions.data.command = 'unisolate';
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(classConstructorOptions.esClient.search).toHaveBeenNthCalledWith(4, {
          _source: false,
          collapse: {
            field: 'sentinel_one.activity.agent.id',
            inner_hits: {
              name: 'first_found',
              size: 1,
              sort: [{ 'sentinel_one.activity.updated_at': 'asc' }],
            },
          },
          index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
          query: {
            bool: {
              minimum_should_match: 1,
              must: [{ terms: { 'sentinel_one.activity.type': [1002] } }],
              should: [
                {
                  bool: {
                    filter: [
                      { term: { 'sentinel_one.activity.agent.id': 's1-agent-a' } },
                      {
                        range: {
                          'sentinel_one.activity.updated_at': { gt: expect.any(String) },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          size: ACTIONS_SEARCH_PAGE_SIZE,
          sort: [{ 'sentinel_one.activity.updated_at': { order: 'asc' } }],
        });
      });
    });

    describe('for get-file response action', () => {
      let actionRequestsSearchResponse: SearchResponse<
        LogsEndpointAction<ResponseActionGetFileParameters, ResponseActionGetFileOutputContent>
      >;

      beforeEach(() => {
        const s1DataGenerator = new SentinelOneDataGenerator('seed');
        actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
          s1DataGenerator.generateActionEsHit<
            ResponseActionGetFileParameters,
            ResponseActionGetFileOutputContent,
            SentinelOneGetFileRequestMeta
          >({
            agent: { id: 'agent-uuid-1' },
            EndpointActions: { data: { command: 'get-file' } },
            meta: {
              agentId: 's1-agent-a',
              agentUUID: 'agent-uuid-1',
              hostName: 's1-host-name',
              commandBatchUuid: 'batch-111',
              activityId: 'activity-222',
            },
          }),
        ]);
        const actionResponsesSearchResponse = s1DataGenerator.toEsSearchResponse<
          LogsEndpointActionResponse | EndpointActionResponse
        >([]);
        const s1ActivitySearchResponse = s1DataGenerator.generateActivityEsSearchResponse([
          s1DataGenerator.generateActivityEsSearchHit<SentinelOneActivityDataForType80>({
            sentinel_one: {
              activity: {
                id: 'activity-222',
                data: s1DataGenerator.generateActivityFetchFileResponseData({
                  flattened: {
                    commandBatchUuid: 'batch-111',
                  },
                }),
                agent: {
                  id: 's1-agent-a',
                },
                type: 80,
              },
            },
          }),
        ]);

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: ENDPOINT_ACTIONS_INDEX,
          response: jest
            .fn(() => s1DataGenerator.toEsSearchResponse([]))
            .mockReturnValueOnce(actionRequestsSearchResponse),
          pitUsage: true,
        });

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
          response: actionResponsesSearchResponse,
        });

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
          response: s1ActivitySearchResponse,
        });
      });

      it('should search for S1 activity with correct query', async () => {
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(classConstructorOptions.esClient.search).toHaveBeenNthCalledWith(4, {
          index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
          size: ACTIONS_SEARCH_PAGE_SIZE,
          query: {
            bool: {
              minimum_should_match: 1,
              must: [
                {
                  term: {
                    'sentinel_one.activity.type': 80,
                  },
                },
              ],
              should: [
                {
                  bool: {
                    filter: [
                      {
                        term: {
                          'sentinel_one.activity.agent.id': 's1-agent-a',
                        },
                      },
                      {
                        term: {
                          'sentinel_one.activity.data.flattened.commandBatchUuid': 'batch-111',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        });
      });

      it('should complete action as a failure if no S1 agentId/commandBatchUuid present in action request doc', async () => {
        actionRequestsSearchResponse.hits.hits[0]!._source!.meta = {
          agentId: 's1-agent-a',
          agentUUID: 'agent-uuid-1',
          hostName: 's1-host-name',
        };
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              message:
                'Unable to very if action completed. SentinelOne agent id or commandBatchUuid missing on action request document!',
            },
          })
        );
      });

      it('should generate an action success response doc', async () => {
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith({
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
            completed_at: expect.any(String),
            data: {
              command: 'get-file',
              comment: 'Some description here',
              output: {
                content: {
                  code: '',
                  contents: [],
                  zip_size: 0,
                },
                type: 'json',
              },
            },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
          },
          agent: {
            id: 'agent-uuid-1',
          },
          error: undefined,
          meta: {
            activityLogEntryId: 'activity-222',
            downloadUrl: '/agents/20793397/uploads/821770',
            elasticDocId: 'b5a8e32a-6126-45f7-b003-ebedf157b8e6',
            createdAt: expect.any(String),
            filename: 'file.zip',
          },
        });
      });
    });

    // The following response actions use SentinelOne's remote execution scripts, thus they can be
    // tested the same
    describe.each`
      actionName             | requestData                                                         | responseOutputContent
      ${'kill-process'}      | ${{ command: 'kill-process', parameters: { process_name: 'foo' } }} | ${{ code: 'ok', command: 'kill-process', process_name: 'foo' }}
      ${'running-processes'} | ${{ command: 'running-processes', parameters: undefined }}          | ${{ code: '', entries: [] }}
    `('for $actionName response action', ({ actionName, requestData, responseOutputContent }) => {
      let actionRequestsSearchResponse: SearchResponse<LogsEndpointAction>;

      beforeEach(() => {
        const s1DataGenerator = new SentinelOneDataGenerator('seed');

        actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
          s1DataGenerator.generateActionEsHit({
            agent: { id: 'agent-uuid-1' },
            EndpointActions: {
              data: requestData,
            },
            meta: {
              agentId: 's1-agent-a',
              agentUUID: 'agent-uuid-1',
              hostName: 's1-host-name',
              parentTaskId: 's1-parent-task-123',
            },
          }),
        ]);
        const actionResponsesSearchResponse = s1DataGenerator.toEsSearchResponse<
          LogsEndpointActionResponse | EndpointActionResponse
        >([]);

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: ENDPOINT_ACTIONS_INDEX,
          response: jest
            .fn(() => s1DataGenerator.toEsSearchResponse([]))
            .mockReturnValueOnce(actionRequestsSearchResponse),
          pitUsage: true,
        });

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
          response: actionResponsesSearchResponse,
        });
      });

      it('should create response as error if request has no parentTaskId', async () => {
        // @ts-expect-error
        actionRequestsSearchResponse.hits.hits[0]!._source!.meta!.parentTaskId = '';
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith({
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
            completed_at: expect.any(String),
            data: {
              command: requestData.command,
              comment: '',
            },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
          },
          agent: {
            id: 'agent-uuid-1',
          },
          error: {
            message:
              "Action request missing SentinelOne 'parentTaskId' value - unable check on its status",
          },
          meta: undefined,
        });
      });

      it('should do nothing if action is still pending', async () => {
        setGetRemoteScriptStatusConnectorResponse(
          new SentinelOneDataGenerator('seed').generateSentinelOneApiRemoteScriptStatusResponse({
            status: 'pending',
          })
        );
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).not.toHaveBeenCalled();
      });

      it.each`
        s1ScriptStatus | expectedResponseActionResponse
        ${'canceled'}  | ${'failure'}
        ${'expired'}   | ${'failure'}
        ${'failed'}    | ${'failure'}
        ${'completed'} | ${'success'}
      `(
        'should create $expectedResponseActionResponse response when S1 script status is $s1ScriptStatus',
        async ({ s1ScriptStatus, expectedResponseActionResponse }) => {
          const s1ScriptStatusResponse = new SentinelOneDataGenerator(
            'seed'
          ).generateSentinelOneApiRemoteScriptStatusResponse({
            status: s1ScriptStatus,
          });
          setGetRemoteScriptStatusConnectorResponse(s1ScriptStatusResponse);
          await s1ActionsClient.processPendingActions(processPendingActionsOptions);

          if (expectedResponseActionResponse === 'failure') {
            expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
              expect.objectContaining({
                error: {
                  message: expect.any(String),
                },
              })
            );
          } else {
            expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
              expect.objectContaining({
                meta: { taskId: s1ScriptStatusResponse.data[0].id },
                error: undefined,
                EndpointActions: expect.objectContaining({
                  data: expect.objectContaining({
                    output: {
                      type: 'json',
                      content: responseOutputContent,
                    },
                  }),
                }),
              })
            );
          }
        }
      );

      it.each([
        'created',
        'pending',
        'pending_user_action',
        'scheduled',
        'in_progress',
        'partially_completed',
      ])('should leave action pending when S1 script status is %s', async (s1ScriptStatus) => {
        setGetRemoteScriptStatusConnectorResponse(
          new SentinelOneDataGenerator('seed').generateSentinelOneApiRemoteScriptStatusResponse({
            status: s1ScriptStatus as SentinelOneRemoteScriptExecutionStatus['status'],
          })
        );
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).not.toHaveBeenCalled();
      });
    });

    describe('for Runscript action', () => {
      let actionRequestsSearchResponse: SearchResponse<LogsEndpointAction>;

      beforeEach(() => {
        const s1DataGenerator = new SentinelOneDataGenerator('seed');

        actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
          s1DataGenerator.generateActionEsHit({
            agent: { id: 'agent-uuid-1' },
            EndpointActions: {
              data: {
                command: 'runscript',
                parameters: { scriptId: '123', inputParams: '--some-option' },
              },
            },
            meta: {
              agentId: 's1-agent-a',
              agentUUID: 'agent-uuid-1',
              hostName: 's1-host-name',
              parentTaskId: 's1-parent-task-123',
            },
          }),
        ]);
        const actionResponsesSearchResponse = s1DataGenerator.toEsSearchResponse<
          LogsEndpointActionResponse | EndpointActionResponse
        >([]);

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: ENDPOINT_ACTIONS_INDEX,
          response: jest
            .fn(() => s1DataGenerator.toEsSearchResponse([]))
            .mockReturnValueOnce(actionRequestsSearchResponse),
          pitUsage: true,
        });

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient,
          index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
          response: actionResponsesSearchResponse,
        });
      });

      it('should create response with error if action request is missing S1 parent task id', async () => {
        // @ts-expect-error
        actionRequestsSearchResponse.hits.hits[0]!._source!.meta!.parentTaskId = '';
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith({
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
            completed_at: expect.any(String),
            data: { command: 'runscript', comment: '' },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
          },
          agent: { id: 'agent-uuid-1' },
          error: {
            message:
              "Action request missing SentinelOne 'parentTaskId' value - unable check on its status",
          },
          meta: undefined,
        });
      });

      it('should do nothing if action is still pending', async () => {
        setGetRemoteScriptStatusConnectorResponse(
          new SentinelOneDataGenerator('seed').generateSentinelOneApiRemoteScriptStatusResponse({
            status: 'pending',
          })
        );
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).not.toHaveBeenCalled();
      });

      it('should complete action', async () => {
        setGetRemoteScriptStatusConnectorResponse(
          new SentinelOneDataGenerator('seed').generateSentinelOneApiRemoteScriptStatusResponse({
            status: 'completed',
          })
        );
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith({
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
            completed_at: expect.any(String),
            data: {
              command: 'runscript',
              comment: 'Execution completed successfully',
              output: {
                content: { code: 'ok', stderr: '', stdout: '' },
                type: 'json',
              },
            },
            input_type: 'sentinel_one',
            started_at: expect.any(String),
          },
          agent: { id: 'agent-uuid-1' },
          error: undefined,
          meta: { taskId: 'b57d0bd6-31d0-41f4-ab34-cb56f9d12d12' },
        });
      });

      it('should complete action with error if script execution failed', async () => {
        const s1ScriptStatusResponse = new SentinelOneDataGenerator(
          'seed'
        ).generateSentinelOneApiRemoteScriptStatusResponse({
          status: 'failed',
        });
        setGetRemoteScriptStatusConnectorResponse(s1ScriptStatusResponse);
        await s1ActionsClient.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(
          expect.objectContaining({
            error: {
              message: expect.any(String),
            },
          })
        );
      });
    });

    describe('telemetry events', () => {
      describe('for Isolate and Release', () => {
        let s1ActivityHits: Array<SearchHit<SentinelOneActivityEsDoc>>;

        beforeEach(() => {
          const s1DataGenerator = new SentinelOneDataGenerator('seed');
          const actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
            s1DataGenerator.generateActionEsHit<undefined, {}, SentinelOneIsolationRequestMeta>({
              agent: { id: 'agent-uuid-1' },
              EndpointActions: { data: { command: 'isolate' } },
              meta: {
                agentId: 's1-agent-a',
                agentUUID: 'agent-uuid-1',
                hostName: 's1-host-name',
              },
            }),
          ]);
          const actionResponsesSearchResponse = s1DataGenerator.toEsSearchResponse<
            LogsEndpointActionResponse | EndpointActionResponse
          >([]);
          const s1ActivitySearchResponse = s1DataGenerator.generateActivityEsSearchResponse([
            s1DataGenerator.generateActivityEsSearchHit({
              sentinel_one: {
                activity: {
                  agent: {
                    id: 's1-agent-a',
                  },
                  type: 1001,
                },
              },
            }),
          ]);

          s1ActivityHits = s1ActivitySearchResponse.hits.hits;

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient,
            index: ENDPOINT_ACTIONS_INDEX,
            response: jest
              .fn(() => s1DataGenerator.toEsSearchResponse([]))
              .mockReturnValueOnce(actionRequestsSearchResponse),
            pitUsage: true,
          });

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient,
            index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
            response: actionResponsesSearchResponse,
          });

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient,
            index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
            response: s1ActivitySearchResponse,
          });
        });

        it('should send action response telemetry for completed/failed action', async () => {
          s1ActivityHits[0]._source!.sentinel_one.activity.type = 2010;
          s1ActivityHits[0]._source!.sentinel_one.activity.description.primary =
            'Agent SOME_HOST_NAME was unable to disconnect from network.';
          await s1ActionsClient.processPendingActions(processPendingActionsOptions);

          expect(
            classConstructorOptions.endpointService.getTelemetryService().reportEvent
          ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
            responseActions: {
              actionId: expect.any(String),
              actionStatus: 'failed',
              agentType: 'sentinel_one',
              command: 'isolate',
            },
          });
        });

        it('should send action response telemetry for completed/successful action', async () => {
          await s1ActionsClient.processPendingActions(processPendingActionsOptions);

          expect(
            classConstructorOptions.endpointService.getTelemetryService().reportEvent
          ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
            responseActions: {
              actionId: expect.any(String),
              actionStatus: 'successful',
              agentType: 'sentinel_one',
              command: 'isolate',
            },
          });
        });
      });

      describe('for get-file response action', () => {
        let actionRequestsSearchResponse: SearchResponse<
          LogsEndpointAction<ResponseActionGetFileParameters, ResponseActionGetFileOutputContent>
        >;

        beforeEach(() => {
          const s1DataGenerator = new SentinelOneDataGenerator('seed');
          actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
            s1DataGenerator.generateActionEsHit<
              ResponseActionGetFileParameters,
              ResponseActionGetFileOutputContent,
              SentinelOneGetFileRequestMeta
            >({
              agent: { id: 'agent-uuid-1' },
              EndpointActions: { data: { command: 'get-file' } },
              meta: {
                agentId: 's1-agent-a',
                agentUUID: 'agent-uuid-1',
                hostName: 's1-host-name',
                commandBatchUuid: 'batch-111',
                activityId: 'activity-222',
              },
            }),
          ]);
          const actionResponsesSearchResponse = s1DataGenerator.toEsSearchResponse<
            LogsEndpointActionResponse | EndpointActionResponse
          >([]);
          const s1ActivitySearchResponse = s1DataGenerator.generateActivityEsSearchResponse([
            s1DataGenerator.generateActivityEsSearchHit<SentinelOneActivityDataForType80>({
              sentinel_one: {
                activity: {
                  id: 'activity-222',
                  data: s1DataGenerator.generateActivityFetchFileResponseData({
                    flattened: {
                      commandBatchUuid: 'batch-111',
                    },
                  }),
                  agent: {
                    id: 's1-agent-a',
                  },
                  type: 80,
                },
              },
            }),
          ]);

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient,
            index: ENDPOINT_ACTIONS_INDEX,
            response: jest
              .fn(() => s1DataGenerator.toEsSearchResponse([]))
              .mockReturnValueOnce(actionRequestsSearchResponse),
            pitUsage: true,
          });

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient,
            index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
            response: actionResponsesSearchResponse,
          });

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient,
            index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
            response: s1ActivitySearchResponse,
          });
        });

        it('should send action response telemetry for completed/failed action', async () => {
          actionRequestsSearchResponse.hits.hits[0]!._source!.meta = {
            agentId: 's1-agent-a',
            agentUUID: 'agent-uuid-1',
            hostName: 's1-host-name',
          };
          await s1ActionsClient.processPendingActions(processPendingActionsOptions);

          expect(
            classConstructorOptions.endpointService.getTelemetryService().reportEvent
          ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
            responseActions: {
              actionId: expect.any(String),
              actionStatus: 'failed',
              agentType: 'sentinel_one',
              command: 'get-file',
            },
          });
        });

        it('should send action response telemetry for completed/successful action', async () => {
          await s1ActionsClient.processPendingActions(processPendingActionsOptions);

          expect(
            classConstructorOptions.endpointService.getTelemetryService().reportEvent
          ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
            responseActions: {
              actionId: expect.any(String),
              actionStatus: 'successful',
              agentType: 'sentinel_one',
              command: 'get-file',
            },
          });
        });
      });

      describe.each`
        actionName             | requestData
        ${'kill-process'}      | ${{ command: 'kill-process', parameters: { process_name: 'foo' } }}
        ${'running-processes'} | ${{ command: 'running-processes', parameters: undefined }}
      `('for $actionName response action', ({ actionName, requestData }) => {
        let actionRequestsSearchResponse: SearchResponse<LogsEndpointAction>;

        beforeEach(() => {
          const s1DataGenerator = new SentinelOneDataGenerator('seed');

          actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
            s1DataGenerator.generateActionEsHit({
              agent: { id: 'agent-uuid-1' },
              EndpointActions: {
                data: requestData,
              },
              meta: {
                agentId: 's1-agent-a',
                agentUUID: 'agent-uuid-1',
                hostName: 's1-host-name',
                parentTaskId: 's1-parent-task-123',
              },
            }),
          ]);
          const actionResponsesSearchResponse = s1DataGenerator.toEsSearchResponse<
            LogsEndpointActionResponse | EndpointActionResponse
          >([]);

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient,
            index: ENDPOINT_ACTIONS_INDEX,
            response: jest
              .fn(() => s1DataGenerator.toEsSearchResponse([]))
              .mockReturnValueOnce(actionRequestsSearchResponse),
            pitUsage: true,
          });

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient,
            index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
            response: actionResponsesSearchResponse,
          });
        });

        it('should send action response telemetry for completed/failed action', async () => {
          // @ts-expect-error
          actionRequestsSearchResponse.hits.hits[0]!._source!.meta!.parentTaskId = '';
          await s1ActionsClient.processPendingActions(processPendingActionsOptions);

          expect(
            classConstructorOptions.endpointService.getTelemetryService().reportEvent
          ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
            responseActions: {
              actionId: expect.any(String),
              actionStatus: 'failed',
              agentType: 'sentinel_one',
              command: actionName,
            },
          });
        });

        it('should send action response telemetry for completed/successful action', async () => {
          await s1ActionsClient.processPendingActions(processPendingActionsOptions);

          expect(
            classConstructorOptions.endpointService.getTelemetryService().reportEvent
          ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
            responseActions: {
              actionId: expect.any(String),
              actionStatus: 'successful',
              agentType: 'sentinel_one',
              command: actionName,
            },
          });
        });
      });
    });
  });

  describe('#getFile()', () => {
    let getFileReqOptions: ResponseActionGetFileRequestBody;

    beforeEach(() => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        true;

      getFileReqOptions = responseActionsClientMock.createGetFileOptions();
    });

    it('should error if feature flag is not enabled', async () => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        false;

      await expect(s1ActionsClient.getFile(getFileReqOptions)).rejects.toHaveProperty(
        'message',
        'get-file not supported for sentinel_one agent type. Feature disabled'
      );
    });

    it('should call the fetch agent files connector method with expected params', async () => {
      await s1ActionsClient.getFile(getFileReqOptions);

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: SUB_ACTION.FETCH_AGENT_FILES,
          subActionParams: {
            agentId: '1-2-3',
            files: [getFileReqOptions.parameters.path],
            zipPassCode: RESPONSE_ACTIONS_ZIP_PASSCODE.sentinel_one,
          },
        },
      });
    });

    it('should throw if sentinelone api generated an error (manual mode)', async () => {
      const executeMockFn = (connectorActionsMock.execute as jest.Mock).getMockImplementation();
      const err = new Error('oh oh');
      (connectorActionsMock.execute as jest.Mock).mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.FETCH_AGENT_FILES) {
          throw err;
        }
        return executeMockFn!.call(connectorActionsMock, options);
      });

      await expect(s1ActionsClient.getFile(getFileReqOptions)).rejects.toEqual(err);
      await expect(connectorActionsMock.execute).not.toHaveBeenCalledWith({
        params: expect.objectContaining({
          subAction: SUB_ACTION.GET_ACTIVITIES,
        }),
      });
    });

    it('should create failed response action when calling sentinelone api generated an error (automated mode)', async () => {
      const subActionsClient = sentinelOneMock.createConnectorActionsClient();
      classConstructorOptions = sentinelOneMock.createConstructorOptions();
      classConstructorOptions.isAutomated = true;
      classConstructorOptions.connectorActions =
        responseActionsClientMock.createNormalizedExternalConnectorClient(subActionsClient);
      connectorActionsMock =
        classConstructorOptions.connectorActions as DeeplyMockedKeys<NormalizedExternalConnectorClient>;
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        true;
      s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);

      const executeMockFn = (subActionsClient.execute as jest.Mock).getMockImplementation();
      const err = new Error('oh oh');
      (subActionsClient.execute as jest.Mock).mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.FETCH_AGENT_FILES) {
          throw err;
        }
        return executeMockFn!.call(SentinelOneActionsClient.prototype, options);
      });

      await expect(s1ActionsClient.getFile(getFileReqOptions)).resolves.toBeTruthy();
      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'get-file',
                comment: 'test comment',
                parameters: {
                  path: '/some/file',
                },
                hosts: {
                  '1-2-3': {
                    name: 'sentinelone-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: {
              id: ['1-2-3'],
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: expect.any(String),
                  elasticAgentId: '1-2-3',
                  integrationPolicyId: expect.any(String),
                },
              ],
            },
            originSpaceId: 'default',
            tags: [],
            user: { id: 'foo' },
            error: {
              // The error message here is "not supported" because `get-file` is not currently supported
              // for automated response actions. if that changes in the future the message below should
              // be changed to `err.message` (`err` is defined and used in the mock setup above)
              message: 'Action [get-file] not supported',
            },
            meta: {
              agentId: '1-2-3',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should query for the activity log entry record after successful submit of action', async () => {
      await s1ActionsClient.getFile(getFileReqOptions);

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: SUB_ACTION.GET_ACTIVITIES,
          subActionParams: {
            activityTypes: '81',
            limit: 1,
            sortBy: 'createdAt',
            sortOrder: 'asc',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            createdAt__gte: expect.any(String),
            agentIds: '1-2-3',
          },
        },
      });
    });

    it('should create action request ES document with expected meta content', async () => {
      await s1ActionsClient.getFile(getFileReqOptions);

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'get-file',
                comment: 'test comment',
                parameters: {
                  path: '/some/file',
                },
                hosts: {
                  '1-2-3': {
                    name: 'sentinelone-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: {
              id: ['1-2-3'],
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: expect.any(String),
                  elasticAgentId: '1-2-3',
                  integrationPolicyId: expect.any(String),
                },
              ],
            },
            originSpaceId: 'default',
            tags: [],
            user: { id: 'foo' },
            meta: {
              agentId: '1-2-3',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
              activityId: '1929937418124016884',
              commandBatchUuid: '7011777f-77e7-4a01-a674-e5f767808895',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should return action details', async () => {
      await expect(s1ActionsClient.getFile(getFileReqOptions)).resolves.toMatchObject(
        // Only validating that a ActionDetails is returned. The data is mocked,
        // so it does not make sense to validate the property values
        {
          action: expect.any(String),
          agentState: expect.any(Object),
          agentType: expect.any(String),
          agents: expect.any(Array),
          command: expect.any(String),
          comment: expect.any(String),
          createdBy: expect.any(String),
          hosts: expect.any(Object),
          id: expect.any(String),
          isCompleted: expect.any(Boolean),
          isExpired: expect.any(Boolean),
          startedAt: expect.any(String),
          status: expect.any(String),
          wasSuccessful: expect.any(Boolean),
        }
      );
    });

    it('should update cases', async () => {
      await s1ActionsClient.getFile(
        responseActionsClientMock.createGetFileOptions({ case_ids: ['case-1'] })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });

    describe('telemetry events', () => {
      it('should send `get-file` action creation telemetry event', async () => {
        await s1ActionsClient.getFile(getFileReqOptions);

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_SENT_EVENT.eventType, {
          responseActions: {
            actionId: expect.any(String),
            agentType: 'sentinel_one',
            command: 'get-file',
            isAutomated: false,
          },
        });
      });
    });
  });

  describe('#getFileInfo()', () => {
    beforeEach(() => {
      const s1DataGenerator = new SentinelOneDataGenerator('seed');
      const actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
        s1DataGenerator.generateActionEsHit({
          agent: { id: '123' },
          EndpointActions: { data: { command: 'get-file' } },
          meta: {
            agentId: 's1-agent-a',
            agentUUID: 'agent-uuid-1',
            hostName: 's1-host-name',
          },
        }),
      ]);

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: ENDPOINT_ACTIONS_INDEX,
        response: actionRequestsSearchResponse,
      });

      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        true;
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
        true;
    });

    it('should throw error if getFile feature flag is disabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        false;

      await expect(s1ActionsClient.getFileInfo('abc', '123')).rejects.toThrow(
        'File downloads are not supported for sentinel_one get-file. Feature disabled'
      );
    });

    it('should throw error if action id is not for an agent type of sentinelOne', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: SentinelOneDataGenerator.toEsSearchResponse([
          new SentinelOneDataGenerator('seed').generateActionEsHit({
            agent: { id: '123' },
            EndpointActions: { data: { command: 'get-file' }, input_type: 'endpoint' },
          }),
        ]),
      });

      await expect(s1ActionsClient.getFileInfo('abc', '123')).rejects.toThrow(
        'Action id [abc] with agent type of [sentinel_one] not found'
      );
    });

    it('should return file info with with status of AWAITING_UPLOAD if action is still pending', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: SentinelOneDataGenerator.toEsSearchResponse([]),
      });

      await expect(s1ActionsClient.getFileInfo('abc', '123')).resolves.toEqual({
        actionId: 'abc',
        agentId: '123',
        agentType: 'sentinel_one',
        created: '',
        id: '123',
        mimeType: '',
        name: '',
        size: 0,
        status: 'AWAITING_UPLOAD',
      });
    });

    it('should return expected file information', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: SentinelOneDataGenerator.toEsSearchResponse([]),
      });

      await expect(s1ActionsClient.getFileInfo('abc', '123')).resolves.toEqual({
        actionId: 'abc',
        agentId: '123',
        agentType: 'sentinel_one',
        created: '',
        id: '123',
        mimeType: '',
        name: '',
        size: 0,
        status: 'AWAITING_UPLOAD',
      });
    });

    it('should throw an error if command is `runscript` and feature flag is disabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
        false;
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: SentinelOneDataGenerator.toEsSearchResponse([
          new SentinelOneDataGenerator('seed').generateActionEsHit({
            agent: { id: '123' },
            EndpointActions: {
              data: {
                command: 'runscript',
                parameters: {
                  scriptId: '123',
                  inputParams: '',
                },
              },
              input_type: 'sentinel_one',
            },
          }),
        ]),
      });

      await expect(s1ActionsClient.getFileInfo('abc', '123')).rejects.toThrow(
        'File downloads are not supported for sentinel_one runscript. Feature disabled'
      );
    });
  });

  describe('#getFileDownload()', () => {
    let s1DataGenerator: SentinelOneDataGenerator;

    beforeEach(() => {
      s1DataGenerator = new SentinelOneDataGenerator('seed');

      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        true;
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
        true;

      const actionRequestsSearchResponse = s1DataGenerator.toEsSearchResponse([
        s1DataGenerator.generateActionEsHit({
          agent: { id: '123' },
          EndpointActions: { data: { command: 'get-file' } },
          meta: {
            agentId: 's1-agent-a',
            agentUUID: 'agent-uuid-1',
            hostName: 's1-host-name',
          },
        }),
      ]);

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: ENDPOINT_ACTIONS_INDEX,
        response: actionRequestsSearchResponse,
      });

      const esHit = s1DataGenerator.generateResponseEsHit({
        agent: { id: '123' },
        EndpointActions: { data: { command: 'get-file' } },
        meta: {
          activityLogEntryId: 'activity-1',
          elasticDocId: 'esdoc-1',
          downloadUrl: '/some/url',
          createdAt: '2024-05-09',
          filename: 'foo.zip',
        },
      });

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: s1DataGenerator.toEsSearchResponse([esHit]),
      });

      (connectorActionsMock.execute as jest.Mock).mockImplementation(
        (options: NormalizedExternalConnectorClientExecuteOptions) => {
          if (options.params.subAction === SUB_ACTION.DOWNLOAD_AGENT_FILE) {
            return {
              data: Readable.from(['test']),
            };
          }
        }
      );
    });

    it('should throw error if get-file feature flag is disabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled =
        false;
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneProcessesEnabled =
        false;

      await expect(s1ActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'File downloads are not supported for sentinel_one get-file. Feature disabled'
      );
    });

    it('should throw error if action id is not for an agent type of sentinelOne', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: SentinelOneDataGenerator.toEsSearchResponse([
          s1DataGenerator.generateActionEsHit({
            agent: { id: '123' },
            EndpointActions: { data: { command: 'get-file' }, input_type: 'endpoint' },
          }),
        ]),
      });

      await expect(s1ActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Action id [abc] with agent type of [sentinel_one] not found'
      );
    });

    it('should throw error if action is still pending for the given agent id', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: s1DataGenerator.toEsSearchResponse([]),
      });
      await expect(s1ActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Action ID [abc] for agent ID [123] is still pending'
      );
    });

    it('should throw error if the action response ES Doc is missing required data', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: s1DataGenerator.toEsSearchResponse([
          s1DataGenerator.generateResponseEsHit({
            agent: { id: '123' },
            EndpointActions: { data: { command: 'get-file' } },
            meta: { activityLogEntryId: undefined },
          }),
        ]),
      });

      await expect(s1ActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Unable to retrieve file from SentinelOne. Response ES document is missing [meta.activityLogEntryId]'
      );
    });

    it('should call SentinelOne connector to get file download Readable stream', async () => {
      await s1ActionsClient.getFileDownload('abc', '123');

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'downloadAgentFile',
          subActionParams: {
            activityId: 'activity-1',
            agentId: '123',
          },
        },
      });
    });

    it('should throw an error if call to SentinelOne did not return a Readable stream', async () => {
      (connectorActionsMock.execute as jest.Mock).mockReturnValue({ data: undefined });

      await expect(s1ActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Unable to establish a file download Readable stream with SentinelOne for response action [get-file] [abc]'
      );
    });

    it('should return expected data', async () => {
      await expect(s1ActionsClient.getFileDownload('abc', '123')).resolves.toEqual({
        stream: expect.any(Readable),
        fileName: 'foo.zip',
        mimeType: undefined,
      });
    });

    it('should throw an error if command is `runscript` and feature flag is disabled', async () => {
      // @ts-expect-error updating readonly attribute
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
        false;
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: SentinelOneDataGenerator.toEsSearchResponse([
          new SentinelOneDataGenerator('seed').generateActionEsHit({
            agent: { id: '123' },
            EndpointActions: {
              data: {
                command: 'runscript',
                parameters: {
                  scriptId: '123',
                  inputParams: '',
                },
              },
              input_type: 'sentinel_one',
            },
          }),
        ]),
      });

      await expect(s1ActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'File downloads are not supported for sentinel_one runscript. Feature disabled'
      );
    });
  });

  describe('#runscript()', () => {
    let runScriptRequest: RunScriptActionRequestBody<SentinelOneRunScriptActionRequestParams>;

    beforeEach(() => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
        true;

      runScriptRequest = sentinelOneMock.createRunScriptOptions({
        endpoint_ids: [sentinelOneMock.createSentinelOneAgentDetails().id],
        parameters: {
          scriptId: sentinelOneMock.createSentinelOneGetRemoteScriptsApiResponse().data[0].id,
          scriptInput: '--some-option=abc',
        },
      });
    });

    it('should throw error if feature flag is disabled', async () => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
        false;

      await expect(s1ActionsClient.runscript(runScriptRequest)).rejects.toThrow(
        `'runscript' response action not supported for [sentinel_one]. Feature disabled`
      );
    });

    it('should throw an error if `scriptId` is empty', async () => {
      runScriptRequest.parameters.scriptId = '';

      await expect(s1ActionsClient.runscript(runScriptRequest)).rejects.toThrow(
        '[parameters.scriptId]: missing parameter or value is empty'
      );
    });

    it('should throw an error if script ID is invalid', async () => {
      const executeMockImplementation = connectorActionsMock.execute.getMockImplementation()!;
      connectorActionsMock.execute.mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.GET_REMOTE_SCRIPTS) {
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: { data: [] },
          });
        }
        return executeMockImplementation.call(connectorActionsMock, options);
      });

      await expect(s1ActionsClient.runscript(runScriptRequest)).rejects.toThrow(
        'Script ID [1466645476786791838] not found'
      );
    });

    it('should throw an error if script does not support OS of agent', async () => {
      const executeMockImplementation = connectorActionsMock.execute.getMockImplementation()!;
      connectorActionsMock.execute.mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.GET_REMOTE_SCRIPTS) {
          const scriptsApiResponse = sentinelOneMock.createSentinelOneGetRemoteScriptsApiResponse();

          // @ts-expect-error TS2540: Cannot assign to read-only property.
          scriptsApiResponse.data[0].osTypes = ['windows'];
          // @ts-expect-error TS2540: Cannot assign to read-only property.
          scriptsApiResponse.data[0].scriptName = 'terminate something';

          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: scriptsApiResponse,
          });
        }
        return executeMockImplementation.call(connectorActionsMock, options);
      });

      await expect(s1ActionsClient.runscript(runScriptRequest)).rejects.toThrow(
        'Script [terminate something] not supported for OS type [linux]'
      );
    });

    it('should send execute script to SentinelOne', async () => {
      await s1ActionsClient.runscript(runScriptRequest);

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'executeScript',
          subActionParams: {
            filter: { ids: '1-2-3' },
            script: {
              inputParams: '--some-option=abc',
              outputDestination: 'SentinelCloud',
              requiresApproval: false,
              scriptId: '1466645476786791838',
              taskDescription: expect.stringContaining(
                'Action triggered from Elastic Security by user [foo] for action [runscript'
              ),
            },
          },
        },
      });
    });

    it('should throw an error if sending action to SentinelOne fails (manual/api mode)', async () => {
      const executeMockImplementation = connectorActionsMock.execute.getMockImplementation()!;
      connectorActionsMock.execute.mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.EXECUTE_SCRIPT) {
          throw new Error('failed');
        }
        return executeMockImplementation.call(connectorActionsMock, options);
      });

      await expect(s1ActionsClient.runscript(runScriptRequest)).rejects.toThrow('failed');
    });

    it('should create action request with error when sending action to SentinelOne fails (automated mode)', async () => {
      classConstructorOptions.isAutomated = true;
      classConstructorOptions.connectorActions =
        responseActionsClientMock.createNormalizedExternalConnectorClient(
          sentinelOneMock.createConnectorActionsClient()
        );
      s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);
      connectorActionsMock =
        classConstructorOptions.connectorActions as DeeplyMockedKeys<NormalizedExternalConnectorClient>;
      const executeMockImplementation = connectorActionsMock.execute.getMockImplementation()!;
      connectorActionsMock.execute.mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.EXECUTE_SCRIPT) {
          return Promise.reject(new Error('failed'));
        }
        return executeMockImplementation.call(connectorActionsMock, options);
      });

      await expect(s1ActionsClient.runscript(runScriptRequest)).resolves.toBeTruthy();

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            EndpointActions: expect.objectContaining({ input_type: 'sentinel_one' }),
            error: { message: 'Action [runscript] not supported' },
          }),
        }),
        { meta: true }
      );
    });

    it('should create action request in ES index', async () => {
      await expect(s1ActionsClient.runscript(runScriptRequest)).resolves.toBeTruthy();

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            EndpointActions: expect.objectContaining({
              input_type: 'sentinel_one',
              data: expect.objectContaining({
                command: 'runscript',
                parameters: { scriptId: '1466645476786791838', scriptInput: '--some-option=abc' },
                comment: '(Script name: Terminate Processes (Linux/macOS)) test comment',
              }),
            }),
          }),
        }),
        expect.anything()
      );
    });

    it('should return action details', async () => {
      await expect(s1ActionsClient.runscript(runScriptRequest)).resolves.toBeTruthy();

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });
  });

  describe('#killProcess()', () => {
    let killProcessActionRequest: KillOrSuspendProcessRequestBody;

    beforeEach(() => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneKillProcessEnabled =
        true;

      killProcessActionRequest = responseActionsClientMock.createKillProcessOptions({
        // @ts-expect-error TS2322 due to type being overloaded to handle kill/suspend process and specific option for S1
        parameters: { process_name: 'foo' },
      });
    });

    it('should throw an error if feature flag is disabled', async () => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneKillProcessEnabled =
        false;

      await expect(s1ActionsClient.killProcess(killProcessActionRequest)).rejects.toThrow(
        `kill-process not supported for sentinel_one agent type. Feature disabled`
      );
    });

    it('should throw an error if `process_name` is not defined (manual mode)', async () => {
      // @ts-expect-error
      killProcessActionRequest.parameters.process_name = '';

      await expect(s1ActionsClient.killProcess(killProcessActionRequest)).rejects.toThrow(
        '[body.parameters.process_name]: missing parameter or value is empty'
      );
    });

    it('should still create action at error if something goes wrong in automated mode', async () => {
      // @ts-expect-error
      killProcessActionRequest.parameters.process_name = '';
      classConstructorOptions.isAutomated = true;
      classConstructorOptions.connectorActions =
        responseActionsClientMock.createNormalizedExternalConnectorClient(
          sentinelOneMock.createConnectorActionsClient()
        );
      s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            error: {
              message: '[body.parameters.process_name]: missing parameter or value is empty',
            },
          }),
        }),
        { meta: true }
      );
    });

    it('should retrieve script execution information from S1 using host OS', async () => {
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: SUB_ACTION.GET_REMOTE_SCRIPTS,
          subActionParams: {
            osTypes: 'linux',
            query: 'terminate',
            scriptType: 'action',
          },
        },
      });
    });

    it('should throw error if unable to retrieve S1 script information', async () => {
      const executeMockImplementation = connectorActionsMock.execute.getMockImplementation()!;
      connectorActionsMock.execute.mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.GET_REMOTE_SCRIPTS) {
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: { data: [] },
          });
        }
        return executeMockImplementation.call(connectorActionsMock, options);
      });

      await expect(s1ActionsClient.killProcess(killProcessActionRequest)).rejects.toThrow(
        'Unable to find a script from SentinelOne to handle [kill-process] response action for host running [linux])'
      );
    });

    it('should send execute script request to S1 for kill-process', async () => {
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'executeScript',
          subActionParams: {
            filter: { ids: '1-2-3' },
            script: {
              inputParams: '--terminate --processes "foo" --force',
              outputDestination: 'SentinelCloud',
              requiresApproval: false,
              scriptId: '1466645476786791838',
              taskDescription: expect.stringContaining(
                'Action triggered from Elastic Security by user [foo] for action [kill-process'
              ),
            },
          },
        },
      });
    });

    it('should return action details on success', async () => {
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should create action request doc with expected meta info', async () => {
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'kill-process',
                comment: 'test comment',
                parameters: { process_name: 'foo' },
                hosts: {
                  '1-2-3': {
                    name: 'sentinelone-1460',
                  },
                },
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: {
              id: ['1-2-3'],
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: expect.any(String),
                  elasticAgentId: '1-2-3',
                  integrationPolicyId: expect.any(String),
                },
              ],
            },
            originSpaceId: 'default',
            tags: [],
            user: { id: 'foo' },
            meta: {
              agentId: '1-2-3',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
              parentTaskId: 'task-789',
            },
          },
          index: ENDPOINT_ACTIONS_INDEX,
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should update cases', async () => {
      killProcessActionRequest = {
        ...killProcessActionRequest,
        case_ids: ['case-1'],
      };
      await s1ActionsClient.killProcess(killProcessActionRequest);

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });

    describe('telemetry events', () => {
      it('should send `kill-process` action creation telemetry event', async () => {
        await s1ActionsClient.killProcess(killProcessActionRequest);

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_SENT_EVENT.eventType, {
          responseActions: {
            actionId: expect.any(String),
            agentType: 'sentinel_one',
            command: 'kill-process',
            isAutomated: false,
          },
        });
      });
    });
  });

  describe('#runningProcesses()', () => {
    let processesActionRequest: GetProcessesRequestBody;

    beforeEach(() => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneProcessesEnabled =
        true;

      processesActionRequest = responseActionsClientMock.createRunningProcessesOptions();
    });

    it('should error if feature flag is disabled', async () => {
      // @ts-expect-error readonly prop assignment
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneProcessesEnabled =
        false;

      await expect(s1ActionsClient.runningProcesses(processesActionRequest)).rejects.toThrow(
        `processes not supported for sentinel_one agent type. Feature disabled`
      );
    });

    it('should error if host is running Windows', async () => {
      connectorActionsMock.execute.mockResolvedValue(
        responseActionsClientMock.createConnectorActionExecuteResponse({
          data: sentinelOneMock.createGetAgentsResponse([
            sentinelOneMock.createSentinelOneAgentDetails({ osType: 'windows' }),
          ]),
        })
      );

      await expect(s1ActionsClient.runningProcesses(processesActionRequest)).rejects.toThrow(
        'Retrieval of running processes for Windows host is not supported by SentinelOne'
      );
    });

    it('should retrieve script execution information from S1 using host OS', async () => {
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'getRemoteScripts',
          subActionParams: {
            osTypes: 'linux',
            query: 'process list',
            scriptType: 'dataCollection',
          },
        },
      });
    });

    it('should error if unable to get S1 script information', async () => {
      const executeMockImplementation = connectorActionsMock.execute.getMockImplementation()!;
      connectorActionsMock.execute.mockImplementation(async (options) => {
        if (options.params.subAction === SUB_ACTION.GET_REMOTE_SCRIPTS) {
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: { data: [] },
          });
        }
        return executeMockImplementation.call(connectorActionsMock, options);
      });

      await expect(s1ActionsClient.runningProcesses(processesActionRequest)).rejects.toThrow(
        'Unable to find a script from SentinelOne to handle [running-processes] response action for host running [linux])'
      );
    });

    it('should send execute script request to S1 for process list', async () => {
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'executeScript',
          subActionParams: {
            filter: { ids: '1-2-3' },
            script: {
              inputParams: '',
              outputDestination: 'SentinelCloud',
              requiresApproval: false,
              scriptId: '1466645476786791838',
              taskDescription: expect.stringContaining(
                'Action triggered from Elastic Security by user [foo] for action [running-processes'
              ),
            },
          },
        },
      });
    });

    it('should return action details on success', async () => {
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should create action request doc with expected meta info', async () => {
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'running-processes',
                comment: 'test comment',
                hosts: { '1-2-3': { name: 'sentinelone-1460' } },
                parameters: undefined,
              },
              expiration: expect.any(String),
              input_type: 'sentinel_one',
              type: 'INPUT_ACTION',
            },
            agent: {
              id: ['1-2-3'],
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: expect.any(String),
                  elasticAgentId: '1-2-3',
                  integrationPolicyId: expect.any(String),
                },
              ],
            },
            originSpaceId: 'default',
            tags: [],
            meta: {
              agentId: '1-2-3',
              agentUUID: '1-2-3',
              hostName: 'sentinelone-1460',
              parentTaskId: 'task-789',
            },
            user: { id: 'foo' },
          },
          index: '.logs-endpoint.actions-default',
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should update cases', async () => {
      processesActionRequest = {
        ...processesActionRequest,
        case_ids: ['case-1'],
      };
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });

    it('should still create action request when running in automated mode', async () => {
      classConstructorOptions.isAutomated = true;
      classConstructorOptions.connectorActions =
        responseActionsClientMock.createNormalizedExternalConnectorClient(
          sentinelOneMock.createConnectorActionsClient()
        );
      s1ActionsClient = new SentinelOneActionsClient(classConstructorOptions);
      await s1ActionsClient.runningProcesses(processesActionRequest);

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            error: { message: 'Action [running-processes] not supported' },
          }),
        }),
        { meta: true }
      );
    });

    describe('telemetry events', () => {
      it('should send `kill-process` action creation telemetry event', async () => {
        await s1ActionsClient.runningProcesses(processesActionRequest);

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_SENT_EVENT.eventType, {
          responseActions: {
            actionId: expect.any(String),
            agentType: 'sentinel_one',
            command: 'running-processes',
            isAutomated: false,
          },
        });
      });
    });
  });

  describe('#getCustomScripts()', () => {
    beforeEach(() => {
      // @ts-expect-error update readonly property
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
        true;
    });

    it('should throw an error when feature flag is disabled', async () => {
      // @ts-expect-error update readonly property
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
        false;

      await expect(s1ActionsClient.getCustomScripts()).rejects.toThrow(
        "'runscript' response action not supported for [sentinel_one]"
      );
    });

    it('should retrieve list of scripts from SentinelOne', async () => {
      await s1ActionsClient.getCustomScripts();

      expect(classConstructorOptions.connectorActions.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'getRemoteScripts',
          subActionParams: {
            limit: 1000,
            sortBy: 'scriptName',
            sortOrder: 'asc',
          },
        },
      });
    });

    it('should accept `osType` option', async () => {
      await s1ActionsClient.getCustomScripts({ osType: 'windows' });

      expect(classConstructorOptions.connectorActions.execute).toHaveBeenCalledWith({
        params: {
          subAction: 'getRemoteScripts',
          subActionParams: {
            limit: 1000,
            sortBy: 'scriptName',
            sortOrder: 'asc',
            osTypes: 'windows',
          },
        },
      });
    });

    it('should return list of scripts', async () => {
      await expect(s1ActionsClient.getCustomScripts()).resolves.toEqual({
        data: [
          {
            description:
              'Input instructions: --terminate --processes <processes-name-templates> [-f|--force]',
            id: '1466645476786791838',
            name: 'Terminate Processes (Linux/macOS)',
            meta: {
              id: '1466645476786791838',
              inputExample: '--terminate --processes ping,chrome --force',
              inputInstructions: '--terminate --processes <processes-name-templates> [-f|--force]',
              inputRequired: true,
              osTypes: ['macos', 'linux'],
              scriptDescription: null,
              shortFileName: 'multi-operations-script-bash.sh',
            },
          },
        ],
      });
    });
  });

  describe('and space awareness is enabled', () => {
    beforeEach(() => {
      // @ts-expect-error assignment to readonly prop
      classConstructorOptions.endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled =
        true;

      getActionDetailsByIdMock.mockResolvedValue({});

      (
        classConstructorOptions.endpointService.getInternalFleetServices().packagePolicy
          .list as jest.Mock
      ).mockResolvedValue({
        items: [
          new FleetPackagePolicyGenerator('seed').generate({
            package: {
              name: 'sentinel_one',
              title: 'sentinelone',
              version: '1.0.0',
            },
            namespace: 'foo',
          }),
        ],
        page: 1,
        perPage: 10,
        total: 1,
      });

      const generator = new SentinelOneDataGenerator('seed');
      const agentSearchHit = generator.generateAgentEsSearchHit();

      agentSearchHit.inner_hits = {
        most_recent: {
          hits: {
            hits: [
              {
                _index: '',
                _source: {
                  agent: {
                    id: 'elastic-agent-id-1',
                  },
                  sentinel_one: {
                    agent: {
                      agent: {
                        id: '1-2-3',
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      };

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: SENTINEL_ONE_AGENT_INDEX_PATTERN,
        response: generator.generateAgentEsSearchResponse([agentSearchHit]),
      });
    });

    afterEach(() => {
      getActionDetailsByIdMock.mockReset();
    });

    it('should error is unable to build sentinelone agent index names', async () => {
      (
        classConstructorOptions.endpointService.getInternalFleetServices().packagePolicy
          .list as jest.Mock
      ).mockResolvedValue({ items: [] });

      await expect(s1ActionsClient.isolate(createS1IsolationOptions())).rejects.toThrow(
        'Unable to build list of indexes while retrieving policy information for SentinelOne agents [1-2-3]. Check to ensure at least one integration policy exists.'
      );
    });

    it('should search sentinelone agent index with correct index name', async () => {
      await expect(s1ActionsClient.isolate(createS1IsolationOptions())).resolves.toBeTruthy();

      expect(classConstructorOptions.esClient.search).toHaveBeenCalledWith({
        _source: false,
        collapse: {
          field: 'sentinel_one.agent.agent.id',
          inner_hits: {
            _source: ['agent', 'sentinel_one.agent.agent.id', 'event.created'],
            name: 'most_recent',
            size: 1,
            sort: [{ 'event.created': 'desc' }],
          },
        },
        ignore_unavailable: true,
        index: ['logs-sentinel_one.agent-foo'], // << Important: should NOT contain a index pattern
        query: {
          bool: { filter: [{ terms: { 'sentinel_one.agent.agent.id': ['1-2-3'] } }] },
        },
      });
    });

    it('should error if S1 agent id is not found in SentinelOne agent index', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: SENTINEL_ONE_AGENT_INDEX_PATTERN,
        response: SentinelOneDataGenerator.toEsSearchResponse([]),
      });

      await expect(s1ActionsClient.isolate(createS1IsolationOptions())).rejects.toThrow(
        'Unable to find elastic agent IDs for SentinelOne agent ids: [1-2-3]'
      );
    });

    it('should include agent policy info. when action request is written to index', async () => {
      await expect(s1ActionsClient.isolate(createS1IsolationOptions())).resolves.toBeTruthy();

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            agent: {
              id: ['1-2-3'],
              // FYI: mock that enables this to be generated is located in:
              // `x-pack/solutions/security/plugins/security_solution/server/endpoint/services/actions/clients/mocks.ts`
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: '6f12b025-fcb0-4db4-99e5-4927e3502bb8',
                  elasticAgentId: 'elastic-agent-id-1',
                  integrationPolicyId: '90d62689-f72d-4a05-b5e3-500cad0dc366',
                },
              ],
            },
          }),
        }),
        expect.anything()
      );
    });

    it.each(responseActionsClientMock.getClientSupportedResponseActionMethodNames('sentinel_one'))(
      'should error when %s is called with agents not valid for active space',
      async (methodName) => {
        (
          classConstructorOptions.endpointService.getInternalFleetServices().agent
            .getByIds as jest.Mock
        ).mockImplementation(async () => {
          throw new AgentNotFoundError('Agent some-id not found');
        });
        const options = sentinelOneMock.getOptionsForResponseActionMethod(methodName);

        if (methodName === 'runscript') {
          // @ts-expect-error write to readonly prop
          classConstructorOptions.endpointService.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
            true;
        }

        // @ts-expect-error `options` type is too broad because we're getting it from a helper
        await expect(s1ActionsClient[methodName](options)).rejects.toThrow(
          'Agent some-id not found'
        );
      }
    );
  });
});
