/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClient } from '../lib/types';
import { responseActionsClientMock } from '../mocks';
import { CrowdstrikeActionsClient } from './crowdstrike_actions_client';
import { getActionDetailsById as _getActionDetailsById } from '../../action_details_by_id';
import { ResponseActionsNotSupportedError } from '../errors';
import type { CrowdstrikeActionsClientOptionsMock } from './mocks';
import { CrowdstrikeMock } from './mocks';

import {
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../../../common/endpoint/constants';
import { SUB_ACTION } from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import type { NormalizedExternalConnectorClient } from '../../..';
import { applyEsClientSearchMock } from '../../../../mocks/utils.mock';
import { CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION } from '../../../../../../common/endpoint/service/response_actions/crowdstrike';
import { BaseDataGenerator } from '../../../../../../common/endpoint/data_generators/base_data_generator';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import {
  ENDPOINT_RESPONSE_ACTION_SENT_EVENT,
  ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT,
} from '../../../../../lib/telemetry/event_based/events';

jest.mock('../../action_details_by_id', () => {
  const originalMod = jest.requireActual('../../action_details_by_id');

  return {
    ...originalMod,
    getActionDetailsById: jest.fn(originalMod.getActionDetailsById),
  };
});

const getActionDetailsByIdMock = _getActionDetailsById as jest.Mock;

describe('CrowdstrikeActionsClient class', () => {
  let classConstructorOptions: CrowdstrikeActionsClientOptionsMock;
  let crowdstrikeActionsClient: ResponseActionsClient;
  let connectorActionsMock: NormalizedExternalConnectorClient;

  const createCrowdstrikeIsolationOptions = (
    overrides: Omit<
      Parameters<typeof responseActionsClientMock.createIsolateOptions>[0],
      'agent_type'
    > = {}
  ) => responseActionsClientMock.createIsolateOptions({ ...overrides, agent_type: 'crowdstrike' });

  const createCrowdstrikeRunscrtiptOptions = (
    overrides: Omit<
      Parameters<typeof responseActionsClientMock.createIsolateOptions>[0],
      'agent_type'
    > = {}
  ) =>
    responseActionsClientMock.createRunScriptOptions({ ...overrides, agent_type: 'crowdstrike' });

  beforeEach(() => {
    classConstructorOptions = CrowdstrikeMock.createConstructorOptions();
    connectorActionsMock = classConstructorOptions.connectorActions;
    crowdstrikeActionsClient = new CrowdstrikeActionsClient(classConstructorOptions);

    const esClientSearchCallback = classConstructorOptions.esClient.search.getMockImplementation();
    classConstructorOptions.esClient.search.mockImplementation(async (...args) => {
      const options = args[0];
      if (options?.index?.[0] === 'logs-crowdstrike*') {
        return CrowdstrikeMock.createEventSearchResponse();
      }

      if (esClientSearchCallback) {
        return esClientSearchCallback(...args);
      }

      return BaseDataGenerator.toEsSearchResponse([]);
    });

    (
      classConstructorOptions.endpointService.getInternalFleetServices()
        .ensureInCurrentSpace as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it.each([
    'killProcess',
    'suspendProcess',
    'runningProcesses',
    'getFile',
    'execute',
    'upload',
  ] as Array<keyof ResponseActionsClient>)(
    'should throw an un-supported error for %s',
    async (methodName) => {
      // @ts-expect-error Purposely passing in empty object for options
      await expect(crowdstrikeActionsClient[methodName]({})).rejects.toBeInstanceOf(
        ResponseActionsNotSupportedError
      );
    }
  );

  it('should error if multiple agent ids are received', async () => {
    const payload = createCrowdstrikeIsolationOptions();
    payload.endpoint_ids.push('second-host-id');

    await expect(crowdstrikeActionsClient.isolate(payload)).rejects.toMatchObject({
      message: `[body.endpoint_ids]: Multiple agents IDs not currently supported for Crowdstrike`,
      statusCode: 400,
    });
  });

  it('should save response with error in case of actionResponse containing errors', async () => {
    // mock execute of CS action to return error
    const actionResponse = {
      data: {
        errors: [{ message: 'error message' }],
      },
    };
    (connectorActionsMock.execute as jest.Mock).mockResolvedValueOnce(actionResponse);

    await crowdstrikeActionsClient.isolate(
      createCrowdstrikeIsolationOptions({ actionId: '123-345-567' })
    );
    expect(classConstructorOptions.esClient.index.mock.calls[1][0]).toEqual({
      document: {
        '@timestamp': expect.any(String),
        agent: { id: ['1-2-3'] },
        EndpointActions: {
          action_id: expect.any(String),
          completed_at: expect.any(String),
          started_at: expect.any(String),
          data: {
            command: 'isolate',
            comment: 'test comment',
            hosts: {
              '1-2-3': {
                name: 'Crowdstrike-1460',
              },
            },
          },
          input_type: 'crowdstrike',
        },
        error: {
          code: '500',
          message: 'Crowdstrike action failed: error message',
        },
        meta: undefined,
      },
      index: ENDPOINT_ACTION_RESPONSES_INDEX,
      refresh: 'wait_for',
    });
  });

  describe(`#isolate()`, () => {
    it('should send action to Crowdstrike', async () => {
      await crowdstrikeActionsClient.isolate(
        createCrowdstrikeIsolationOptions({ actionId: '123-345-456' })
      );

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: SUB_ACTION.HOST_ACTIONS,
          subActionParams: {
            actionParameters: {
              comment:
                'Action triggered from Elastic Security by user [foo] for action [isolate (action id: 123-345-456)]: test comment',
            },
            command: 'contain',
            ids: ['1-2-3'],
          },
        },
      });
    });

    it('should write action request to endpoint indexes', async () => {
      await crowdstrikeActionsClient.isolate(createCrowdstrikeIsolationOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(2);
      expect(classConstructorOptions.esClient.index.mock.calls[0][0]).toEqual({
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
                  name: 'Crowdstrike-1460',
                },
              },
            },
            expiration: expect.any(String),
            input_type: 'crowdstrike',
            type: 'INPUT_ACTION',
          },
          agent: {
            id: ['1-2-3'],
            policy: [
              {
                agentId: '1-2-3',
                agentPolicyId: expect.any(String),
                elasticAgentId: 'fleet-agent-id-123',
                integrationPolicyId: expect.any(String),
              },
            ],
          },
          originSpaceId: 'default',
          tags: [],
          meta: {
            hostName: 'Crowdstrike-1460',
          },
          user: { id: 'foo' },
        },
        index: ENDPOINT_ACTIONS_INDEX,
        refresh: 'wait_for',
      });
      expect(classConstructorOptions.esClient.index.mock.calls[1][0]).toEqual({
        document: {
          '@timestamp': expect.any(String),
          agent: { id: ['1-2-3'] },
          EndpointActions: {
            action_id: expect.any(String),
            completed_at: expect.any(String),
            started_at: expect.any(String),
            data: {
              command: 'isolate',
              comment: 'test comment',
              hosts: {
                '1-2-3': {
                  name: 'Crowdstrike-1460',
                },
                parameters: undefined,
              },
            },
            input_type: 'crowdstrike',
            error: undefined,
            meta: undefined,
          },
        },
        index: ENDPOINT_ACTION_RESPONSES_INDEX,
        refresh: 'wait_for',
      });
    });

    it('should return action details', async () => {
      await crowdstrikeActionsClient.isolate(createCrowdstrikeIsolationOptions());

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should update cases', async () => {
      await crowdstrikeActionsClient.isolate(
        createCrowdstrikeIsolationOptions({
          case_ids: ['case-1'],
        })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });

    describe('telemetry events', () => {
      it('should send `isolate` action creation telemetry event', async () => {
        await crowdstrikeActionsClient.isolate(createCrowdstrikeIsolationOptions());

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_SENT_EVENT.eventType, {
          responseActions: {
            actionId: expect.any(String),
            agentType: 'crowdstrike',
            command: 'isolate',
            isAutomated: false,
          },
        });
      });

      it('should send `isolate` action response telemetry event for successful action', async () => {
        const actionResponse = {
          data: {
            errors: [],
            action_id: '123-345-456',
            action_status: 'successful',
            command: 'isolate',
            agent_type: 'crowdstrike',
            agent_id: '1-2-3',
          },
        };
        (connectorActionsMock.execute as jest.Mock).mockResolvedValueOnce(actionResponse);
        await crowdstrikeActionsClient.isolate(
          createCrowdstrikeIsolationOptions({ actionId: '123-345-456' })
        );

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenNthCalledWith(2, ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
          responseActions: {
            actionId: '123-345-456',
            actionStatus: 'successful',
            agentType: 'crowdstrike',
            command: 'isolate',
          },
        });
      });

      it('should send `isolate` action response telemetry event for failed action', async () => {
        const actionResponse = {
          data: {
            errors: [
              {
                message: 'Failed to isolate host',
              },
            ],
            action_id: '123-456-678',
            action_status: 'failed',
            command: 'isolate',
            agent_type: 'crowdstrike',
            agent_id: '1-2-3',
          },
        };
        (connectorActionsMock.execute as jest.Mock).mockResolvedValueOnce(actionResponse);

        await crowdstrikeActionsClient.isolate(
          createCrowdstrikeIsolationOptions({ actionId: '123-456-678' })
        );

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenNthCalledWith(2, ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
          responseActions: {
            actionId: '123-456-678',
            actionStatus: 'failed',
            agentType: 'crowdstrike',
            command: 'isolate',
          },
        });
      });
    });
  });

  describe('#release()', () => {
    it('should send action to Crowdstrike', async () => {
      await crowdstrikeActionsClient.release(
        createCrowdstrikeIsolationOptions({ actionId: '123-345-456' })
      );

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: SUB_ACTION.HOST_ACTIONS,
          subActionParams: {
            command: 'lift_containment',
            ids: ['1-2-3'],
            comment:
              'Action triggered from Elastic Security by user [foo] for action [unisolate (action id: 123-345-456)]: test comment',
          },
        },
      });
    });

    it('should write action request to endpoint indexes', async () => {
      await crowdstrikeActionsClient.release(createCrowdstrikeIsolationOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(2);
      expect(classConstructorOptions.esClient.index.mock.calls[0][0]).toEqual({
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
                  name: 'Crowdstrike-1460',
                },
              },
            },
            expiration: expect.any(String),
            input_type: 'crowdstrike',
            type: 'INPUT_ACTION',
          },
          agent: {
            id: ['1-2-3'],
            policy: [
              {
                agentId: '1-2-3',
                agentPolicyId: expect.any(String),
                elasticAgentId: 'fleet-agent-id-123',
                integrationPolicyId: expect.any(String),
              },
            ],
          },
          originSpaceId: 'default',
          tags: [],
          meta: {
            hostName: 'Crowdstrike-1460',
          },
          user: { id: 'foo' },
        },
        index: ENDPOINT_ACTIONS_INDEX,
        refresh: 'wait_for',
      });
      expect(classConstructorOptions.esClient.index.mock.calls[1][0]).toEqual({
        document: {
          '@timestamp': expect.any(String),
          agent: { id: ['1-2-3'] },
          EndpointActions: {
            action_id: expect.any(String),
            completed_at: expect.any(String),
            started_at: expect.any(String),
            data: {
              command: 'unisolate',
              comment: 'test comment',
              hosts: {
                '1-2-3': {
                  name: 'Crowdstrike-1460',
                },
              },
              parameters: undefined,
            },
            input_type: 'crowdstrike',
          },
          error: undefined,
          meta: undefined,
        },
        index: ENDPOINT_ACTION_RESPONSES_INDEX,
        refresh: 'wait_for',
      });
    });

    it('should return action details', async () => {
      await crowdstrikeActionsClient.release(createCrowdstrikeIsolationOptions());

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should update cases', async () => {
      await crowdstrikeActionsClient.release(
        createCrowdstrikeIsolationOptions({
          case_ids: ['case-1'],
        })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });

    describe('telemetry events', () => {
      it('should send `release` action creation telemetry event', async () => {
        await crowdstrikeActionsClient.release(createCrowdstrikeIsolationOptions());

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_SENT_EVENT.eventType, {
          responseActions: {
            actionId: expect.any(String),
            agentType: 'crowdstrike',
            command: 'unisolate',
            isAutomated: false,
          },
        });
      });

      it('should send `release` action response telemetry event for successful action', async () => {
        const actionResponse = {
          data: {
            errors: [],
            action_id: '123-345-456',
            action_status: 'successful',
            command: 'unisolate',
            agent_type: 'crowdstrike',
            agent_id: '1-2-3',
          },
        };
        (connectorActionsMock.execute as jest.Mock).mockResolvedValueOnce(actionResponse);
        await crowdstrikeActionsClient.release(
          createCrowdstrikeIsolationOptions({ actionId: '123-345-456' })
        );

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenNthCalledWith(2, ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
          responseActions: {
            actionId: '123-345-456',
            actionStatus: 'successful',
            agentType: 'crowdstrike',
            command: 'unisolate',
          },
        });
      });

      it('should send `release` action response telemetry event for failed action', async () => {
        const actionResponse = {
          data: {
            errors: [
              {
                message: 'Failed to release host',
              },
            ],
            action_id: '123-456-678',
            action_status: 'failed',
            command: 'unisolate',
            agent_type: 'crowdstrike',
            agent_id: '1-2-3',
          },
        };
        (connectorActionsMock.execute as jest.Mock).mockResolvedValueOnce(actionResponse);

        await crowdstrikeActionsClient.release(
          createCrowdstrikeIsolationOptions({ actionId: '123-456-678' })
        );

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenNthCalledWith(2, ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
          responseActions: {
            actionId: '123-456-678',
            actionStatus: 'failed',
            agentType: 'crowdstrike',
            command: 'unisolate',
          },
        });
      });
    });
  });

  describe('#runscript()', () => {
    it('should send action to Crowdstrike', async () => {
      await crowdstrikeActionsClient.runscript(
        createCrowdstrikeRunscrtiptOptions({
          actionId: '123-456-789',
          endpoint_ids: ['1-2-3'],
          comment: 'test runscript comment',
          parameters: {
            raw: 'echo "Hello World"',
          },
        })
      );

      expect(connectorActionsMock.execute as jest.Mock).toHaveBeenCalledWith({
        params: {
          subAction: SUB_ACTION.EXECUTE_ADMIN_RTR,
          subActionParams: {
            command: 'runscript --Raw=```echo "Hello World"```',
            endpoint_ids: ['1-2-3'],
            actionParameters: {
              comment:
                'Action triggered from Elastic Security by user [foo] for action [runscript (action id: 123-456-789)]: test runscript comment',
            },
          },
        },
      });
    });

    it('should write action request to endpoint indexes', async () => {
      await crowdstrikeActionsClient.runscript(responseActionsClientMock.createRunScriptOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledTimes(2);
      expect(classConstructorOptions.esClient.index.mock.calls[0][0]).toEqual({
        document: {
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: expect.any(String),
            data: {
              command: 'runscript',
              comment: 'test comment',
              parameters: { raw: 'ls' },
              hosts: {
                '1-2-3': {
                  name: 'Crowdstrike-1460',
                },
              },
            },
            expiration: expect.any(String),
            input_type: 'crowdstrike',
            type: 'INPUT_ACTION',
          },
          agent: {
            id: ['1-2-3'],
            policy: [
              {
                agentId: '1-2-3',
                agentPolicyId: expect.any(String),
                elasticAgentId: 'fleet-agent-id-123',
                integrationPolicyId: expect.any(String),
              },
            ],
          },
          originSpaceId: 'default',
          tags: [],
          meta: {
            hostName: 'Crowdstrike-1460',
          },
          user: { id: 'foo' },
        },
        index: ENDPOINT_ACTIONS_INDEX,
        refresh: 'wait_for',
      });
      expect(classConstructorOptions.esClient.index.mock.calls[1][0]).toEqual({
        document: {
          '@timestamp': expect.any(String),
          agent: { id: ['1-2-3'] },
          EndpointActions: {
            action_id: expect.any(String),
            completed_at: expect.any(String),
            started_at: expect.any(String),
            data: {
              command: 'runscript',
              comment: 'test comment',
              hosts: {
                '1-2-3': {
                  name: 'Crowdstrike-1460',
                },
              },
              output: {
                content: {
                  code: '200',
                  stderr: '',
                  stdout: '',
                },
                type: 'text',
              },
              parameters: { raw: 'ls' },
            },
            input_type: 'crowdstrike',
          },
          error: undefined,
          meta: undefined,
        },
        index: ENDPOINT_ACTION_RESPONSES_INDEX,
        refresh: 'wait_for',
      });
    });

    it('should return action details', async () => {
      await crowdstrikeActionsClient.runscript(responseActionsClientMock.createRunScriptOptions());

      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should update cases', async () => {
      await crowdstrikeActionsClient.runscript(
        responseActionsClientMock.createRunScriptOptions({
          case_ids: ['case-1'],
        })
      );

      expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });

    describe('telemetry events', () => {
      it('should send `runscript` action creation telemetry event', async () => {
        await crowdstrikeActionsClient.runscript(
          responseActionsClientMock.createRunScriptOptions()
        );

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_SENT_EVENT.eventType, {
          responseActions: {
            actionId: expect.any(String),
            agentType: 'crowdstrike',
            command: 'runscript',
            isAutomated: false,
          },
        });
      });

      it('should send `runscript` action response telemetry event for successful action', async () => {
        const actionResponse = {
          actionId: '123-abc-678',
          data: undefined,
          status: 'ok',
        };
        (connectorActionsMock.execute as jest.Mock).mockResolvedValueOnce(actionResponse);

        await crowdstrikeActionsClient.runscript(
          createCrowdstrikeRunscrtiptOptions({
            actionId: '123-abc-678',
            comment: 'test runscript comment',
            parameters: {
              raw: 'echo "Hello World"',
            },
          })
        );

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenNthCalledWith(2, ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
          responseActions: {
            actionId: '123-abc-678',
            actionStatus: 'successful',
            agentType: 'crowdstrike',
            command: 'runscript',
          },
        });
      });

      it('should send `runscript` action response telemetry event for failed action', async () => {
        const actionResponse = {
          actionId: '456-pqr-789',
          status: 'ok',
          data: {
            combined: {
              resources: {
                '1-2-3': {
                  stdout: '',
                  stderr: '',
                  errors: [
                    {
                      code: '500',
                      message: 'Failed to run script on host',
                    },
                  ],
                },
              },
            },
          },
        };
        (connectorActionsMock.execute as jest.Mock).mockResolvedValueOnce(actionResponse);

        await crowdstrikeActionsClient.runscript(
          createCrowdstrikeRunscrtiptOptions({
            actionId: '456-pqr-789',
            endpoint_ids: ['1-2-3'],
            parameters: {
              raw: 'echo "Hello World"',
            },
          })
        );

        expect(
          classConstructorOptions.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenNthCalledWith(2, ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
          responseActions: {
            actionId: '456-pqr-789',
            actionStatus: 'failed',
            agentType: 'crowdstrike',
            command: 'runscript',
          },
        });
      });
    });
  });

  describe('and space awareness is enabled', () => {
    beforeEach(() => {
      // @ts-expect-error write to readonly property
      classConstructorOptions.endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled =
        true;
      getActionDetailsByIdMock.mockResolvedValue({});
    });

    afterEach(() => {
      getActionDetailsByIdMock.mockReset();
    });

    it('should write action request doc with policy info', async () => {
      await crowdstrikeActionsClient.release(createCrowdstrikeIsolationOptions());

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            agent: {
              id: ['1-2-3'],
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: '6f12b025-fcb0-4db4-99e5-4927e3502bb8',
                  elasticAgentId: 'fleet-agent-id-123',
                  integrationPolicyId: '90d62689-f72d-4a05-b5e3-500cad0dc366',
                },
              ],
            },
          }),
        }),
        expect.anything()
      );
    });

    it('should search for Crwodstrike agent ID using index names', async () => {
      await expect(
        crowdstrikeActionsClient.isolate(createCrowdstrikeIsolationOptions())
      ).resolves.toBeTruthy();

      expect(classConstructorOptions.esClient.search).toHaveBeenCalledWith({
        _source: false,
        collapse: {
          field: 'device.id',
          inner_hits: {
            name: 'most_recent',
            size: 1,
            _source: ['agent', 'device.id', 'event.created'],
            sort: [{ 'event.created': 'desc' }],
          },
        },
        ignore_unavailable: true,
        // Important: should NOT contain a index pattern below
        index: [
          'logs-crowdstrike.alert-default',
          'logs-crowdstrike.falcon-default',
          'logs-crowdstrike.fdr-default',
          'logs-crowdstrike.host-default',
          'logs-crowdstrike.vulnerability-default',
        ],
        query: {
          bool: { filter: [{ terms: { 'device.id': ['1-2-3'] } }] },
        },
      });
    });

    it('should error if unable to find agent id in crowdstrike ingested data', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient,
        index: CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION.crowdstrike[0],
        response: BaseDataGenerator.toEsSearchResponse([]),
      });

      await expect(
        crowdstrikeActionsClient.isolate(createCrowdstrikeIsolationOptions())
      ).rejects.toThrow('Unable to find elastic agent IDs for Crowdstrike agent ids: [1-2-3]');
    });

    it.each(responseActionsClientMock.getClientSupportedResponseActionMethodNames('crowdstrike'))(
      'should error if %s is called with invalid agent ids',
      async (method) => {
        (
          classConstructorOptions.endpointService.getInternalFleetServices().agent
            .getByIds as jest.Mock
        ).mockImplementation(async () => {
          throw new AgentNotFoundError('Agent some-id not found');
        });
        const options = responseActionsClientMock.getOptionsForResponseActionMethod(method);

        await expect(
          // @ts-expect-error
          crowdstrikeActionsClient[method](options)
        ).rejects.toThrow('Agent some-id not found');

        expect(classConstructorOptions.connectorActions.execute).not.toHaveBeenCalled();
      }
    );
  });
});
