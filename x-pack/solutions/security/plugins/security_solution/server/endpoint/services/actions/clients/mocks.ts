/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import type { DeepPartial } from 'utility-types';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { CasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { createCasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { merge } from 'lodash';
import type { TransportResult, estypes } from '@elastic/elasticsearch';
import type { AttachmentsSubClient } from '@kbn/cases-plugin/server/client/attachments/client';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { getPackagePolicyInfoFromFleetKuery } from '../../../mocks/utils.mock';
import { FleetPackagePolicyGenerator } from '../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { FleetAgentGenerator } from '../../../../../common/endpoint/data_generators/fleet_agent_generator';
import type { ResponseActionsClient, ResponseActionsClientMethods } from '../..';
import { NormalizedExternalConnectorClient } from '../..';
import type { KillOrSuspendProcessRequestBody } from '../../../../../common/endpoint/types';
import { BaseDataGenerator } from '../../../../../common/endpoint/data_generators/base_data_generator';
import {
  createActionRequestsEsSearchResultsMock,
  createActionResponsesEsSearchResultsMock,
  createHapiReadableStreamMock,
} from '../mocks';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../../common/endpoint/constants';
import type { DeepMutable } from '../../../../../common/endpoint/types/utility_types';
import { EndpointAppContextService } from '../../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from '../../../mocks';
import type { ResponseActionsClientOptions } from './lib/base_response_actions_client';
import { ACTION_RESPONSE_INDICES } from '../constants';
import type {
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
  ScanActionRequestBody,
  RunScriptActionRequestBody,
} from '../../../../../common/api/endpoint';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '../../../../../common/endpoint/service/response_actions/constants';
import { isActionSupportedByAgentType } from '../../../../../common/endpoint/service/response_actions/is_response_action_supported';

export interface ResponseActionsClientOptionsMock extends ResponseActionsClientOptions {
  esClient: ElasticsearchClientMock;
  casesClient?: CasesClientMock;
}

export type NormalizedExternalConnectorClientMock =
  DeeplyMockedKeys<NormalizedExternalConnectorClient>;

const createResponseActionClientMock = (): jest.Mocked<ResponseActionsClient> => {
  return {
    suspendProcess: jest.fn().mockReturnValue(Promise.resolve()),
    upload: jest.fn().mockReturnValue(Promise.resolve()),
    getFile: jest.fn().mockReturnValue(Promise.resolve()),
    execute: jest.fn().mockReturnValue(Promise.resolve()),
    killProcess: jest.fn().mockReturnValue(Promise.resolve()),
    isolate: jest.fn().mockReturnValue(Promise.resolve()),
    release: jest.fn().mockReturnValue(Promise.resolve()),
    runningProcesses: jest.fn().mockReturnValue(Promise.resolve()),
    processPendingActions: jest.fn().mockReturnValue(Promise.resolve()),
    getFileInfo: jest.fn().mockReturnValue(Promise.resolve()),
    getFileDownload: jest.fn().mockReturnValue(Promise.resolve()),
    scan: jest.fn().mockReturnValue(Promise.resolve()),
    runscript: jest.fn().mockReturnValue(Promise.resolve()),
    getCustomScripts: jest.fn().mockReturnValue(Promise.resolve()),
  };
};

const createConstructorOptionsMock = (): Required<ResponseActionsClientOptionsMock> => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  const casesClient = createCasesClientMock();

  // TODO:PT refactor mock to instead use Mocked endpoint context and not the real class with mocked dependencies
  const endpointService = new EndpointAppContextService();
  const endpointServiceStartContract = createMockEndpointAppContextServiceStartContract();

  esClient.index.mockImplementation((async (payload) => {
    switch (payload.index) {
      case ENDPOINT_ACTIONS_INDEX:
      case ENDPOINT_ACTION_RESPONSES_INDEX:
        return createEsIndexTransportResponseMock({ body: { _index: payload.index } });
      default:
        throw new Error(`no esClient.index() mock defined for index ${payload.index}`);
    }
  }) as typeof esClient.index);

  esClient.search.mockImplementation(async (payload) => {
    if (payload) {
      if (
        !Array.isArray(payload.index) &&
        (payload.index ?? '').startsWith(
          ENDPOINT_ACTIONS_INDEX.substring(0, ENDPOINT_ACTIONS_INDEX.length - 1)
        )
      ) {
        return createActionRequestsEsSearchResultsMock();
      }

      if (payload.index === ACTION_RESPONSE_INDICES) {
        return createActionResponsesEsSearchResultsMock();
      }
    }

    return BaseDataGenerator.toEsSearchResponse([]);
  });

  esClient.indices.getMapping.mockResolvedValue({
    '.ds-.logs-endpoint.actions-default-2025.06.13-000001': {
      mappings: { properties: {} },
    },
  });

  esClient.cluster.existsComponentTemplate.mockResolvedValue(true);

  esClient.cluster.getComponentTemplate.mockResolvedValue({
    component_templates: [
      {
        name: '.logs-endpoint.actions@package',
        component_template: {
          template: {
            settings: {},
            mappings: {
              dynamic: false,
              properties: {
                agent: {
                  properties: {
                    policy: {
                      properties: {
                        agentId: { ignore_above: 1024, type: 'keyword' },
                        agentPolicyId: { ignore_above: 1024, type: 'keyword' },
                        elasticAgentId: { ignore_above: 1024, type: 'keyword' },
                        integrationPolicyId: { ignore_above: 1024, type: 'keyword' },
                      },
                    },
                  },
                },
              },
            },
          },
          _meta: {
            package: { name: 'endpoint' },
            managed_by: 'fleet',
            managed: true,
          },
        },
      },
    ],
  });

  (casesClient.attachments.bulkCreate as jest.Mock).mockImplementation(
    (async () => {}) as unknown as jest.Mocked<AttachmentsSubClient>['bulkCreate']
  );

  // Mock some Fleet apis in order to support the `fetchFleetInfoForAgents()` method
  const fleetStartServices = endpointServiceStartContract.fleetStartServices;
  const packagePolicy = new FleetPackagePolicyGenerator('seed').generate();

  fleetStartServices.agentService.asInternalUser.getByIds.mockImplementation(async (agentIds) => {
    return agentIds?.map((id) =>
      new FleetAgentGenerator('seed').generate({ id, policy_id: packagePolicy.policy_ids[0] })
    );
  });
  fleetStartServices.packagePolicyService.list.mockImplementation(async (_, options) => {
    const kueryInfo = await getPackagePolicyInfoFromFleetKuery(options.kuery ?? '');

    const packagePolicyOverrides: Parameters<FleetPackagePolicyGenerator['generate']>[0] = {
      id: packagePolicy.id,
    };

    if (kueryInfo.packageNames.length > 0) {
      packagePolicyOverrides.package = {
        name: kueryInfo.packageNames[0],
        version: '1.0.0',
        title: kueryInfo.packageNames[0],
      };
    }

    if (kueryInfo.agentPolicyIds) {
      packagePolicyOverrides.policy_ids = [kueryInfo.agentPolicyIds[0]];
    }

    return {
      items: [new FleetPackagePolicyGenerator('seed').generate(packagePolicyOverrides)],
      size: 1,
      page: 1,
      perPage: 20,
      total: 1,
    };
  });

  endpointService.setup(createMockEndpointAppContextServiceSetupContract());
  endpointService.start({
    ...endpointServiceStartContract,
    esClient,
  });

  // Enable the mocking of internal fleet services
  const fleetServices = endpointService.getInternalFleetServices();
  jest.spyOn(fleetServices, 'ensureInCurrentSpace');

  const getInternalFleetServicesMock = jest.spyOn(endpointService, 'getInternalFleetServices');
  getInternalFleetServicesMock.mockReturnValue(fleetServices);

  return {
    esClient,
    casesClient,
    endpointService,
    spaceId: DEFAULT_SPACE_ID,
    username: 'foo',
    isAutomated: false,
  };
};

const createEsIndexTransportResponseMock = (
  overrides: DeepPartial<TransportResult<estypes.IndexResponse, unknown>> = {}
): TransportResult<estypes.IndexResponse, unknown> => {
  const responseDoc: TransportResult<estypes.IndexResponse, unknown> = {
    body: {
      _id: 'indexed-1-2-3',
      _index: 'some-index',
      _primary_term: 1,
      result: 'created',
      _seq_no: 1,
      _shards: {
        failed: 0,
        successful: 1,
        total: 1,
      },
      _version: 1,
    },
    statusCode: 201,
    headers: {},
    warnings: null,
    meta: {
      context: {},
      name: 'foo',
      request: {
        params: {
          method: 'GET',
          path: 'some/path',
        },
        options: {},
        id: 'some-id',
      },
      connection: null,
      attempts: 1,
      aborted: false,
    },
  };

  return merge(responseDoc, overrides);
};

const createNoParamsResponseActionOptionsMock = (
  overrides: Partial<IsolationRouteRequestBody> = {}
): DeepMutable<IsolationRouteRequestBody> => {
  const isolateOptions: IsolationRouteRequestBody = {
    agent_type: 'endpoint',
    endpoint_ids: ['1-2-3'],
    comment: 'test comment',
  };

  return merge(isolateOptions, overrides);
};

const createKillOrSuspendProcessOptionsMock = (
  overrides: Partial<KillOrSuspendProcessRequestBody> = {}
): KillOrSuspendProcessRequestBody => {
  const parameters = overrides.parameters ?? { pid: 999 };
  const options: KillOrSuspendProcessRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters,
  };
  return merge(options, overrides);
};

const createRunningProcessesOptionsMock = (
  overrides: Partial<GetProcessesRequestBody> = {}
): GetProcessesRequestBody => {
  return createNoParamsResponseActionOptionsMock(overrides);
};

const createGetFileOptionsMock = (
  overrides: Partial<ResponseActionGetFileRequestBody> = {}
): ResponseActionGetFileRequestBody => {
  const options: ResponseActionGetFileRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters: {
      path: '/some/file',
    },
  };
  return merge(options, overrides);
};

const createExecuteOptionsMock = (
  overrides: Partial<ExecuteActionRequestBody> = {}
): ExecuteActionRequestBody => {
  const options: ExecuteActionRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters: {
      command: 'ls -ltr',
    },
  };

  return merge(options, overrides);
};

const createUploadOptionsMock = (
  overrides: Partial<UploadActionApiRequestBody> = {}
): UploadActionApiRequestBody => {
  const options: UploadActionApiRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters: {
      overwrite: true,
    },
    file: createHapiReadableStreamMock(),
  };

  return merge(options, overrides);
};

const createScanOptionsMock = (
  overrides: Partial<ScanActionRequestBody> = {}
): ScanActionRequestBody => {
  const options: ScanActionRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters: {
      path: '/scan/folder',
    },
  };
  return merge(options, overrides);
};

const createRunScriptOptionsMock = (
  overrides: Partial<RunScriptActionRequestBody> = {}
): RunScriptActionRequestBody => {
  const options: RunScriptActionRequestBody = {
    ...createNoParamsResponseActionOptionsMock(),
    parameters: {
      raw: 'ls',
    },
  };
  return merge(options, overrides);
};

const createConnectorMock = (
  overrides: DeepPartial<ConnectorWithExtraFindData> = {}
): ConnectorWithExtraFindData => {
  return merge(
    {
      id: 'connector-mock-id-1',
      actionTypeId: '.some-type',
      name: 'some mock name',
      isMissingSecrets: false,
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
    overrides
  );
};

const createConnectorActionExecuteResponseMock = <TData>(
  overrides: DeepPartial<ActionTypeExecutorResult<TData>> = {}
): ActionTypeExecutorResult<{}> => {
  const result: ActionTypeExecutorResult<TData> = {
    actionId: 'execute-response-mock-1',
    data: undefined,
    message: 'some mock message',
    serviceMessage: 'some mock service message',
    retry: true,
    status: 'ok',
  };

  // @ts-expect-error upgrade typescript v4.9.5
  return merge(result, overrides);
};

const createConnectorActionsClientMock = ({
  getAllResponse,
}: {
  getAllResponse?: ConnectorWithExtraFindData[];
} = {}): ActionsClientMock => {
  const client = actionsClientMock.create();

  client.getAll.mockImplementation(async () => {
    return getAllResponse ?? [];
  });

  client.execute.mockImplementation(async () => createConnectorActionExecuteResponseMock());

  return client;
};

const createNormalizedExternalConnectorClientMock = (
  connectorActionsClientMock: ActionsClientMock = createConnectorActionsClientMock()
): NormalizedExternalConnectorClientMock => {
  const normalizedClient = new NormalizedExternalConnectorClient(
    connectorActionsClientMock,
    loggingSystemMock.createLogger()
  );

  jest.spyOn(normalizedClient, 'execute');
  jest.spyOn(normalizedClient, 'setup');

  return normalizedClient as NormalizedExternalConnectorClientMock;
};

const setConnectorActionsClientExecuteResponseMock = (
  connectorActionsClient: ActionsClientMock | NormalizedExternalConnectorClientMock,
  subAction: string,
  /**
   * The response to be returned. If this value is a function, it will be called with the
   * arguments passed to `.execute()` and should then return the response
   */
  response: any
): void => {
  const executeMockFn = (connectorActionsClient.execute as jest.Mock).getMockImplementation();

  (connectorActionsClient.execute as jest.Mock).mockImplementation(async (options) => {
    if (options.params.subAction === subAction) {
      const responseData = typeof response === 'function' ? response(options) : response;

      return responseActionsClientMock.createConnectorActionExecuteResponse({
        data: responseData,
      });
    }

    if (executeMockFn) {
      return executeMockFn(options);
    }

    return responseActionsClientMock.createConnectorActionExecuteResponse({
      data: {},
    });
  });
};

const getClientSupportedResponseActionMethodNames = (
  agentType: ResponseActionAgentType
): ResponseActionsClientMethods[] => {
  const methods: ResponseActionsClientMethods[] = [];

  for (const responseActionApiName of RESPONSE_ACTION_API_COMMANDS_NAMES) {
    if (isActionSupportedByAgentType(agentType, responseActionApiName, 'manual')) {
      // Map (if necessary) the response action name to the method name that is defined in the
      // Response Actions client class
      switch (responseActionApiName) {
        case 'unisolate':
          methods.push('release');
          break;

        case 'running-processes':
          methods.push('runningProcesses');
          break;

        case 'get-file':
          methods.push('getFile');
          break;

        case 'kill-process':
          methods.push('killProcess');
          break;

        case 'suspend-process':
          methods.push('suspendProcess');
          break;

        default:
          methods.push(responseActionApiName);
      }
    }
  }

  return methods;
};

const getOptionsForResponseActionMethod = (method: ResponseActionsClientMethods) => {
  switch (method) {
    case 'isolate':
    case 'release':
      return createNoParamsResponseActionOptionsMock();

    case 'scan':
      return createScanOptionsMock();

    case 'upload':
      return createUploadOptionsMock();

    case 'execute':
      return createExecuteOptionsMock();

    case 'runscript':
      return createRunScriptOptionsMock();

    case 'killProcess':
    case 'suspendProcess':
      return createKillOrSuspendProcessOptionsMock();

    case 'runningProcesses':
      return createRunningProcessesOptionsMock();

    case 'getFile':
      return createGetFileOptionsMock();

    default:
      throw new Error(`Mock options are not defined for response action method [${method}]`);
  }
};

export const responseActionsClientMock = Object.freeze({
  create: createResponseActionClientMock,
  createConstructorOptions: createConstructorOptionsMock,

  getClientSupportedResponseActionMethodNames,
  getOptionsForResponseActionMethod,

  createIsolateOptions: createNoParamsResponseActionOptionsMock,
  createReleaseOptions: createNoParamsResponseActionOptionsMock,
  createKillProcessOptions: createKillOrSuspendProcessOptionsMock,
  createSuspendProcessOptions: createKillOrSuspendProcessOptionsMock,
  createRunningProcessesOptions: createRunningProcessesOptionsMock,
  createGetFileOptions: createGetFileOptionsMock,
  createExecuteOptions: createExecuteOptionsMock,
  createUploadOptions: createUploadOptionsMock,
  createScanOptions: createScanOptionsMock,
  createRunScriptOptions: createRunScriptOptionsMock,

  createIndexedResponse: createEsIndexTransportResponseMock,

  createNormalizedExternalConnectorClient: createNormalizedExternalConnectorClientMock,

  // Some common mocks when working with connector actions client (actions plugin)
  createConnectorActionsClient: createConnectorActionsClientMock,
  /** Create a mock connector instance */
  createConnector: createConnectorMock,
  createConnectorActionExecuteResponse: createConnectorActionExecuteResponseMock,
  setConnectorActionsClientExecuteResponse: setConnectorActionsClientExecuteResponseMock,
});
