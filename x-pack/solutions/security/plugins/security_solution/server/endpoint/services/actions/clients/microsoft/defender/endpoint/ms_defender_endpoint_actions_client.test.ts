/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
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
import {
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
} from '../../../../../../../../common/endpoint/constants';
import type {
  MicrosoftDefenderEndpointGetActionsResponse,
  MicrosoftDefenderEndpointMachineAction,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import { MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION } from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/constants';
import { MICROSOFT_DEFENDER_ENDPOINT_LOG_INDEX_PATTERN } from '../../../../../../../../common/endpoint/service/response_actions/microsoft_defender';
import { MicrosoftDefenderDataGenerator } from '../../../../../../../../common/endpoint/data_generators/microsoft_defender_data_generator';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import {
  ENDPOINT_RESPONSE_ACTION_SENT_EVENT,
  ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT,
} from '../../../../../../../lib/telemetry/event_based/events';

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

    getActionDetailsByIdMock.mockImplementation(async (_, __, id: string) => {
      return new EndpointActionGenerator('seed').generateActionDetails({
        id,
      });
    });

    const fleetServices = clientConstructorOptionsMock.endpointService.getInternalFleetServices();
    const ensureInCurrentSpaceMock = jest.spyOn(fleetServices, 'ensureInCurrentSpace');

    ensureInCurrentSpaceMock.mockResolvedValue(undefined);

    const getInternalFleetServicesMock = jest.spyOn(
      clientConstructorOptionsMock.endpointService,
      'getInternalFleetServices'
    );
    getInternalFleetServicesMock.mockReturnValue(fleetServices);
  });

  const supportedResponseActionClassMethods: Record<keyof ResponseActionsClient, boolean> = {
    upload: false,
    scan: false,
    execute: false,
    getFile: false,
    getFileDownload: true,
    getFileInfo: true,
    killProcess: false,
    runningProcesses: false,
    runscript: true,
    suspendProcess: false,
    isolate: true,
    release: true,
    processPendingActions: true,
    getCustomScripts: true,
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
          isCompleted: expect.any(Boolean),
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

    describe('telemetry events', () => {
      it(`should send ${responseActionMethod} action creation telemetry event`, async () => {
        await msClientMock[responseActionMethod](responseActionsClientMock.createIsolateOptions());
        expect(
          clientConstructorOptionsMock.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_SENT_EVENT.eventType, {
          responseActions: {
            actionId: expect.any(String),
            agentType: 'microsoft_defender_endpoint',
            command: responseActionMethod === 'release' ? 'unisolate' : responseActionMethod,
            isAutomated: false,
          },
        });
      });
    });
  });

  describe('#runscript()', () => {
    beforeEach(() => {
      // @ts-expect-error assign to readonly property
      clientConstructorOptionsMock.endpointService.experimentalFeatures.microsoftDefenderEndpointRunScriptEnabled =
        true;
    });
    it('should send runscript request to Microsoft with expected parameters', async () => {
      await msClientMock.runscript(
        responseActionsClientMock.createRunScriptOptions({
          parameters: { scriptName: 'test-script.ps1', args: 'arg1 arg2' },
        })
      );

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RUN_SCRIPT,
          subActionParams: {
            comment: expect.stringMatching(
              /Action triggered from Elastic Security by user \[foo\] for action \[.* \(action id: .*\)\]: test comment/
            ),
            id: '1-2-3',
            parameters: {
              scriptName: 'test-script.ps1',
              args: 'arg1 arg2',
            },
          },
        },
      });
    });

    it('should write action request doc. to endpoint index', async () => {
      await msClientMock.runscript(
        microsoftDefenderMock.createRunScriptOptions({
          parameters: { scriptName: 'test-script.ps1' },
        })
      );

      expect(clientConstructorOptionsMock.esClient.index).toHaveBeenCalledWith(
        {
          document: {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: expect.any(String),
              data: {
                command: 'runscript',
                comment: 'test comment',
                hosts: {
                  '1-2-3': {
                    name: 'mymachine1.contoso.com',
                  },
                },
                parameters: {
                  args: 'test-args',
                  scriptName: 'test-script.ps1',
                },
              },
              expiration: expect.any(String),
              input_type: 'microsoft_defender_endpoint',
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
      getActionDetailsByIdMock.mockResolvedValue({
        id: expect.any(String),
        command: 'runscript',
        agentType: 'microsoft_defender_endpoint',
        isCompleted: false,
      });

      await expect(
        msClientMock.runscript(
          responseActionsClientMock.createRunScriptOptions({
            parameters: { scriptName: 'test-script.ps1' },
          })
        )
      ).resolves.toEqual(
        expect.objectContaining({
          command: 'runscript',
          id: expect.any(String),
        })
      );
    });

    it('should handle Microsoft Defender API errors gracefully', async () => {
      const apiError = new Error('Microsoft Defender API error');
      connectorActionsMock.execute.mockRejectedValueOnce(apiError);

      await expect(
        msClientMock.runscript(
          responseActionsClientMock.createRunScriptOptions({
            parameters: { scriptName: 'test-script.ps1' },
          })
        )
      ).rejects.toThrow('Microsoft Defender API error');
    });

    it('should handle missing machine action ID in response', async () => {
      responseActionsClientMock.setConnectorActionsClientExecuteResponse(
        connectorActionsMock,
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RUN_SCRIPT,
        responseActionsClientMock.createConnectorActionExecuteResponse({
          data: {
            /* missing id */
          },
        })
      );

      await expect(
        msClientMock.runscript(
          responseActionsClientMock.createRunScriptOptions({
            parameters: { scriptName: 'test-script.ps1' },
          })
        )
      ).rejects.toThrow(
        'Run Script request was sent to Microsoft Defender, but Machine Action Id was not provided!'
      );
    });

    it('should include args parameter when provided', async () => {
      await msClientMock.runscript(
        responseActionsClientMock.createRunScriptOptions({
          parameters: { scriptName: 'test-script.ps1', args: 'param1 param2' },
        })
      );

      expect(connectorActionsMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subActionParams: expect.objectContaining({
              parameters: {
                scriptName: 'test-script.ps1',
                args: 'param1 param2',
              },
            }),
          }),
        })
      );
    });

    it('should omit args parameter when not provided', async () => {
      await msClientMock.runscript(
        responseActionsClientMock.createRunScriptOptions({
          parameters: { scriptName: 'test-script.ps1' },
        })
      );

      expect(connectorActionsMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subActionParams: expect.objectContaining({
              parameters: {
                scriptName: 'test-script.ps1',
                args: undefined,
              },
            }),
          }),
        })
      );
    });

    describe('telemetry event', () => {
      it('should send runscript action creation telemetry event', async () => {
        await msClientMock.runscript(
          responseActionsClientMock.createRunScriptOptions({
            parameters: { scriptName: 'test-script.ps1', args: 'arg1 arg2' },
          })
        );
        expect(
          clientConstructorOptionsMock.endpointService.getTelemetryService().reportEvent
        ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_SENT_EVENT.eventType, {
          responseActions: {
            actionId: expect.any(String),
            agentType: 'microsoft_defender_endpoint',
            command: 'runscript',
            isAutomated: false,
          },
        });
      });
    });
  });

  describe('#getFileInfo()', () => {
    beforeEach(() => {
      // @ts-expect-error assign to readonly property
      clientConstructorOptionsMock.endpointService.experimentalFeatures.microsoftDefenderEndpointRunScriptEnabled =
        true;

      const generator = new EndpointActionGenerator('seed');
      const actionRequestsSearchResponse = generator.toEsSearchResponse([
        generator.generateActionEsHit<
          undefined,
          {},
          MicrosoftDefenderEndpointActionRequestCommonMeta
        >({
          agent: { id: '123' },
          EndpointActions: {
            data: { command: 'runscript', comment: 'test comment' },
            input_type: 'microsoft_defender_endpoint',
          },
        }),
      ]);

      applyEsClientSearchMock({
        esClientMock: clientConstructorOptionsMock.esClient,
        index: ENDPOINT_ACTIONS_INDEX,
        response: actionRequestsSearchResponse,
      });
    });

    it('should throw error if feature flag is disabled', async () => {
      // @ts-expect-error assign to readonly property
      clientConstructorOptionsMock.endpointService.experimentalFeatures.microsoftDefenderEndpointRunScriptEnabled =
        false;

      await expect(msClientMock.getFileInfo('abc', '123')).rejects.toThrow(
        'File downloads are not supported for microsoft_defender_endpoint agent type. Feature disabled'
      );
    });

    it('should return file info with status AWAITING_UPLOAD when no response document exists', async () => {
      const generator = new EndpointActionGenerator('seed');
      applyEsClientSearchMock({
        esClientMock: clientConstructorOptionsMock.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: generator.toEsSearchResponse([]),
      });

      await expect(msClientMock.getFileInfo('abc', '123')).resolves.toEqual({
        actionId: 'abc',
        agentId: '123',
        id: '123',
        agentType: 'microsoft_defender_endpoint',
        status: 'AWAITING_UPLOAD',
        created: '',
        name: '',
        size: 0,
        mimeType: '',
      });
    });

    it('should return file info with status READY when response document exists', async () => {
      const generator = new EndpointActionGenerator('seed');
      const responseEsHit = generator.generateResponseEsHit({
        agent: { id: '123' },
        EndpointActions: {
          data: { command: 'runscript' },
          input_type: 'microsoft_defender_endpoint',
        },
        meta: {
          createdAt: '2024-05-09T10:30:00Z',
          filename: 'script_output.txt',
          machineActionId: 'machine-action-123',
        },
      });

      applyEsClientSearchMock({
        esClientMock: clientConstructorOptionsMock.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: generator.toEsSearchResponse([responseEsHit]),
      });

      await expect(msClientMock.getFileInfo('abc', '123')).resolves.toEqual({
        actionId: 'abc',
        agentId: '123',
        id: '123',
        agentType: 'microsoft_defender_endpoint',
        status: 'READY',
        created: '2024-05-09T10:30:00Z',
        name: 'script_output.txt',
        size: 0,
        mimeType: 'application/octet-stream',
      });
    });

    it('should throw error for unsupported command types', async () => {
      const generator = new EndpointActionGenerator('seed');
      const actionRequestsSearchResponse = generator.toEsSearchResponse([
        generator.generateActionEsHit<
          undefined,
          {},
          MicrosoftDefenderEndpointActionRequestCommonMeta
        >({
          agent: { id: '123' },
          EndpointActions: {
            data: { command: 'isolate', comment: 'test comment' },
            input_type: 'microsoft_defender_endpoint',
          },
        }),
      ]);

      applyEsClientSearchMock({
        esClientMock: clientConstructorOptionsMock.esClient,
        index: ENDPOINT_ACTIONS_INDEX,
        response: actionRequestsSearchResponse,
      });

      const responseEsHit = generator.generateResponseEsHit({
        agent: { id: '123' },
        EndpointActions: {
          data: { command: 'isolate' },
          input_type: 'microsoft_defender_endpoint',
        },
      });

      applyEsClientSearchMock({
        esClientMock: clientConstructorOptionsMock.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: generator.toEsSearchResponse([responseEsHit]),
      });

      await expect(msClientMock.getFileInfo('abc', '123')).rejects.toThrow(
        'isolate does not support file downloads'
      );
    });

    it('should handle ES client errors properly', async () => {
      // Mock the ES client to throw an error
      (clientConstructorOptionsMock.esClient.search as unknown as jest.Mock).mockRejectedValueOnce(
        new Error('ES client error')
      );

      // The method should catch the error and return AWAITING_UPLOAD status only for ResponseActionAgentResponseEsDocNotFound
      // Other errors should be propagated
      await expect(msClientMock.getFileInfo('abc', '123')).rejects.toThrow('ES client error');
    });
  });

  describe('#getFileDownload()', () => {
    beforeEach(() => {
      // @ts-expect-error assign to readonly property
      clientConstructorOptionsMock.endpointService.experimentalFeatures.microsoftDefenderEndpointRunScriptEnabled =
        true;

      const generator = new EndpointActionGenerator('seed');
      const actionRequestsSearchResponse = generator.toEsSearchResponse([
        generator.generateActionEsHit<
          undefined,
          {},
          MicrosoftDefenderEndpointActionRequestCommonMeta
        >({
          agent: { id: '123' },
          EndpointActions: {
            data: { command: 'runscript', comment: 'test comment' },
            input_type: 'microsoft_defender_endpoint',
          },
        }),
      ]);

      applyEsClientSearchMock({
        esClientMock: clientConstructorOptionsMock.esClient,
        index: ENDPOINT_ACTIONS_INDEX,
        response: actionRequestsSearchResponse,
      });

      const responseEsHit = generator.generateResponseEsHit({
        agent: { id: '123' },
        EndpointActions: {
          data: { command: 'runscript' },
          input_type: 'microsoft_defender_endpoint',
        },
        meta: {
          createdAt: '2024-05-09T10:30:00Z',
          filename: 'script_output.txt',
          machineActionId: 'machine-action-123',
        },
      });

      applyEsClientSearchMock({
        esClientMock: clientConstructorOptionsMock.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: generator.toEsSearchResponse([responseEsHit]),
      });
    });

    it('should throw error if feature flag is disabled', async () => {
      // @ts-expect-error assign to readonly property
      clientConstructorOptionsMock.endpointService.experimentalFeatures.microsoftDefenderEndpointRunScriptEnabled =
        false;

      await expect(msClientMock.getFileDownload('abc', '123')).rejects.toThrow(
        'File downloads are not supported for microsoft_defender_endpoint agent type. Feature disabled'
      );
    });

    it('should successfully download file and verify API call to Microsoft Defender GET_ACTION_RESULTS', async () => {
      const mockStream = new Readable({
        read() {
          this.push('test file content');
          this.push(null);
        },
      });

      responseActionsClientMock.setConnectorActionsClientExecuteResponse(
        connectorActionsMock,
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTION_RESULTS,
        { data: mockStream }
      );

      const result = await msClientMock.getFileDownload('abc', '123');

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTION_RESULTS,
          subActionParams: {
            id: 'machine-action-123',
          },
        },
      });

      expect(result).toEqual({
        stream: {
          data: expect.any(Readable),
        },
        fileName: 'script_output.txt',
        mimeType: undefined,
      });
    });

    it('should throw error when Microsoft Defender GET_ACTION_RESULTS API returns no data', async () => {
      // Clear any previous mocks first
      (connectorActionsMock.execute as jest.Mock).mockReset();

      // Mock the connector to return undefined data
      (connectorActionsMock.execute as jest.Mock).mockResolvedValueOnce({
        data: undefined,
      });

      await expect(msClientMock.getFileDownload('abc', '123')).rejects.toThrow(
        'Unable to establish a file download Readable stream with Microsoft Defender for Endpoint for response action [runscript] [abc]'
      );
    });

    it('should throw error when machine action ID is missing in response document', async () => {
      const generator = new EndpointActionGenerator('seed');
      const responseEsHit = generator.generateResponseEsHit({
        agent: { id: '123' },
        EndpointActions: {
          data: { command: 'runscript' },
          input_type: 'microsoft_defender_endpoint',
        },
        meta: {
          createdAt: '2024-05-09T10:30:00Z',
          filename: 'script_output.txt',
          // machineActionId is missing
        },
      });

      applyEsClientSearchMock({
        esClientMock: clientConstructorOptionsMock.esClient,
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        response: generator.toEsSearchResponse([responseEsHit]),
      });

      await expect(msClientMock.getFileDownload('abc', '123')).rejects.toThrow(
        'Unable to retrieve file from Microsoft Defender for Endpoint. Response ES document is missing [meta.machineActionId]'
      );
    });

    it('should throw error for unsupported command types', async () => {
      const generator = new EndpointActionGenerator('seed');
      const actionRequestsSearchResponse = generator.toEsSearchResponse([
        generator.generateActionEsHit<
          undefined,
          {},
          MicrosoftDefenderEndpointActionRequestCommonMeta
        >({
          agent: { id: '123' },
          EndpointActions: {
            data: { command: 'isolate', comment: 'test comment' },
            input_type: 'microsoft_defender_endpoint',
          },
        }),
      ]);

      applyEsClientSearchMock({
        esClientMock: clientConstructorOptionsMock.esClient,
        index: ENDPOINT_ACTIONS_INDEX,
        response: actionRequestsSearchResponse,
      });

      // Note: For unsupported commands, the method will not enter the switch case
      // and downloadStream will remain undefined, causing the method to throw
      await expect(msClientMock.getFileDownload('abc', '123')).rejects.toThrow(
        'Unable to establish a file download Readable stream with Microsoft Defender for Endpoint for response action [isolate] [abc]'
      );
    });

    it('should handle Microsoft Defender API errors and propagate them properly', async () => {
      responseActionsClientMock.setConnectorActionsClientExecuteResponse(
        connectorActionsMock,
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTION_RESULTS,
        { data: undefined }
      );

      // Mock the connector to throw an error
      (connectorActionsMock.execute as jest.Mock).mockRejectedValueOnce(
        new Error('Microsoft Defender API error')
      );

      await expect(msClientMock.getFileDownload('abc', '123')).rejects.toThrow(
        'Microsoft Defender API error'
      );

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTION_RESULTS,
          subActionParams: {
            id: 'machine-action-123',
          },
        },
      });
    });
  });

  describe('#getCustomScripts()', () => {
    it('should retrieve custom scripts from Microsoft Defender', async () => {
      const result = await msClientMock.getCustomScripts();

      expect(connectorActionsMock.execute).toHaveBeenCalledWith({
        params: {
          subAction: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_LIBRARY_FILES,
          subActionParams: {},
        },
      });

      expect(result).toEqual({
        data: [
          {
            id: 'test-script-1.ps1',
            name: 'test-script-1.ps1',
            description: 'Test PowerShell script for demonstration',
          },
          {
            id: 'test-script-2.py',
            name: 'test-script-2.py',
            description: 'Test Python script for automation',
          },
        ],
      });
    });

    it('should handle empty library files response', async () => {
      responseActionsClientMock.setConnectorActionsClientExecuteResponse(
        connectorActionsMock,
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_LIBRARY_FILES,
        responseActionsClientMock.createConnectorActionExecuteResponse({
          data: { '@odata.context': 'some-context', value: [] },
        })
      );

      const result = await msClientMock.getCustomScripts();

      expect(result).toEqual({ data: [] });
    });

    it('should handle missing data in library files response', async () => {
      responseActionsClientMock.setConnectorActionsClientExecuteResponse(
        connectorActionsMock,
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_LIBRARY_FILES,
        responseActionsClientMock.createConnectorActionExecuteResponse({
          data: {},
        })
      );

      const result = await msClientMock.getCustomScripts();

      expect(result).toEqual({ data: [] });
    });

    it('should handle Microsoft Defender API errors gracefully', async () => {
      const apiError = new Error('Microsoft Defender API error');
      connectorActionsMock.execute.mockImplementation(async (options) => {
        if (options.params.subAction === MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_LIBRARY_FILES) {
          throw apiError;
        }
        return responseActionsClientMock.createConnectorActionExecuteResponse();
      });

      await expect(msClientMock.getCustomScripts()).rejects.toThrow(
        'Failed to fetch Microsoft Defender for Endpoint scripts, failed with: Microsoft Defender API error'
      );
    });

    it('should handle null response data', async () => {
      responseActionsClientMock.setConnectorActionsClientExecuteResponse(
        connectorActionsMock,
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_LIBRARY_FILES,
        responseActionsClientMock.createConnectorActionExecuteResponse({
          data: null,
        })
      );

      const result = await msClientMock.getCustomScripts();

      expect(result).toEqual({ data: [] });
    });

    it('should handle undefined response data', async () => {
      responseActionsClientMock.setConnectorActionsClientExecuteResponse(
        connectorActionsMock,
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_LIBRARY_FILES,
        responseActionsClientMock.createConnectorActionExecuteResponse({
          data: undefined,
        })
      );

      const result = await msClientMock.getCustomScripts();

      expect(result).toEqual({ data: [] });
    });

    it('should throw ResponseActionsClientError on API failure', async () => {
      const apiError = new Error('Microsoft Defender API error');

      connectorActionsMock.execute.mockImplementation(async (options) => {
        if (options.params.subAction === MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_LIBRARY_FILES) {
          throw apiError;
        }
        return responseActionsClientMock.createConnectorActionExecuteResponse();
      });

      await expect(msClientMock.getCustomScripts()).rejects.toThrow(
        'Failed to fetch Microsoft Defender for Endpoint scripts, failed with: Microsoft Defender API error'
      );
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
          response: jest
            .fn(() => generator.toEsSearchResponse([]))
            .mockReturnValueOnce(actionRequestsSearchResponse),
          pitUsage: true,
        });

        msMachineActionsApiResponse = microsoftDefenderMock.createGetActionsApiResponse();
        responseActionsClientMock.setConnectorActionsClientExecuteResponse(
          connectorActionsMock,
          MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS,
          msMachineActionsApiResponse
        );

        const msGetActionResultsApiResponse =
          microsoftDefenderMock.createGetActionResultsApiResponse();

        // Set the mock response for GET_ACTION_RESULTS
        responseActionsClientMock.setConnectorActionsClientExecuteResponse(
          connectorActionsMock,
          MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTION_RESULTS,
          msGetActionResultsApiResponse
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

    describe('for Runscript', () => {
      let msMachineActionsApiResponse: MicrosoftDefenderEndpointGetActionsResponse;

      beforeEach(() => {
        // @ts-expect-error assign to readonly property
        clientConstructorOptionsMock.endpointService.experimentalFeatures.microsoftDefenderEndpointRunScriptEnabled =
          true;

        const generator = new EndpointActionGenerator('seed');

        const actionRequestsSearchResponse = generator.toEsSearchResponse([
          generator.generateActionEsHit<
            { scriptName: string },
            {},
            MicrosoftDefenderEndpointActionRequestCommonMeta
          >({
            agent: { id: 'agent-uuid-1' },
            EndpointActions: {
              data: { command: 'runscript', parameters: { scriptName: 'test-script.ps1' } },
              input_type: 'microsoft_defender_endpoint',
            },
            meta: { machineActionId: '5382f7ea-7557-4ab7-9782-d50480024a4e' },
          }),
        ]);

        applyEsClientSearchMock({
          esClientMock: clientConstructorOptionsMock.esClient,
          index: ENDPOINT_ACTIONS_INDEX,
          response: jest
            .fn(() => generator.toEsSearchResponse([]))
            .mockReturnValueOnce(actionRequestsSearchResponse),
          pitUsage: true,
        });

        msMachineActionsApiResponse = microsoftDefenderMock.createGetActionsApiResponse();
        // Override the default machine action to be runscript-specific
        msMachineActionsApiResponse.value[0] = {
          ...msMachineActionsApiResponse.value[0],
          type: 'LiveResponse',
          commands: ['RunScript'],
        };

        responseActionsClientMock.setConnectorActionsClientExecuteResponse(
          connectorActionsMock,
          MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS,
          msMachineActionsApiResponse
        );

        const msGetActionResultsApiResponse =
          microsoftDefenderMock.createGetActionResultsApiResponse();

        // Set the mock response for GET_ACTION_RESULTS
        responseActionsClientMock.setConnectorActionsClientExecuteResponse(
          connectorActionsMock,
          MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTION_RESULTS,
          msGetActionResultsApiResponse
        );
      });

      it('should generate action response docs for completed runscript actions', async () => {
        await msClientMock.processPendingActions(processPendingActionsOptions);

        expect(processPendingActionsOptions.addToQueue).toHaveBeenCalledWith({
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
            completed_at: expect.any(String),
            data: { command: 'runscript' },
            input_type: 'microsoft_defender_endpoint',
            started_at: expect.any(String),
          },
          agent: { id: 'agent-uuid-1' },
          error: undefined,
          meta: expect.objectContaining({
            machineActionId: expect.any(String),
            createdAt: expect.any(String),
            filename: expect.any(String),
          }),
        });
      });

      it.each<MicrosoftDefenderEndpointMachineAction['status']>(['Pending', 'InProgress'])(
        'should NOT generate action responses if runscript action in MS Defender has a status of %s',
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
        'should generate $responseState action response if MS runscript machine action status is $msStatusValue',
        async ({ msStatusValue, responseState }) => {
          msMachineActionsApiResponse.value[0].status = msStatusValue;
          const expectedResult: LogsEndpointActionResponse = {
            '@timestamp': expect.any(String),
            EndpointActions: {
              action_id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
              completed_at: expect.any(String),
              data: { command: 'runscript' },
              input_type: 'microsoft_defender_endpoint',
              started_at: expect.any(String),
            },
            agent: { id: 'agent-uuid-1' },
            error: undefined,
            meta: expect.objectContaining({
              machineActionId: expect.any(String),
              createdAt: expect.any(String),
              filename: expect.any(String),
            }),
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

    describe('telemetry events', () => {
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
            response: jest
              .fn(() => generator.toEsSearchResponse([]))
              .mockReturnValueOnce(actionRequestsSearchResponse),
            pitUsage: true,
          });

          msMachineActionsApiResponse = microsoftDefenderMock.createGetActionsApiResponse();
          responseActionsClientMock.setConnectorActionsClientExecuteResponse(
            connectorActionsMock,
            MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS,
            msMachineActionsApiResponse
          );

          const msGetActionResultsApiResponse =
            microsoftDefenderMock.createGetActionResultsApiResponse();

          // Set the mock response for GET_ACTION_RESULTS
          responseActionsClientMock.setConnectorActionsClientExecuteResponse(
            connectorActionsMock,
            MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTION_RESULTS,
            msGetActionResultsApiResponse
          );
        });

        it.each`
          msStatusValue  | responseState
          ${'Failed'}    | ${'failed'}
          ${'TimeOut'}   | ${'failed'}
          ${'Cancelled'} | ${'failed'}
          ${'Succeeded'} | ${'successful'}
        `(
          'should send telemetry for $responseState action response if MS machine action status is $msStatusValue',
          async ({ msStatusValue, responseState }) => {
            msMachineActionsApiResponse.value[0].status = msStatusValue;

            await msClientMock.processPendingActions(processPendingActionsOptions);
            expect(
              clientConstructorOptionsMock.endpointService.getTelemetryService().reportEvent
            ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
              responseActions: {
                actionId: expect.any(String),
                actionStatus: responseState,
                agentType: 'microsoft_defender_endpoint',
                command: 'isolate',
              },
            });
          }
        );
      });

      describe('for Runscript', () => {
        let msMachineActionsApiResponse: MicrosoftDefenderEndpointGetActionsResponse;

        beforeEach(() => {
          // @ts-expect-error assign to readonly property
          clientConstructorOptionsMock.endpointService.experimentalFeatures.microsoftDefenderEndpointRunScriptEnabled =
            true;

          const generator = new EndpointActionGenerator('seed');

          const actionRequestsSearchResponse = generator.toEsSearchResponse([
            generator.generateActionEsHit<
              { scriptName: string },
              {},
              MicrosoftDefenderEndpointActionRequestCommonMeta
            >({
              agent: { id: 'agent-uuid-1' },
              EndpointActions: {
                data: { command: 'runscript', parameters: { scriptName: 'test-script.ps1' } },
                input_type: 'microsoft_defender_endpoint',
              },
              meta: { machineActionId: '5382f7ea-7557-4ab7-9782-d50480024a4e' },
            }),
          ]);

          applyEsClientSearchMock({
            esClientMock: clientConstructorOptionsMock.esClient,
            index: ENDPOINT_ACTIONS_INDEX,
            response: jest
              .fn(() => generator.toEsSearchResponse([]))
              .mockReturnValueOnce(actionRequestsSearchResponse),
            pitUsage: true,
          });

          msMachineActionsApiResponse = microsoftDefenderMock.createGetActionsApiResponse();
          // Override the default machine action to be runscript-specific
          msMachineActionsApiResponse.value[0] = {
            ...msMachineActionsApiResponse.value[0],
            type: 'LiveResponse',
            commands: ['RunScript'],
          };

          responseActionsClientMock.setConnectorActionsClientExecuteResponse(
            connectorActionsMock,
            MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS,
            msMachineActionsApiResponse
          );

          const msGetActionResultsApiResponse =
            microsoftDefenderMock.createGetActionResultsApiResponse();

          // Set the mock response for GET_ACTION_RESULTS
          responseActionsClientMock.setConnectorActionsClientExecuteResponse(
            connectorActionsMock,
            MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTION_RESULTS,
            msGetActionResultsApiResponse
          );
        });

        it('should send telemetry for completed runscript actions', async () => {
          await msClientMock.processPendingActions(processPendingActionsOptions);

          expect(
            clientConstructorOptionsMock.endpointService.getTelemetryService().reportEvent
          ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
            responseActions: {
              actionId: expect.any(String),
              actionStatus: 'successful',
              agentType: 'microsoft_defender_endpoint',
              command: 'runscript',
            },
          });
        });

        it.each`
          msStatusValue  | responseState
          ${'Failed'}    | ${'failed'}
          ${'TimeOut'}   | ${'failed'}
          ${'Cancelled'} | ${'failed'}
          ${'Succeeded'} | ${'successful'}
        `(
          'should generate $responseState action response if MS runscript machine action status is $msStatusValue',
          async ({ msStatusValue, responseState }) => {
            msMachineActionsApiResponse.value[0].status = msStatusValue;

            await msClientMock.processPendingActions(processPendingActionsOptions);

            expect(
              clientConstructorOptionsMock.endpointService.getTelemetryService().reportEvent
            ).toHaveBeenCalledWith(ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT.eventType, {
              responseActions: {
                actionId: expect.any(String),
                actionStatus: responseState,
                agentType: 'microsoft_defender_endpoint',
                command: 'runscript',
              },
            });
          }
        );
      });
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
