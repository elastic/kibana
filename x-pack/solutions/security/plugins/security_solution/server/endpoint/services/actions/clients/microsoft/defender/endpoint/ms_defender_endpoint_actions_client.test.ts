/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MicrosoftDefenderEndpointActionsClient } from './ms_defender_endpoint_actions_client';
import type { ProcessPendingActionsMethodOptions, ResponseActionsClient } from '../../../../..';
import { getActionDetailsById as _getActionDetailsById } from '../../../../action_details_by_id';
import type { MicrosoftDefenderActionsClientOptionsMock } from './mocks';
import { microsoftDefenderMock } from './mocks';
import { ResponseActionsNotSupportedError } from '../../../errors';
import type { NormalizedExternalConnectorClientMock } from '../../../mocks';
import { responseActionsClientMock } from '../../../mocks';
import type {
  LogsEndpointActionResponse,
  MicrosoftDefenderEndpointActionRequestCommonMeta,
} from '../../../../../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { applyEsClientSearchMock } from '../../../../../../mocks/utils.mock';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../../../../common/endpoint/constants';
import type {
  MicrosoftDefenderEndpointGetActionsResponse,
  MicrosoftDefenderEndpointMachineAction,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import { MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION } from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/constants';
import { MICROSOFT_DEFENDER_ENDPOINT_LOG_INDEX_PATTERN } from '../../../../../../../../common/endpoint/service/response_actions/microsoft_defender';
import { MicrosoftDefenderDataGenerator } from '../../../../../../../../common/endpoint/data_generators/microsoft_defender_data_generator';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';

jest.mock('../../../../action_details_by_id', () => {
  const originalMod = jest.requireActual('../../../../action_details_by_id');

  return {
    ...originalMod,
    getActionDetailsById: jest.fn(originalMod.getActionDetailsById),
  };
});

const getActionDetailsByIdMock = _getActionDetailsById as jest.Mock;

describe('MS Defender response actions client', () => {
  let clientConstructorOptionsMock: MicrosoftDefenderActionsClientOptionsMock;
  let connectorActionsMock: NormalizedExternalConnectorClientMock;
  let msClientMock: ResponseActionsClient;

  beforeEach(() => {
    clientConstructorOptionsMock = microsoftDefenderMock.createConstructorOptions();
    connectorActionsMock =
      clientConstructorOptionsMock.connectorActions as NormalizedExternalConnectorClientMock;
    msClientMock = new MicrosoftDefenderEndpointActionsClient(clientConstructorOptionsMock);
  });

  const supportedResponseActionClassMethods: Record<keyof ResponseActionsClient, boolean> = {
    upload: false,
    scan: false,
    execute: false,
    getFile: false,
    getFileDownload: false,
    getFileInfo: false,
    killProcess: false,
    runningProcesses: false,
    runscript: false,
    suspendProcess: false,
    isolate: true,
    release: true,
    processPendingActions: true,
    getCustomScripts: false,
  };

  it.each(
    Object.entries(supportedResponseActionClassMethods).reduce((acc, [key, value]) => {
      if (!value) {
        acc.push(key as keyof ResponseActionsClient);
      }
      return acc;
    }, [] as Array<keyof ResponseActionsClient>)
  )('should throw error for %s', async (methodName) => {
    // @ts-expect-error Purposely passing in empty object for options
    await expect(msClientMock[methodName]({})).rejects.toBeInstanceOf(
      ResponseActionsNotSupportedError
    );
  });

  it('should error if multiple agent ids are received', async () => {
    await expect(msClientMock.isolate({ endpoint_ids: ['a', 'b'] })).rejects.toMatchObject({
      message: `[body.endpoint_ids]: Multiple agents IDs not currently supported for Microsoft Defender for Endpoint`,
      statusCode: 400,
    });
  });

  it('should update cases', async () => {
    await msClientMock.isolate(
      responseActionsClientMock.createIsolateOptions({ case_ids: ['case-1'] })
    );

    expect(clientConstructorOptionsMock.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
  });

  describe.each<Extract<keyof ResponseActionsClient, 'isolate' | 'release'>>([
    'isolate',
    'release',
  ])('#%s()', (responseActionMethod) => {
    it(`should send ${responseActionMethod} request to Microsoft with expected comment`, async () => {
      await msClientMock[responseActionMethod](responseActionsClientMock.createIsolateOptions());

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: responseActionMethod === 'isolate' ? 'isolateHost' : 'releaseHost',
          subActionParams: {
            comment: expect.stringMatching(
              /Action triggered from Elastic Security by user \[foo\] for action \[.* \(action id: .*\)\]: test comment/
            ),
            id: '1-2-3',
          },
        },
      });
    });

    it('should write action request doc. to endpoint index', async () => {
      await msClientMock[responseActionMethod](responseActionsClientMock.createIsolateOptions());

      expect(clientConstructorOptionsMock.esClient.index).toHaveBeenCalledWith(
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: responseActionMethod === 'isolate' ? 'isolate' : 'unisolate',
                comment: 'test comment',
                hosts: {
                  '1-2-3': {
                    name: 'mymachine1.contoso.com',
                  },
                },
                parameters: undefined,
              },
              expiration: expect.any(String),
              input_type: 'microsoft_defender_endpoint',
              type: 'INPUT_ACTION',
            },
            agent: {
              id: ['1-2-3'],
            },
            meta: {
              machineActionId: '5382f7ea-7557-4ab7-9782-d50480024a4e',
            },
            user: {
              id: 'foo',
            },
          },
          index: '.logs-endpoint.actions-default',
          refresh: 'wait_for',
        },
        { meta: true }
      );
    });

    it('should return action details', async () => {
      await expect(
        msClientMock[responseActionMethod](responseActionsClientMock.createIsolateOptions())
      ).resolves.toEqual(
        expect.objectContaining({
          id: expect.any(String),
          command: expect.any(String),
          isCompleted: false,
        })
      );
      expect(getActionDetailsByIdMock).toHaveBeenCalled();
    });

    it('should update cases', async () => {
      await msClientMock[responseActionMethod](
        responseActionsClientMock.createIsolateOptions({
          case_ids: ['case-1'],
        })
      );

      expect(clientConstructorOptionsMock.casesClient?.attachments.bulkCreate).toHaveBeenCalled();
    });
  });

  describe('#processPendingActions()', () => {
    let abortController: AbortController;
    let processPendingActionsOptions: ProcessPendingActionsMethodOptions;

    beforeEach(() => {
      abortController = new AbortController();
      processPendingActionsOptions = {
        abortSignal: abortController.signal,
        addToQueue: jest.fn(),
      };
    });

    describe('for Isolate and Release', () => {
      let msMachineActionsApiResponse: MicrosoftDefenderEndpointGetActionsResponse;

      beforeEach(() => {
        const generator = new EndpointActionGenerator('seed');

        const actionRequestsSearchResponse = generator.toEsSearchResponse([
          generator.generateActionEsHit<
            undefined,
            {},
            MicrosoftDefenderEndpointActionRequestCommonMeta
          >({
            agent: { id: 'agent-uuid-1' },
            EndpointActions: {
              data: { command: 'isolate' },
              input_type: 'microsoft_defender_endpoint',
            },
            meta: { machineActionId: '5382f7ea-7557-4ab7-9782-d50480024a4e' },
          }),
        ]);

        applyEsClientSearchMock({
          esClientMock: clientConstructorOptionsMock.esClient,
          index: ENDPOINT_ACTIONS_INDEX,
          response: actionRequestsSearchResponse,
          pitUsage: true,
        });

        msMachineActionsApiResponse = microsoftDefenderMock.createGetActionsApiResponse();
        responseActionsClientMock.setConnectorActionsClientExecuteResponse(
          connectorActionsMock,
          MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS,
          msMachineActionsApiResponse
        );
      });

      it('should generate action response docs for completed actions', async () => {
        await msClientMock.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith({
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
            completed_at: expect.any(String),
            data: { command: 'isolate' },
            input_type: 'microsoft_defender_endpoint',
            started_at: expect.any(String),
          },
          agent: { id: 'agent-uuid-1' },
          error: undefined,
          meta: undefined,
        });
      });

      it.each<MicrosoftDefenderEndpointMachineAction['status']>(['Pending', 'InProgress'])(
        'should NOT generate action responses if action in MS Defender as a status of %s',
        async (machineActionStatus) => {
          msMachineActionsApiResponse.value[0].status = machineActionStatus;
          await msClientMock.processPendingActions(processPendingActionsOptions);

          expect(processPendingActionsOptions.addToQueue).not.toHaveBeenCalled();
        }
      );

      it.each`
        msStatusValue  | responseState
        ${'Failed'}    | ${'failure'}
        ${'TimeOut'}   | ${'failure'}
        ${'Cancelled'} | ${'failure'}
        ${'Succeeded'} | ${'success'}
      `(
        'should generate $responseState action response if MS machine action status is $msStatusValue',
        async ({ msStatusValue, responseState }) => {
          msMachineActionsApiResponse.value[0].status = msStatusValue;
          const expectedResult: LogsEndpointActionResponse = {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
              completed_at: expect.any(String),
              data: { command: 'isolate' },
              input_type: 'microsoft_defender_endpoint',
              started_at: expect.any(String),
            },
            agent: { id: 'agent-uuid-1' },
            error: undefined,
            meta: undefined,
          };
          if (responseState === 'failure') {
            expectedResult.error = {
              message: expect.any(String),
            };
          }
          await msClientMock.processPendingActions(processPendingActionsOptions);

          expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith(expectedResult);
        }
      );
    });
  });

  describe('and space awareness is enabled', () => {
    beforeEach(() => {
      // @ts-expect-error assign to readonly property
      clientConstructorOptionsMock.endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled =
        true;

      getActionDetailsByIdMock.mockResolvedValue({});
    });

    afterEach(() => {
      getActionDetailsByIdMock.mockReset();
    });

    it('should write action request doc with agent policy info when space awareness is enabled', async () => {
      await msClientMock.isolate(responseActionsClientMock.createIsolateOptions());

      expect(clientConstructorOptionsMock.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            agent: {
              id: ['1-2-3'],
              policy: [
                {
                  agentId: '1-2-3',
                  agentPolicyId: '6f12b025-fcb0-4db4-99e5-4927e3502bb8',
                  elasticAgentId: '1-2-3',
                  integrationPolicyId: '90d62689-f72d-4a05-b5e3-500cad0dc366',
                },
              ],
            },
          }),
        }),
        expect.anything()
      );
    });

    it('should search for MS defender agent using correct index names', async () => {
      await expect(
        msClientMock.isolate(responseActionsClientMock.createIsolateOptions())
      ).resolves.toBeTruthy();

      expect(clientConstructorOptionsMock.esClient.search).toHaveBeenCalledWith({
        _source: false,
        collapse: {
          field: 'cloud.instance.id',
          inner_hits: {
            _source: ['agent', 'cloud.instance.id', 'event.created'],
            name: 'most_recent',
            size: 1,
            sort: [{ 'event.created': 'desc' }],
          },
        },
        ignore_unavailable: true,
        index: ['logs-microsoft_defender_endpoint.log-default'], // << Important: should NOT contain a index pattern
        query: {
          bool: { filter: [{ terms: { 'cloud.instance.id': ['1-2-3'] } }] },
        },
      });
    });

    it('should error is unable to find MS agent in ingested data', async () => {
      applyEsClientSearchMock({
        esClientMock: clientConstructorOptionsMock.esClient,
        index: MICROSOFT_DEFENDER_ENDPOINT_LOG_INDEX_PATTERN,
        response: MicrosoftDefenderDataGenerator.toEsSearchResponse([]),
      });

      await expect(
        msClientMock.isolate(responseActionsClientMock.createIsolateOptions())
      ).rejects.toThrow(
        'Unable to find Elastic agent IDs for Microsoft Defender agent ids: [1-2-3]'
      );
    });

    it.each(
      responseActionsClientMock.getClientSupportedResponseActionMethodNames(
        'microsoft_defender_endpoint'
      )
    )(
      'should error when %s is called with agents not valid for active space',
      async (methodName) => {
        (
          clientConstructorOptionsMock.endpointService.getInternalFleetServices().agent
            .getByIds as jest.Mock
        ).mockImplementation(async () => {
          throw new AgentNotFoundError('Agent some-id not found');
        });
        const options = responseActionsClientMock.getOptionsForResponseActionMethod(methodName);

        // @ts-expect-error `options` type is too broad because we're getting it from a helper
        await expect(msClientMock[methodName](options)).rejects.toThrow('Agent some-id not found');

        expect(clientConstructorOptionsMock.connectorActions.execute).not.toHaveBeenCalled();
      }
    );
  });
});
