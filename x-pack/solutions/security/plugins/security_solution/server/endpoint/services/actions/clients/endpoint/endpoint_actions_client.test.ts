/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsClientOptions } from '../lib/base_response_actions_client';
import type { ResponseActionsClient } from '../../..';
import { getActionDetailsById as _getActionDetailsById } from '../../action_details_by_id';
import { EndpointActionsClient } from '../../..';
import { endpointActionClientMock } from './mocks';
import { responseActionsClientMock } from '../mocks';
import {
  ENDPOINT_ACTIONS_INDEX,
  metadataCurrentIndexPattern,
} from '../../../../../../common/endpoint/constants';

import { DEFAULT_EXECUTE_ACTION_TIMEOUT } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { EndpointCapabilities } from '../../../../../../common/endpoint/service/response_actions/constants';
import { applyEsClientSearchMock } from '../../../../mocks/utils.mock';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { BaseDataGenerator } from '../../../../../../common/endpoint/data_generators/base_data_generator';
import { Readable } from 'stream';
import { EndpointActionGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_action_generator';
import type {
  ResponseActionGetFileRequestBody,
  ResponseActionsRequestBody,
} from '../../../../../../common/api/endpoint';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import { ALLOWED_ACTION_REQUEST_TAGS } from '../../constants';
import { EndpointMetadataGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { ScriptsLibraryMock } from '../../../scripts_library/mocks';
import type {
  ActionDetails,
  ExportProvider,
  PolicyData,
} from '../../../../../../common/endpoint/types';
import { FleetAgentGenerator } from '../../../../../../common/endpoint/data_generators/fleet_agent_generator';
import { FleetPackagePolicyGenerator } from '../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { setExportProviders } from '../../../../../../common/endpoint/models/export_providers';
import { exportProviderKeyMocks } from '../../../../lib/export_provider_keys/mocks';
import type { ExportProviderKeyClientInterface } from '../../../../lib/export_provider_keys/types';
import { stringify } from '../../../../utils/stringify';

jest.mock('../../action_details_by_id', () => {
  const originalMod = jest.requireActual('../../action_details_by_id');
  return {
    ...originalMod,
    getActionDetailsById: jest.fn(originalMod.getActionDetailsById),
  };
});

const getActionDetailsByIdMock = _getActionDetailsById as jest.Mock;

describe('EndpointActionsClient', () => {
  let classConstructorOptions: ResponseActionsClientOptions;
  let endpointActionsClient: ResponseActionsClient;

  const getCommonResponseActionOptions = (): Pick<
    ResponseActionsRequestBody,
    'endpoint_ids' | 'case_ids'
  > => {
    return {
      endpoint_ids: ['1-2-3', 'invalid-id', '1-2-3'],
      case_ids: ['case-a'],
    };
  };

  // Valid-format (base64, 88 chars) mock storage account key - never a real credential.
  const EXPORT_PROVIDER_ACCOUNT_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWYwMTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZg==';
  const EXPORT_AGENT_POLICY_ID = 'export-agent-policy-1';

  /**
   * Configures the mocked host's Elastic Defend policy (the one the agent targeted by
   * `getCommonResponseActionOptions()` resolves to, through Fleet) to have `provider` configured,
   * and, by default, a usable stored account key for it. `fetchAgentsById()`/`packagePolicy.list()`
   * are wired consistently so the pre-existing `fetchAgentPolicyInfo()` check (unrelated to export)
   * keeps passing too.
   */
  const setupExportProviderPolicy = (
    provider: ExportProvider,
    { hasAccountKey = true }: { hasAccountKey?: boolean } = {}
  ): {
    packagePolicy: PolicyData;
    exportProviderKeyClient: jest.Mocked<ExportProviderKeyClientInterface>;
  } => {
    const fleetServices = classConstructorOptions.endpointService.getInternalFleetServices();
    const packagePolicy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
      policy_ids: [EXPORT_AGENT_POLICY_ID],
    });

    packagePolicy.inputs[0].config.policy.value = setExportProviders(
      packagePolicy.inputs[0].config.policy.value,
      [provider]
    );

    (fleetServices.fetchAgentsById as jest.Mock).mockImplementation(async (ids: string[]) =>
      ids.map((id) =>
        new FleetAgentGenerator('seed').generate({ id, policy_id: EXPORT_AGENT_POLICY_ID })
      )
    );
    (fleetServices.packagePolicy.list as jest.Mock).mockResolvedValue({
      items: [packagePolicy],
      page: 1,
      perPage: 10_000,
      total: 1,
    });

    const exportProviderKeyClient = exportProviderKeyMocks.createClient();

    if (hasAccountKey) {
      exportProviderKeyClient.getAccountKey.mockResolvedValue(EXPORT_PROVIDER_ACCOUNT_KEY);
    }

    jest
      .spyOn(classConstructorOptions.endpointService, 'getExportProviderKeyClient')
      .mockReturnValue(exportProviderKeyClient);

    return { packagePolicy, exportProviderKeyClient };
  };

  /**
   * The `export` credential checks, shared by get-file and memory-dump. `callWithExport` sends
   * `command` with `export` set to `provider-1` to a host reporting `capabilities`.
   */
  const describeExportCredentials = (
    command: 'get-file' | 'memory-dump',
    capabilities: EndpointCapabilities[],
    callWithExport: () => Promise<ActionDetails>
  ) => {
    describe('and resolving export credentials', () => {
      const PROVIDER: ExportProvider = {
        id: 'provider-1',
        type: 'azure_blob',
        account_name: 'acct',
        container: 'dumps',
      };

      beforeEach(() => {
        const generator = new EndpointMetadataGenerator('seed');

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
          index: metadataCurrentIndexPattern,
          response: generator.toEsSearchResponse([
            generator.toEsSearchHit(
              generator.generate({
                elastic: { agent: { id: '1-2-3' } },
                Endpoint: { capabilities },
              })
            ),
          ]),
        });
      });

      it('sends the SAS to Fleet only, and never writes it (or the account key) to the action request document', async () => {
        setupExportProviderPolicy(PROVIDER);

        // Serialized when `sign()` is called: the Fleet document is mutated afterwards
        const signedDocuments: string[] = [];
        (
          classConstructorOptions.endpointService.getMessageSigningService().sign as jest.Mock
        ).mockImplementationOnce(async (doc: unknown) => {
          signedDocuments.push(JSON.stringify(doc));
          return { data: Buffer.from(JSON.stringify(doc)), signature: 'thisisasignature' };
        });

        await callWithExport();

        const fleetActionsClient =
          await classConstructorOptions.endpointService.getFleetActionsClient();
        const [fleetActionDoc] = (fleetActionsClient.create as jest.Mock).mock.calls[0];

        expect(fleetActionDoc.data.parameters.export_path).toEqual(
          `${fleetActionDoc.action_id}/upload.zip`
        );
        expect(Object.keys(fleetActionDoc.data.credentials)).toEqual(['sas']);
        expect(fleetActionDoc.data.credentials.sas).toEqual(expect.stringContaining('sr=b'));
        expect(fleetActionDoc.data.credentials.sas).toEqual(expect.stringContaining('sp=rcw'));
        expect(signedDocuments).toHaveLength(1);
        expect(JSON.parse(signedDocuments[0]).data.credentials).toEqual(
          fleetActionDoc.data.credentials
        );

        const [requestDocCall] = (
          classConstructorOptions.esClient.index as jest.Mock
        ).mock.calls.find(([request]) => request.index === ENDPOINT_ACTIONS_INDEX);
        const requestDocJson = JSON.stringify(requestDocCall.document);

        expect(requestDocCall.document.EndpointActions.data.parameters.export_path).toEqual(
          `${fleetActionDoc.action_id}/upload.zip`
        );
        expect(requestDocJson).not.toContain('credentials');
        expect(requestDocJson).not.toContain(fleetActionDoc.data.credentials.sas);
      });

      it('calls `getAccountKey` exactly once, with the policy id and the provider', async () => {
        const { packagePolicy, exportProviderKeyClient } = setupExportProviderPolicy(PROVIDER);

        await callWithExport();

        expect(exportProviderKeyClient.getAccountKey).toHaveBeenCalledTimes(1);
        expect(exportProviderKeyClient.getAccountKey).toHaveBeenCalledWith(
          packagePolicy.id,
          PROVIDER
        );
      });

      it('mints a SAS that expires 24h after the Fleet action `expiration`, truncated to the second', async () => {
        setupExportProviderPolicy(PROVIDER);

        await callWithExport();

        const fleetActionsClient =
          await classConstructorOptions.endpointService.getFleetActionsClient();
        const [fleetActionDoc] = (fleetActionsClient.create as jest.Mock).mock.calls[0];
        const expectedExpiresOn = new Date(
          Math.floor((Date.parse(fleetActionDoc.expiration) + 24 * 60 * 60 * 1000) / 1000) * 1000
        );
        const expectedSe = `${expectedExpiresOn.toISOString().slice(0, 19)}Z`;

        expect(decodeURIComponent(fleetActionDoc.data.credentials.sas)).toContain(
          `se=${expectedSe}`
        );
      });

      it('never logs the SAS or the signed payload, logging a redacted copy instead', async () => {
        setupExportProviderPolicy(PROVIDER);

        await callWithExport();

        const fleetActionsClient =
          await classConstructorOptions.endpointService.getFleetActionsClient();
        const [fleetActionDoc] = (fleetActionsClient.create as jest.Mock).mock.calls[0];
        const debugMock = classConstructorOptions.endpointService.createLogger().debug as jest.Mock;
        const loggedMessages = debugMock.mock.calls.map(([message]) =>
          typeof message === 'function' ? message() : message
        );

        expect(
          loggedMessages.some((message) => message.includes(fleetActionDoc.data.credentials.sas))
        ).toBe(false);
        expect(loggedMessages.some((message) => message.includes(fleetActionDoc.signed.data))).toBe(
          false
        );
        expect(loggedMessages.some((message) => message.includes('[redacted]'))).toBe(true);
      });

      it('rejects with a 400 and the exact message when the provider is not in the policy, dispatching nor writing anything', async () => {
        const { exportProviderKeyClient } = setupExportProviderPolicy({
          ...PROVIDER,
          id: 'some-other-provider',
        });

        await expect(callWithExport()).rejects.toMatchObject({
          statusCode: 400,
          message: `Export provider [${PROVIDER.id}] was not found in the Elastic Defend policy of agent [1-2-3]`,
        });

        const fleetActionsClient =
          await classConstructorOptions.endpointService.getFleetActionsClient();

        expect(fleetActionsClient.create as jest.Mock).not.toHaveBeenCalled();
        expect(
          (classConstructorOptions.esClient.index as jest.Mock).mock.calls.some(
            ([request]) => request.index === ENDPOINT_ACTIONS_INDEX
          )
        ).toBe(false);
        expect(exportProviderKeyClient.getAccountKey).not.toHaveBeenCalled();
      });

      it('rejects with a 400 and the exact message when the provider has no stored account key, dispatching nor writing anything', async () => {
        setupExportProviderPolicy(PROVIDER, { hasAccountKey: false });

        await expect(callWithExport()).rejects.toMatchObject({
          statusCode: 400,
          message: `Export provider [${PROVIDER.id}] has no storage account key. Set the key on the Storage providers tab of the Elastic Defend policy`,
        });

        const fleetActionsClient =
          await classConstructorOptions.endpointService.getFleetActionsClient();

        expect(fleetActionsClient.create as jest.Mock).not.toHaveBeenCalled();
        expect(
          (classConstructorOptions.esClient.index as jest.Mock).mock.calls.some(
            ([request]) => request.index === ENDPOINT_ACTIONS_INDEX
          )
        ).toBe(false);
      });

      it('rejects with a 400 and the exact message when encryption is unavailable, without calling `getAccountKey`', async () => {
        const { exportProviderKeyClient } = setupExportProviderPolicy(PROVIDER);

        exportProviderKeyClient.isEncryptionAvailable.mockReturnValue(false);

        await expect(callWithExport()).rejects.toMatchObject({
          statusCode: 400,
          message: `Kibana can't read the storage account key: set xpack.encryptedSavedObjects.encryptionKey`,
        });

        const fleetActionsClient =
          await classConstructorOptions.endpointService.getFleetActionsClient();

        expect(fleetActionsClient.create as jest.Mock).not.toHaveBeenCalled();
        expect(
          (classConstructorOptions.esClient.index as jest.Mock).mock.calls.some(
            ([request]) => request.index === ENDPOINT_ACTIONS_INDEX
          )
        ).toBe(false);
        expect(exportProviderKeyClient.getAccountKey).not.toHaveBeenCalled();
      });

      it('maps a `NotFoundError` from the policy lookup to a 400 with the same message', async () => {
        const fleetServices = classConstructorOptions.endpointService.getInternalFleetServices();
        const matchingPolicy = new FleetPackagePolicyGenerator(
          'seed'
        ).generateEndpointPackagePolicy({ policy_ids: [EXPORT_AGENT_POLICY_ID] });

        (fleetServices.fetchAgentsById as jest.Mock).mockImplementation(async (ids: string[]) =>
          ids.map((id) =>
            new FleetAgentGenerator('seed').generate({ id, policy_id: EXPORT_AGENT_POLICY_ID })
          )
        );
        // 1st call: the pre-existing (unrelated to `export`) `fetchAgentPolicyInfo()` check -
        // 2nd call: `prepareExport()`'s own lookup, which is the one under test here
        (fleetServices.packagePolicy.list as jest.Mock)
          .mockResolvedValueOnce({
            items: [matchingPolicy],
            page: 1,
            perPage: 10_000,
            total: 1,
          })
          .mockResolvedValueOnce({ items: [], page: 1, perPage: 10_000, total: 0 });

        await expect(callWithExport()).rejects.toMatchObject({
          statusCode: 400,
          message: expect.stringContaining(
            'No Elastic Defend integration policy found for agent policy'
          ),
        });
      });

      it('maps an `EndpointHostNotFoundError` from the policy lookup to a 400 with the same message, if practical', async () => {
        let metadataSearchCallCount = 0;
        const generator = new EndpointMetadataGenerator('seed');

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
          index: metadataCurrentIndexPattern,
          response: () => {
            metadataSearchCallCount += 1;

            // 1st call: `checkAgentIds()`, which must succeed so `prepareExport()` is reached at
            // all. 2nd call: `prepareExport()`'s own (separate) lookup of the same agent id.
            return metadataSearchCallCount === 1
              ? generator.toEsSearchResponse([
                  generator.toEsSearchHit(
                    generator.generate({
                      elastic: { agent: { id: '1-2-3' } },
                      Endpoint: { capabilities },
                    })
                  ),
                ])
              : BaseDataGenerator.toEsSearchResponse([]);
          },
        });

        await expect(callWithExport()).rejects.toMatchObject({
          statusCode: 400,
          message: 'Endpoint with id 1-2-3 not found',
        });
      });

      it('does not report a non-"not found" policy lookup error as a 400', async () => {
        const { packagePolicy } = setupExportProviderPolicy(PROVIDER);
        const fleetServices = classConstructorOptions.endpointService.getInternalFleetServices();

        // 1st call: the pre-existing `fetchAgentPolicyInfo()` check - 2nd call: the export lookup
        (fleetServices.packagePolicy.list as jest.Mock)
          .mockResolvedValueOnce({ items: [packagePolicy], page: 1, perPage: 10_000, total: 1 })
          .mockRejectedValueOnce(new Error('ES is unavailable'));

        const error = await callWithExport().catch((e) => e);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('ES is unavailable');
        expect(error.statusCode).not.toBe(400);
        expect(
          (await classConstructorOptions.endpointService.getFleetActionsClient())
            .create as jest.Mock
        ).not.toHaveBeenCalled();
      });

      it('does not resolve any export credentials when the feature flag is disabled, and never calls Fleet lookups or `getAccountKey` for it', async () => {
        Object.assign(classConstructorOptions.endpointService.experimentalFeatures, {
          responseActionsEndpointFileExport: false,
        });

        const fleetServices = classConstructorOptions.endpointService.getInternalFleetServices();
        const getAccountKeySpy = jest.spyOn(
          classConstructorOptions.endpointService.getExportProviderKeyClient(),
          'getAccountKey'
        );

        await expect(callWithExport()).rejects.toMatchObject({
          message: `${command} \`export\` parameter is not enabled`,
          statusCode: 400,
        });

        expect(fleetServices.fetchAgentsById as jest.Mock).not.toHaveBeenCalled();
        expect(fleetServices.packagePolicy.list as jest.Mock).not.toHaveBeenCalled();
        expect(getAccountKeySpy).not.toHaveBeenCalled();
      });

      it("doesn't keep the Fleet error, which holds the serialized request and the SAS, when the Fleet action can't be created", async () => {
        setupExportProviderPolicy(PROVIDER);

        const fleetActionsClient =
          await classConstructorOptions.endpointService.getFleetActionsClient();
        let sas = '';

        (fleetActionsClient.create as jest.Mock).mockImplementationOnce(
          async (doc: { data: { credentials: { sas: string } } }) => {
            sas = doc.data.credentials.sas;
            // Like the Elasticsearch client's `ResponseError`, which keeps the serialized request
            throw Object.assign(new Error('index_closed_exception'), {
              meta: { meta: { request: { params: { body: JSON.stringify(doc) } } } },
            });
          }
        );

        const error = await callWithExport().catch((e) => e);
        const errorLogMock = classConstructorOptions.endpointService.createLogger()
          .error as jest.Mock;

        expect(sas).not.toEqual('');
        expect(error.statusCode).toEqual(500);
        expect(error.message).toContain('index_closed_exception');
        // How the route error handler logs it
        expect(stringify(error, 20)).not.toContain(sas);
        expect(stringify(errorLogMock.mock.calls, 20)).not.toContain(sas);
      });
    });
  };

  beforeEach(() => {
    classConstructorOptions = endpointActionClientMock.createConstructorOptions();
    endpointActionsClient = new EndpointActionsClient(classConstructorOptions);

    (
      classConstructorOptions.endpointService.getInternalFleetServices()
        .ensureInCurrentSpace as jest.Mock
    ).mockResolvedValue(undefined);

    getActionDetailsByIdMock.mockResolvedValue(
      new EndpointActionGenerator('seed').generateActionDetails({
        agents: ['1-2-3'],
        isCompleted: false,
      })
    );

    // @ts-expect-error mocking this for testing purposes
    classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointMemoryDump =
      true;
    // @ts-expect-error mocking this for testing purposes
    classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointRunScript =
      true;
    // @ts-expect-error mocking this for testing purposes
    classConstructorOptions.endpointService.experimentalFeatures.responseActionsScriptLibraryManagement =
      true;
    // @ts-expect-error mocking this for testing purposes
    classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointCancel =
      true;
  });

  it('should validate endpoint ids and log those that are invalid', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    expect(classConstructorOptions.endpointService.createLogger().warn).toHaveBeenCalledWith(
      'The following agent ids are not valid: ["invalid-id"] and will not be included in action request'
    );
  });

  it('should sign fleet action request document', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    expect(
      classConstructorOptions.endpointService.getMessageSigningService().sign as jest.Mock
    ).toHaveBeenCalled();
  });

  it('should only dispatch fleet action for valid IDs', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    expect(
      (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
    ).toHaveBeenCalledWith({
      '@timestamp': expect.any(String),
      action_id: expect.any(String),
      agents: ['1-2-3'],
      data: {
        command: 'isolate',
        parameters: undefined,
        comment: 'test comment',
      },
      expiration: expect.any(String),
      input_type: 'endpoint',
      signed: {
        data: expect.any(String),
        signature: 'thisisasignature',
      },
      timeout: 300,
      type: 'INPUT_ACTION',
      user_id: 'foo',
    });
  });

  it('should write action request document to endpoint action request index with given set of valid/invalid agent ids', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        document: {
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: expect.any(String),
            data: {
              command: 'isolate',
              comment:
                'test comment. (WARNING: The following agent ids are not valid: ["invalid-id"] and will not be included in action request)',
              parameters: undefined,
            },
            expiration: expect.any(String),
            input_type: 'endpoint',
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
          user: {
            id: 'foo',
          },
        },
        refresh: 'wait_for',
      },
      expect.anything()
    );
  });

  it('should write correct comment when invalid agent ids', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions({
        ...getCommonResponseActionOptions(),
        comment: '',
      })
    );

    expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        document: {
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: expect.any(String),
            data: {
              command: 'isolate',
              comment:
                '(WARNING: The following agent ids are not valid: ["invalid-id"] and will not be included in action request)',
              parameters: undefined,
            },
            expiration: expect.any(String),
            input_type: 'endpoint',
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
          user: {
            id: 'foo',
          },
        },
        refresh: 'wait_for',
      },
      expect.anything()
    );
  });

  it('should write action request document to endpoint action request index with given valid agent ids', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions({
        endpoint_ids: ['1-2-3'],
        case_ids: ['case-a'],
      })
    );

    expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        document: {
          '@timestamp': expect.any(String),
          EndpointActions: {
            action_id: expect.any(String),
            data: {
              command: 'isolate',
              comment: 'test comment',
              parameters: undefined,
            },
            expiration: expect.any(String),
            input_type: 'endpoint',
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
          user: {
            id: 'foo',
          },
        },
        refresh: 'wait_for',
      },
      expect.anything()
    );
  });

  it('should update cases with unified attachment for valid agent ids', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions({
        endpoint_ids: ['1-2-3'],
        case_ids: ['case-a'],
      })
    );

    expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalledWith({
      attachments: [
        {
          type: 'security.endpoint',
          attachmentId: expect.any(String),
          data: { content: 'test comment' },
          metadata: {
            command: 'isolate',
            targets: [
              {
                agentType: 'endpoint',
                endpointId: '1-2-3',
                hostname: 'Host-ku5jy6j0pw',
              },
            ],
          },
          owner: 'securitySolution',
        },
      ],
      caseId: 'case-a',
    });
  });

  it('should update cases with unified attachment for valid/invalid agent ids', async () => {
    await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    expect(classConstructorOptions.casesClient?.attachments.bulkCreate).toHaveBeenCalledWith({
      attachments: [
        {
          type: 'security.endpoint',
          attachmentId: expect.any(String),
          data: {
            content:
              'test comment. (WARNING: The following agent ids are not valid: ["invalid-id"] and will not be included in action request)',
          },
          metadata: {
            command: 'isolate',
            targets: [
              {
                agentType: 'endpoint',
                endpointId: '1-2-3',
                hostname: 'Host-ku5jy6j0pw',
              },
            ],
          },
          owner: 'securitySolution',
        },
      ],
      caseId: 'case-a',
    });
  });

  it('should create an action with error and not trow when in automated mode', async () => {
    classConstructorOptions.isAutomated = true;
    await endpointActionsClient.isolate(getCommonResponseActionOptions(), {
      error: 'something is wrong',
    });

    expect(
      (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
    ).not.toHaveBeenCalled();
    expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          error: {
            message: 'something is wrong',
          },
        }),
      }),
      { meta: true }
    );
  });

  it('should create an action with error when agents are invalid (automated mode)', async () => {
    classConstructorOptions.isAutomated = true;
    // @ts-expect-error mocking this for testing purposes
    endpointActionsClient.checkAgentIds = jest.fn().mockResolvedValueOnce({
      isValid: false,
      valid: [],
      invalid: ['invalid-id'],
      hosts: [{ agent: { id: 'invalid-id', name: '' }, host: { hostname: '' } }],
    });

    await endpointActionsClient.isolate(getCommonResponseActionOptions());

    expect(
      (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
    ).not.toHaveBeenCalled();
    expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          error: {
            message: 'The host does not have Elastic Defend integration installed',
          },
        }),
      }),
      { meta: true }
    );
  });

  it('should return ActionDetails for newly created action', async () => {
    const actionResponse = await endpointActionsClient.isolate(
      responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
    );

    // NOTE: checking only the keys in order to avoid confusion - because the use of Mocks would
    // have returned a action details that would not match the request sent in this test.
    expect(Object.keys(actionResponse).sort()).toEqual(
      [
        'action',
        'id',
        'agentType',
        'agents',
        'hosts',
        'command',
        'startedAt',
        'isCompleted',
        'completedAt',
        'wasCanceled',
        'wasSuccessful',
        'errors',
        'isExpired',
        'status',
        'outputs',
        'agentState',
        'createdBy',
        'comment',
        'parameters',
        'alertIds',
        'ruleId',
        'ruleName',
      ].sort()
    );
  });

  type ResponseActionsMethodsOnly = keyof Omit<
    ResponseActionsClient,
    'processPendingActions' | 'getFileDownload' | 'getFileInfo' | 'getCustomScripts'
  >;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseActionMethods: Record<ResponseActionsMethodsOnly, any> = {
    isolate: responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions()),

    release: responseActionsClientMock.createReleaseOptions(getCommonResponseActionOptions()),

    killProcess: responseActionsClientMock.createKillProcessOptions(
      getCommonResponseActionOptions()
    ),

    suspendProcess: responseActionsClientMock.createSuspendProcessOptions(
      getCommonResponseActionOptions()
    ),

    runningProcesses: responseActionsClientMock.createRunningProcessesOptions(
      getCommonResponseActionOptions()
    ),

    getFile: responseActionsClientMock.createGetFileOptions(getCommonResponseActionOptions()),

    execute: responseActionsClientMock.createExecuteOptions(getCommonResponseActionOptions()),

    upload: responseActionsClientMock.createUploadOptions(getCommonResponseActionOptions()),

    scan: responseActionsClientMock.createScanOptions(getCommonResponseActionOptions()),

    memoryDump: responseActionsClientMock.createMemoryDumpActionOption(
      getCommonResponseActionOptions()
    ),

    runscript: endpointActionClientMock.createRunScriptOptions(getCommonResponseActionOptions()),

    cancel: responseActionsClientMock.createCancelActionOptions({
      ...getCommonResponseActionOptions(),
      parameters: { id: 'test-action-id-123', force: true },
    }),
  };

  it.each(Object.keys(responseActionMethods) as ResponseActionsMethodsOnly[])(
    'should dispatch a fleet action request calling %s() method',
    async (methodName) => {
      if (methodName === 'cancel') {
        getActionDetailsByIdMock.mockResolvedValue(
          new EndpointActionGenerator('seed').generateActionDetails({
            agents: ['1-2-3'],
            isCompleted: false,
            command: 'memory-dump',
            agentState: { '1-2-3': { isCompleted: false } },
          })
        );
      }

      await endpointActionsClient[methodName](responseActionMethods[methodName]);

      let expectedParams = responseActionMethods[methodName].parameters;
      let expectedComment = 'test comment';

      switch (methodName) {
        case 'upload':
          expectedParams = {
            ...expectedParams,
            file_id: '123-456-789',
            file_name: 'foo.txt',
            file_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
            file_size: 45632,
          };
          break;

        case 'execute':
          expectedParams = {
            ...expectedParams,
            timeout: DEFAULT_EXECUTE_ACTION_TIMEOUT,
          };
          break;

        case 'runscript':
          expectedParams = {
            ...expectedParams,
            file_sha256: 'e5441eb2bb',
            file_id: 'file-1-2-3',
            file_name: 'my_script.sh',
            file_size: 12098,
            path_to_executable: undefined,
            scriptId: 'script-1-2-3',
            timeout: 60000,
          };
          expectedComment = `(Script name: script one / File name: my_script.sh) ${expectedComment}`;
          break;

        case 'cancel':
          expectedParams = {
            id: 'test-action-id-123',
            force: true,
          };
          break;
      }

      expect(
        (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            command: expect.any(String),
            comment: expectedComment,
            parameters: expectedParams,
          },
        })
      );
    }
  );

  describe('#getFileDownload()', () => {
    beforeEach(() => {
      const endpointActionGenerator = new EndpointActionGenerator('seed');
      const actionRequestsSearchResponse = endpointActionGenerator.toEsSearchResponse([
        endpointActionGenerator.generateActionEsHit({
          agent: { id: '123' },
          EndpointActions: { data: { command: 'get-file' } },
        }),
      ]);

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: actionRequestsSearchResponse,
      });
    });

    it('should throw error if agent type for the action id is not endpoint', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: BaseDataGenerator.toEsSearchResponse([
          new EndpointActionGenerator('seed').generateActionEsHit({
            agent: { id: '123' },
            EndpointActions: { data: { command: 'get-file' }, input_type: 'sentinel_one' },
          }),
        ]),
      });

      await expect(endpointActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Action id [abc] with agent type of [endpoint] not found'
      );
    });

    it('should throw error if file id not associated with action id', async () => {
      await expect(endpointActionsClient.getFileDownload('abc', '123')).rejects.toThrow(
        'Invalid file id [123] for action [abc]'
      );
    });

    it('should return expected response', async () => {
      await expect(
        endpointActionsClient.getFileDownload('321-654', '123-456-789')
      ).resolves.toEqual({
        stream: expect.any(Readable),
        fileName: expect.any(String),
        mimeType: expect.any(String),
      });
    });
  });

  describe('#getFileInfo()', () => {
    beforeEach(() => {
      const endpointActionGenerator = new EndpointActionGenerator('seed');
      const actionRequestsSearchResponse = endpointActionGenerator.toEsSearchResponse([
        endpointActionGenerator.generateActionEsHit({
          agent: { id: '123' },
          EndpointActions: { data: { command: 'get-file' } },
        }),
      ]);

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: actionRequestsSearchResponse,
      });
    });

    it('should throw error if agent type for the action id is not endpoint', async () => {
      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: BaseDataGenerator.toEsSearchResponse([
          new EndpointActionGenerator('seed').generateActionEsHit({
            agent: { id: '123' },
            EndpointActions: { data: { command: 'get-file' }, input_type: 'sentinel_one' },
          }),
        ]),
      });

      await expect(endpointActionsClient.getFileInfo('abc', '123')).rejects.toThrow(
        'Action id [abc] with agent type of [endpoint] not found'
      );
    });

    it('should throw error if file id not associated with action id', async () => {
      await expect(endpointActionsClient.getFileInfo('abc', '123')).rejects.toThrow(
        'Invalid file ID. File [123] not associated with action ID [abc]'
      );
    });

    it('should return expected response', async () => {
      await expect(endpointActionsClient.getFileInfo('321-654', '123-456-789')).resolves.toEqual({
        actionId: '321-654',
        agentId: '111-222',
        agentType: 'endpoint',
        created: '2023-05-12T19:47:33.702Z',
        id: '123-456-789',
        mimeType: 'text/plain',
        name: 'foo.txt',
        size: 45632,
        status: 'READY',
      });
    });
  });

  describe('#getFile()', () => {
    // NOTE: the options mock merges its defaults (which include `path`), so `parameters` is
    //       set explicitly here to be able to test `paths` on its own.
    const createGetFileOptions = (parameters: ResponseActionGetFileRequestBody['parameters']) => ({
      ...responseActionsClientMock.createGetFileOptions(getCommonResponseActionOptions()),
      parameters,
    });

    describe('when `paths` parameter is defined', () => {
      it('should throw error when endpoint does not support `get_file_multi_path` capability', async () => {
        const generator = new EndpointMetadataGenerator('seed');

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
          index: metadataCurrentIndexPattern,
          response: generator.toEsSearchResponse([
            generator.toEsSearchHit(generator.generate({ Endpoint: { capabilities: [] } })),
          ]),
        });

        await expect(
          endpointActionsClient.getFile(createGetFileOptions({ paths: ['/one', '/two'] }))
        ).rejects.toThrow('The following agent IDs do not support the get-file `paths` parameter');
      });

      it('should succeed when endpoint supports the `get_file_multi_path` capability', async () => {
        const generator = new EndpointMetadataGenerator('seed');

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
          index: metadataCurrentIndexPattern,
          response: generator.toEsSearchResponse([
            generator.toEsSearchHit(
              generator.generate({ Endpoint: { capabilities: ['get_file_multi_path'] } })
            ),
          ]),
        });

        await expect(
          endpointActionsClient.getFile(createGetFileOptions({ paths: ['/one', '/two'] }))
        ).resolves.toBeDefined();
      });

      it('should send `paths` to the endpoint in the action request', async () => {
        const generator = new EndpointMetadataGenerator('seed');

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
          index: metadataCurrentIndexPattern,
          response: generator.toEsSearchResponse([
            generator.toEsSearchHit(
              generator.generate({ Endpoint: { capabilities: ['get_file_multi_path'] } })
            ),
          ]),
        });

        await endpointActionsClient.getFile(createGetFileOptions({ paths: ['/one', '/two'] }));

        const fleetActionsClient =
          await classConstructorOptions.endpointService.getFleetActionsClient();

        expect(fleetActionsClient.create as jest.Mock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              command: 'get-file',
              parameters: { paths: ['/one', '/two'] },
            }),
          })
        );
      });
    });

    it('should succeed without checking capability when only `path` is defined', async () => {
      await expect(
        endpointActionsClient.getFile(createGetFileOptions({ path: '/some/file' }))
      ).resolves.toBeDefined();
    });

    describe('when `force` parameter is set to `true`', () => {
      it('should throw error when endpoint does not support `get_file_force` capability', async () => {
        const generator = new EndpointMetadataGenerator('seed');

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
          index: metadataCurrentIndexPattern,
          response: generator.toEsSearchResponse([
            generator.toEsSearchHit(generator.generate({ Endpoint: { capabilities: [] } })),
          ]),
        });

        await expect(
          endpointActionsClient.getFile(
            responseActionsClientMock.createGetFileOptions({
              ...getCommonResponseActionOptions(),
              parameters: { path: 'C:\\locked.dat', force: true },
            })
          )
        ).rejects.toMatchObject({
          message: expect.stringContaining(
            'The following agent IDs do not support the get-file `force` parameter'
          ),
          statusCode: 400,
        });
      });

      it('should succeed when endpoint supports the `get_file_force` capability', async () => {
        const generator = new EndpointMetadataGenerator('seed');

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
          index: metadataCurrentIndexPattern,
          response: generator.toEsSearchResponse([
            generator.toEsSearchHit(
              generator.generate({ Endpoint: { capabilities: ['get_file_force'] } })
            ),
          ]),
        });

        await expect(
          endpointActionsClient.getFile(
            responseActionsClientMock.createGetFileOptions({
              ...getCommonResponseActionOptions(),
              parameters: { path: 'C:\\locked.dat', force: true },
            })
          )
        ).resolves.toBeDefined();
      });
    });

    describe('when `export` parameter is set', () => {
      it('should throw error when feature flag is disabled', async () => {
        await expect(
          endpointActionsClient.getFile(
            responseActionsClientMock.createGetFileOptions({
              ...getCommonResponseActionOptions(),
              parameters: { path: 'C:\\file.txt', export: 'provider-1' },
            })
          )
        ).rejects.toMatchObject({
          message: 'get-file `export` parameter is not enabled',
          statusCode: 400,
        });
      });

      describe('and the feature flag is enabled', () => {
        beforeEach(() => {
          Object.assign(classConstructorOptions.endpointService.experimentalFeatures, {
            responseActionsEndpointFileExport: true,
          });
        });

        it('should throw error when endpoint does not support `file_export` capability', async () => {
          const generator = new EndpointMetadataGenerator('seed');

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
            index: metadataCurrentIndexPattern,
            response: generator.toEsSearchResponse([
              // `capabilities` overrides are merged into the generated ones (not replaced), so pin
              // a version (< 9.7.0) whose generated capabilities include neither `file_export` nor
              // `get_file_force`
              generator.toEsSearchHit(
                generator.generate({ agent: { version: '9.6.0' }, Endpoint: { capabilities: [] } })
              ),
            ]),
          });

          await expect(
            endpointActionsClient.getFile(
              responseActionsClientMock.createGetFileOptions({
                ...getCommonResponseActionOptions(),
                parameters: { path: 'C:\\file.txt', export: 'provider-1' },
              })
            )
          ).rejects.toMatchObject({
            message: expect.stringContaining(
              'The following agent IDs do not support exporting files to external storage'
            ),
            statusCode: 400,
          });
        });

        it('should succeed and keep `export` in the Fleet action and the action request when endpoint supports the `file_export` capability', async () => {
          const generator = new EndpointMetadataGenerator('seed');

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
            index: metadataCurrentIndexPattern,
            response: generator.toEsSearchResponse([
              generator.toEsSearchHit(
                generator.generate({
                  elastic: { agent: { id: '1-2-3' } },
                  Endpoint: { capabilities: ['file_export'] },
                })
              ),
            ]),
          });
          setupExportProviderPolicy({
            id: 'provider-1',
            type: 'azure_blob',
            account_name: 'acct',
            container: 'dumps',
          });

          const parameters = { path: 'C:\\file.txt', export: 'provider-1' };

          await expect(
            endpointActionsClient.getFile(
              responseActionsClientMock.createGetFileOptions({
                ...getCommonResponseActionOptions(),
                parameters,
              })
            )
          ).resolves.toBeDefined();

          // Dropping `export` would silently turn the export into a normal upload to Fleet. Kibana
          // adds `export_path` on top (the blob path Endpoint uploads to), derived from the action id.
          const fleetActionsClient =
            await classConstructorOptions.endpointService.getFleetActionsClient();
          const [fleetActionDoc] = (fleetActionsClient.create as jest.Mock).mock.calls[0];
          const expectedParameters = {
            ...parameters,
            export_path: `${fleetActionDoc.action_id}/upload.zip`,
          };

          expect(fleetActionDoc.data.parameters).toEqual(expectedParameters);
          expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
            expect.objectContaining({
              index: ENDPOINT_ACTIONS_INDEX,
              document: expect.objectContaining({
                EndpointActions: expect.objectContaining({
                  data: expect.objectContaining({ parameters: expectedParameters }),
                }),
              }),
            }),
            expect.anything()
          );
        });

        describeExportCredentials('get-file', ['file_export'], () =>
          endpointActionsClient.getFile(
            responseActionsClientMock.createGetFileOptions({
              ...getCommonResponseActionOptions(),
              parameters: { path: 'C:\\file.txt', export: 'provider-1' },
            })
          )
        );

        it('does not resolve export credentials for an action that does not set `export`', async () => {
          const generator = new EndpointMetadataGenerator('seed');

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
            index: metadataCurrentIndexPattern,
            response: generator.toEsSearchResponse([
              generator.toEsSearchHit(generator.generate({ Endpoint: { capabilities: [] } })),
            ]),
          });

          const getAccountKeySpy = jest.spyOn(
            classConstructorOptions.endpointService.getExportProviderKeyClient(),
            'getAccountKey'
          );

          await endpointActionsClient.getFile(
            responseActionsClientMock.createGetFileOptions({
              ...getCommonResponseActionOptions(),
              parameters: { path: 'C:\\file.txt' },
            })
          );

          const fleetActionsClient =
            await classConstructorOptions.endpointService.getFleetActionsClient();
          const [fleetActionDoc] = (fleetActionsClient.create as jest.Mock).mock.calls[0];

          expect(fleetActionDoc.data.parameters).not.toHaveProperty('export_path');
          expect(fleetActionDoc.data).not.toHaveProperty('credentials');
          expect(getAccountKeySpy).not.toHaveBeenCalled();
        });

        describe('and `force` is also set to `true`', () => {
          const getFileWithForceAndExport = () =>
            endpointActionsClient.getFile(
              responseActionsClientMock.createGetFileOptions({
                ...getCommonResponseActionOptions(),
                parameters: { path: 'C:\\locked.dat', force: true, export: 'provider-1' },
              })
            );

          it('should report only the `export` error when only `get_file_force` is supported', async () => {
            const generator = new EndpointMetadataGenerator('seed');

            applyEsClientSearchMock({
              esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
              index: metadataCurrentIndexPattern,
              response: generator.toEsSearchResponse([
                generator.toEsSearchHit(
                  generator.generate({
                    agent: { version: '9.6.0' },
                    Endpoint: { capabilities: ['get_file_force'] },
                  })
                ),
              ]),
            });

            const error = await getFileWithForceAndExport().catch((e) => e);

            expect(error).toMatchObject({ statusCode: 400 });
            expect(error.message).toContain(
              'The following agent IDs do not support exporting files to external storage'
            );
            expect(error.message).not.toContain('do not support the get-file `force` parameter');
          });

          it('should report only the `force` error when only `file_export` is supported', async () => {
            const generator = new EndpointMetadataGenerator('seed');

            applyEsClientSearchMock({
              esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
              index: metadataCurrentIndexPattern,
              response: generator.toEsSearchResponse([
                generator.toEsSearchHit(
                  generator.generate({
                    agent: { version: '9.6.0' },
                    Endpoint: { capabilities: ['file_export'] },
                  })
                ),
              ]),
            });

            const error = await getFileWithForceAndExport().catch((e) => e);

            expect(error).toMatchObject({ statusCode: 400 });
            expect(error.message).toContain('do not support the get-file `force` parameter');
            expect(error.message).not.toContain(
              'do not support exporting files to external storage'
            );
          });

          it('should report both errors when neither capability is supported', async () => {
            const generator = new EndpointMetadataGenerator('seed');

            applyEsClientSearchMock({
              esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
              index: metadataCurrentIndexPattern,
              response: generator.toEsSearchResponse([
                generator.toEsSearchHit(
                  generator.generate({
                    agent: { version: '9.6.0' },
                    Endpoint: { capabilities: [] },
                  })
                ),
              ]),
            });

            const error = await getFileWithForceAndExport().catch((e) => e);

            expect(error).toMatchObject({ statusCode: 400 });
            expect(error.message).toContain('do not support the get-file `force` parameter');
            expect(error.message).toContain('do not support exporting files to external storage');
          });

          it('should succeed when both capabilities are supported', async () => {
            const generator = new EndpointMetadataGenerator('seed');

            applyEsClientSearchMock({
              esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
              index: metadataCurrentIndexPattern,
              response: generator.toEsSearchResponse([
                generator.toEsSearchHit(
                  generator.generate({
                    elastic: { agent: { id: '1-2-3' } },
                    Endpoint: { capabilities: ['get_file_force', 'file_export'] },
                  })
                ),
              ]),
            });
            setupExportProviderPolicy({
              id: 'provider-1',
              type: 'azure_blob',
              account_name: 'acct',
              container: 'dumps',
            });

            await expect(getFileWithForceAndExport()).resolves.toBeDefined();
          });
        });

        describe('and `paths` is set instead of `path`', () => {
          const getFileWithPathsAndExport = () =>
            endpointActionsClient.getFile(
              createGetFileOptions({ paths: ['/one', '/two'], export: 'provider-1' })
            );

          const mockEndpointCapabilities = (capabilities: EndpointCapabilities[]) => {
            const generator = new EndpointMetadataGenerator('seed');

            applyEsClientSearchMock({
              esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
              index: metadataCurrentIndexPattern,
              response: generator.toEsSearchResponse([
                generator.toEsSearchHit(
                  // Endpoint 9.5/9.6 get multi-path through a backport but not export, so pin a
                  // version whose generated capabilities include neither
                  generator.generate({ agent: { version: '9.6.0' }, Endpoint: { capabilities } })
                ),
              ]),
            });
          };

          it('should reject a host that reports `get_file_multi_path` but not `file_export`', async () => {
            mockEndpointCapabilities(['get_file_multi_path']);

            const error = await getFileWithPathsAndExport().catch((e) => e);

            expect(error).toMatchObject({ statusCode: 400 });
            expect(error.message).toContain(
              'The following agent IDs do not support exporting files to external storage'
            );
            expect(error.message).not.toContain('do not support the get-file `paths` parameter');
          });

          it('should succeed when the host reports both `get_file_multi_path` and `file_export`', async () => {
            mockEndpointCapabilities(['get_file_multi_path', 'file_export']);
            setupExportProviderPolicy({
              id: 'provider-1',
              type: 'azure_blob',
              account_name: 'acct',
              container: 'dumps',
            });

            await expect(getFileWithPathsAndExport()).resolves.toBeDefined();
          });
        });
      });
    });

    it('should succeed without checking capability when `force` is not set', async () => {
      await expect(
        endpointActionsClient.getFile(
          responseActionsClientMock.createGetFileOptions({
            ...getCommonResponseActionOptions(),
            parameters: { path: 'C:\\file.txt' },
          })
        )
      ).resolves.toBeDefined();
    });

    it('should succeed without checking capability when `force` is false', async () => {
      await expect(
        endpointActionsClient.getFile(
          responseActionsClientMock.createGetFileOptions({
            ...getCommonResponseActionOptions(),
            parameters: { path: 'C:\\file.txt', force: false },
          })
        )
      ).resolves.toBeDefined();
    });

    it('should omit `force` from the Fleet action parameters when it is `false`', async () => {
      await endpointActionsClient.getFile(
        responseActionsClientMock.createGetFileOptions({
          ...getCommonResponseActionOptions(),
          parameters: { path: 'C:\\file.txt', force: false },
        })
      );

      expect(
        (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parameters: { path: 'C:\\file.txt' } }),
        })
      );
    });

    it('should only look up the host metadata once when `force` is `true`', async () => {
      const generator = new EndpointMetadataGenerator('seed');

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: metadataCurrentIndexPattern,
        response: generator.toEsSearchResponse([
          generator.toEsSearchHit(
            generator.generate({ Endpoint: { capabilities: ['get_file_force'] } })
          ),
        ]),
      });

      await endpointActionsClient.getFile(
        responseActionsClientMock.createGetFileOptions({
          ...getCommonResponseActionOptions(),
          parameters: { path: 'C:\\file.txt', force: true },
        })
      );

      // The capability check must not re-query the metadata, since a later (post-dispatch) validation
      // that disagrees with the first would leave a dispatched action without a request document.
      expect(
        (classConstructorOptions.esClient.search as jest.Mock).mock.calls.filter(
          ([request]) => request?.index === metadataCurrentIndexPattern
        )
      ).toHaveLength(1);
    });

    it('should send `force` in the Fleet action parameters when it is `true`', async () => {
      const generator = new EndpointMetadataGenerator('seed');

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: metadataCurrentIndexPattern,
        response: generator.toEsSearchResponse([
          generator.toEsSearchHit(
            generator.generate({ Endpoint: { capabilities: ['get_file_force'] } })
          ),
        ]),
      });

      await endpointActionsClient.getFile(
        responseActionsClientMock.createGetFileOptions({
          ...getCommonResponseActionOptions(),
          parameters: { path: 'C:\\file.txt', force: true },
        })
      );

      expect(
        (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parameters: { path: 'C:\\file.txt', force: true },
          }),
        })
      );
    });
  });

  describe('#killProcess()', () => {
    describe('when `kill_descendants` parameter is set to `true`', () => {
      beforeEach(() => {
        // @ts-expect-error mocking this for testing purposes
        classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointKillProcessDescendants =
          true;
      });

      it('should throw error when feature flag is disabled', async () => {
        // @ts-expect-error mocking this for testing purposes
        classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointKillProcessDescendants =
          false;

        await expect(
          endpointActionsClient.killProcess(
            responseActionsClientMock.createKillProcessOptions({
              ...getCommonResponseActionOptions(),
              parameters: { pid: 123, kill_descendants: true },
            })
          )
        ).rejects.toThrow('kill-process `kill_descendants` parameter is not enabled');
      });

      it('should throw error when endpoint does not support `kill_process_descendants` capability', async () => {
        const generator = new EndpointMetadataGenerator('seed');

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
          index: metadataCurrentIndexPattern,
          response: generator.toEsSearchResponse([
            generator.toEsSearchHit(generator.generate({ Endpoint: { capabilities: [] } })),
          ]),
        });

        await expect(
          endpointActionsClient.killProcess(
            responseActionsClientMock.createKillProcessOptions({
              ...getCommonResponseActionOptions(),
              parameters: { pid: 123, kill_descendants: true },
            })
          )
        ).rejects.toMatchObject({
          message: expect.stringContaining(
            'The following agent IDs do not support killing process descendents'
          ),
          statusCode: 400,
        });
      });

      it('should succeed when feature flag is enabled and endpoint supports the capability', async () => {
        const generator = new EndpointMetadataGenerator('seed');

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
          index: metadataCurrentIndexPattern,
          response: generator.toEsSearchResponse([
            generator.toEsSearchHit(
              generator.generate({ Endpoint: { capabilities: ['kill_process_descendants'] } })
            ),
          ]),
        });

        await expect(
          endpointActionsClient.killProcess(
            responseActionsClientMock.createKillProcessOptions({
              ...getCommonResponseActionOptions(),
              parameters: { pid: 123, kill_descendants: true },
            })
          )
        ).resolves.toBeDefined();
      });

      it('should succeed without checking capability when `kill_descendants` is false', async () => {
        // @ts-expect-error mocking this for testing purposes
        classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointKillProcessDescendants =
          false;

        await expect(
          endpointActionsClient.killProcess(
            responseActionsClientMock.createKillProcessOptions({
              ...getCommonResponseActionOptions(),
              parameters: { pid: 123, kill_descendants: false },
            })
          )
        ).resolves.toBeDefined();
      });
    });
  });

  describe('#memoryDump()', () => {
    it('should error when feature flag is false', async () => {
      // @ts-expect-error mocking this for testing purposes
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointMemoryDump =
        false;

      await expect(
        endpointActionsClient.memoryDump(
          responseActionsClientMock.createMemoryDumpActionOption(getCommonResponseActionOptions())
        )
      ).rejects.toThrow('Memory dump operation is not enabled');
    });

    it.each`
      title        | params
      ${'kernel'}  | ${{ type: 'kernel' }}
      ${'raw'}     | ${{ type: 'raw' }}
      ${'process'} | ${{ type: 'process', pid: '123' }}
    `(
      'should validate that agent supports memory dump of $title',
      async ({ params: memoryDumpParameters }) => {
        const generator = new EndpointMetadataGenerator('seed');

        applyEsClientSearchMock({
          esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
          index: metadataCurrentIndexPattern,
          response: generator.toEsSearchResponse([
            generator.toEsSearchHit(generator.generate({ Endpoint: { capabilities: [] } })),
          ]),
        });

        if (memoryDumpParameters.type === 'raw') {
          // @ts-expect-error update of readonly property is ok here
          classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointMemoryDumpRaw =
            true;
        }

        await expect(
          endpointActionsClient.memoryDump(
            responseActionsClientMock.createMemoryDumpActionOption({
              ...getCommonResponseActionOptions(),
              parameters: memoryDumpParameters,
            })
          )
        ).rejects.toThrow(
          'The following agent IDs do not support memory dump: 0dc3661d-6e67-46b0-af39-6f12b025fcb0 (agent v.7.0.13)'
        );
      }
    );

    it('should validate that agent supports memory dump of raw', async () => {
      // @ts-expect-error mocking this for testing purposes
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointMemoryDumpRaw =
        true;

      const generator = new EndpointMetadataGenerator('seed');

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: metadataCurrentIndexPattern,
        response: generator.toEsSearchResponse([
          generator.toEsSearchHit(generator.generate({ Endpoint: { capabilities: [] } })),
        ]),
      });

      await expect(
        endpointActionsClient.memoryDump(
          responseActionsClientMock.createMemoryDumpActionOption({
            ...getCommonResponseActionOptions(),
            parameters: { type: 'raw' },
          })
        )
      ).rejects.toThrow(
        'The following agent IDs do not support memory dump: 0dc3661d-6e67-46b0-af39-6f12b025fcb0 (agent v.7.0.13)'
      );
    });

    it('should error when `raw` type is used but the feature flag is disabled', async () => {
      // @ts-expect-error mocking this for testing purposes
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointMemoryDumpRaw =
        false;

      await expect(
        endpointActionsClient.memoryDump(
          responseActionsClientMock.createMemoryDumpActionOption({
            ...getCommonResponseActionOptions(),
            parameters: { type: 'raw' },
          })
        )
      ).rejects.toThrow('memory-dump `raw` type is not enabled');
    });

    it('should process `raw` memory dump when the agent supports it', async () => {
      // @ts-expect-error mocking this for testing purposes
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointMemoryDumpRaw =
        true;

      const generator = new EndpointMetadataGenerator('seed');

      applyEsClientSearchMock({
        esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
        index: metadataCurrentIndexPattern,
        response: generator.toEsSearchResponse([
          generator.toEsSearchHit(
            generator.generate({ Endpoint: { capabilities: ['memdump_raw'] } })
          ),
        ]),
      });

      await expect(
        endpointActionsClient.memoryDump(
          responseActionsClientMock.createMemoryDumpActionOption({
            ...getCommonResponseActionOptions(),
            parameters: { type: 'raw' },
          })
        )
      ).resolves.toBeDefined();

      expect(
        (await classConstructorOptions.endpointService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            command: 'memory-dump',
            comment: expect.anything(),
            parameters: { type: 'raw' },
          },
        })
      );
    });

    describe('when `export` parameter is set', () => {
      it('should throw error when feature flag is disabled', async () => {
        await expect(
          endpointActionsClient.memoryDump(
            responseActionsClientMock.createMemoryDumpActionOption({
              ...getCommonResponseActionOptions(),
              parameters: { type: 'process', pid: 123, export: 'provider-1' },
            })
          )
        ).rejects.toMatchObject({
          message: 'memory-dump `export` parameter is not enabled',
          statusCode: 400,
        });
      });

      describe('and the feature flag is enabled', () => {
        beforeEach(() => {
          Object.assign(classConstructorOptions.endpointService.experimentalFeatures, {
            responseActionsEndpointFileExport: true,
          });
        });

        it('should throw the `export` capability error when endpoint supports `memdump_process` but not `file_export`', async () => {
          const generator = new EndpointMetadataGenerator('seed');

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
            index: metadataCurrentIndexPattern,
            response: generator.toEsSearchResponse([
              generator.toEsSearchHit(
                generator.generate({
                  agent: { version: '9.6.0' },
                  Endpoint: { capabilities: ['memdump_process'] },
                })
              ),
            ]),
          });

          await expect(
            endpointActionsClient.memoryDump(
              responseActionsClientMock.createMemoryDumpActionOption({
                ...getCommonResponseActionOptions(),
                parameters: { type: 'process', pid: 123, export: 'provider-1' },
              })
            )
          ).rejects.toMatchObject({
            message: expect.stringContaining(
              'The following agent IDs do not support exporting files to external storage'
            ),
            statusCode: 400,
          });
        });

        it('should succeed and keep `export` in the Fleet action and the action request when endpoint supports both `memdump_process` and `file_export`', async () => {
          const generator = new EndpointMetadataGenerator('seed');

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
            index: metadataCurrentIndexPattern,
            response: generator.toEsSearchResponse([
              generator.toEsSearchHit(
                generator.generate({
                  elastic: { agent: { id: '1-2-3' } },
                  Endpoint: { capabilities: ['memdump_process', 'file_export'] },
                })
              ),
            ]),
          });
          setupExportProviderPolicy({
            id: 'provider-1',
            type: 'azure_blob',
            account_name: 'acct',
            container: 'dumps',
          });

          const parameters = { type: 'process' as const, pid: 123, export: 'provider-1' };

          await expect(
            endpointActionsClient.memoryDump(
              responseActionsClientMock.createMemoryDumpActionOption({
                ...getCommonResponseActionOptions(),
                parameters,
              })
            )
          ).resolves.toBeDefined();

          const fleetActionsClient =
            await classConstructorOptions.endpointService.getFleetActionsClient();
          const [fleetActionDoc] = (fleetActionsClient.create as jest.Mock).mock.calls[0];
          const expectedParameters = {
            ...parameters,
            export_path: `${fleetActionDoc.action_id}/upload.zip`,
          };

          expect(fleetActionDoc.data.parameters).toEqual(expectedParameters);
          expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
            expect.objectContaining({
              index: ENDPOINT_ACTIONS_INDEX,
              document: expect.objectContaining({
                EndpointActions: expect.objectContaining({
                  data: expect.objectContaining({ parameters: expectedParameters }),
                }),
              }),
            }),
            expect.anything()
          );
        });

        describeExportCredentials('memory-dump', ['memdump_process', 'file_export'], () =>
          endpointActionsClient.memoryDump(
            responseActionsClientMock.createMemoryDumpActionOption({
              ...getCommonResponseActionOptions(),
              parameters: { type: 'process' as const, pid: 123, export: 'provider-1' },
            })
          )
        );

        it('does not resolve export credentials for an action that does not set `export`', async () => {
          const generator = new EndpointMetadataGenerator('seed');

          applyEsClientSearchMock({
            esClientMock: classConstructorOptions.esClient as ElasticsearchClientMock,
            index: metadataCurrentIndexPattern,
            response: generator.toEsSearchResponse([
              generator.toEsSearchHit(
                generator.generate({ Endpoint: { capabilities: ['memdump_process'] } })
              ),
            ]),
          });

          const getAccountKeySpy = jest.spyOn(
            classConstructorOptions.endpointService.getExportProviderKeyClient(),
            'getAccountKey'
          );

          await endpointActionsClient.memoryDump(
            responseActionsClientMock.createMemoryDumpActionOption({
              ...getCommonResponseActionOptions(),
              parameters: { type: 'process', pid: 123 },
            })
          );

          const fleetActionsClient =
            await classConstructorOptions.endpointService.getFleetActionsClient();
          const [fleetActionDoc] = (fleetActionsClient.create as jest.Mock).mock.calls[0];

          expect(fleetActionDoc.data.parameters).not.toHaveProperty('export_path');
          expect(fleetActionDoc.data).not.toHaveProperty('credentials');
          expect(getAccountKeySpy).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('#cancel()', () => {
    let actionToBeCanceledDetails: ActionDetails;

    beforeEach(() => {
      actionToBeCanceledDetails = new EndpointActionGenerator('seed').generateActionDetails({
        id: 'action-123',
        agents: ['1-2-3'],
        agentType: 'endpoint',
        isCompleted: false,
        command: 'memory-dump',
        agentState: { '1-2-3': { isCompleted: false } },
      });

      getActionDetailsByIdMock.mockResolvedValue(actionToBeCanceledDetails);
    });

    it('should error when feature flag is false', async () => {
      // @ts-expect-error mocking this for testing purposes
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointCancel =
        false;

      await expect(
        endpointActionsClient.cancel(
          responseActionsClientMock.createCancelActionOptions(getCommonResponseActionOptions())
        )
      ).rejects.toThrow('Elastic Defend cancel operation is not enabled');
    });

    it('should process cancel action when feature flag is enabled', async () => {
      await expect(
        endpointActionsClient.cancel(
          responseActionsClientMock.createCancelActionOptions(getCommonResponseActionOptions())
        )
      ).resolves.toBeDefined();
    });

    it('should throw error if action is already complete', async () => {
      actionToBeCanceledDetails.isCompleted = false;
      actionToBeCanceledDetails.agentState = {
        '1-2-3': {
          isCompleted: true,
          wasSuccessful: false,
          wasCanceled: false,
          errors: undefined,
          completedAt: undefined,
        },
      };

      await expect(
        endpointActionsClient.cancel(
          responseActionsClientMock.createCancelActionOptions({
            ...getCommonResponseActionOptions(),
            parameters: { id: 'action-123' },
          })
        )
      ).rejects.toThrow(
        'Action [action-123] is already completed for agent [1-2-3] and cannot be canceled.'
      );
    });

    it('should throw error if action to cancel does not have an agentType of endpoint', async () => {
      actionToBeCanceledDetails.agentType = 'sentinel_one';
      actionToBeCanceledDetails.command = 'runscript';

      await expect(
        endpointActionsClient.cancel(
          responseActionsClientMock.createCancelActionOptions({
            ...getCommonResponseActionOptions(),
            parameters: { id: 'action-123' },
          })
        )
      ).rejects.toThrow(
        "Action [action-123 / runscript / sentinel_one] agent type is not 'endpoint'"
      );
    });

    it('should throw error if agent ID is not part of action to be canceled', async () => {
      actionToBeCanceledDetails.agents = ['some-other-id'];

      await expect(
        endpointActionsClient.cancel(
          responseActionsClientMock.createCancelActionOptions({
            ...getCommonResponseActionOptions(),
            parameters: { id: 'action-123' },
          })
        )
      ).rejects.toThrow('Endpoint [1-2-3] is not associated with action [action-123]');
    });

    it('should throw error if response action command is not cancelable', async () => {
      actionToBeCanceledDetails.command = 'cancel';

      await expect(
        endpointActionsClient.cancel(
          responseActionsClientMock.createCancelActionOptions({
            ...getCommonResponseActionOptions(),
            parameters: { id: 'action-123' },
          })
        )
      ).rejects.toThrow('[cancel] response action cannot be canceled.');
    });
  });

  describe('#runscript()', () => {
    it('should error if feature flag is disabled', async () => {
      // @ts-expect-error mocking this for testing purposes
      classConstructorOptions.endpointService.experimentalFeatures.responseActionsEndpointRunScript =
        false;

      await expect(
        endpointActionsClient.runscript(endpointActionClientMock.createRunScriptOptions())
      ).rejects.toThrow('Elastic Defend runscript operation is not enabled');
    });

    it('should error if script ID does not exist', async () => {
      (
        classConstructorOptions.endpointService.getScriptsLibraryClient('', '').get as jest.Mock
      ).mockRejectedValueOnce(new Error('not found'));

      await expect(
        endpointActionsClient.runscript(
          endpointActionClientMock.createRunScriptOptions({
            parameters: { scriptId: 'non-existent-script-id' },
          })
        )
      ).rejects.toThrow('not found');
    });

    it('should error if script requires input args but none were provided', async () => {
      (
        classConstructorOptions.endpointService.getScriptsLibraryClient('', '').get as jest.Mock
      ).mockResolvedValue(ScriptsLibraryMock.generateScriptEntry({ requiresInput: true }));

      await expect(
        endpointActionsClient.runscript(
          endpointActionClientMock.createRunScriptOptions({
            parameters: { scriptId: 'script-with-args' },
          })
        )
      ).rejects.toThrow('The script [script one] requires arguments to be specified.');
    });

    it('should store script info in action request doc `meta` property', async () => {
      await expect(
        endpointActionsClient.runscript(
          endpointActionClientMock.createRunScriptOptions({
            parameters: { scriptId: 'script-with-args' },
          })
        )
      ).resolves.toEqual(expect.any(Object));

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            meta: {
              file_sha256: 'e5441eb2bb',
              file_id: 'file-1-2-3',
              file_name: 'my_script.sh',
              file_size: 12098,
              path_to_executable: undefined,
            },
          }),
        }),
        expect.anything()
      );
    });

    it('should send user defined `timeout` value to endpoint', async () => {
      await expect(
        endpointActionsClient.runscript(
          endpointActionClientMock.createRunScriptOptions({
            parameters: { scriptId: 'script-with-args', timeout: 123456 },
          })
        )
      ).resolves.toEqual(expect.any(Object));

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            EndpointActions: expect.objectContaining({
              data: expect.objectContaining({
                parameters: expect.objectContaining({ timeout: 123456 }),
              }),
            }),
          }),
        }),
        expect.anything()
      );
    });

    it('should include a default `timeout` if one is not provided', async () => {
      await expect(
        endpointActionsClient.runscript(
          endpointActionClientMock.createRunScriptOptions({
            parameters: { scriptId: 'script-with-args', timeout: 0 },
          })
        )
      ).resolves.toEqual(expect.any(Object));

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            EndpointActions: expect.objectContaining({
              data: expect.objectContaining({
                parameters: expect.objectContaining({ timeout: DEFAULT_EXECUTE_ACTION_TIMEOUT }),
              }),
            }),
          }),
        }),
        expect.anything()
      );
    });
  });

  describe('#getCustomScripts()', () => {
    it.each(['responseActionsEndpointRunScript', 'responseActionsScriptLibraryManagement'])(
      'should error if feature flag [%s] is disabled',
      async (featureFlag) => {
        // @ts-expect-error mocking this for testing purposes
        classConstructorOptions.endpointService.experimentalFeatures[featureFlag] = false;

        await expect(endpointActionsClient.getCustomScripts()).rejects.toThrow(
          `Elastic Defend runscript operation is not enabled`
        );
      }
    );

    it('should return list of scripts', async () => {
      const expectedScriptResponse = ScriptsLibraryMock.generateScriptEntry();

      await expect(endpointActionsClient.getCustomScripts()).resolves.toEqual({
        data: [
          {
            id: expectedScriptResponse.id,
            name: expectedScriptResponse.name,
            description: expectedScriptResponse.description ?? '',
            meta: expectedScriptResponse,
          },
        ],
      });
    });

    it('should support filtering by OS Type', async () => {
      await expect(endpointActionsClient.getCustomScripts({ osType: 'linux' })).resolves.toEqual(
        expect.any(Object)
      );

      expect(
        classConstructorOptions.endpointService.getScriptsLibraryClient('', '').list as jest.Mock
      ).toHaveBeenCalledWith({
        kuery: 'platform: "linux"',
        pageSize: 10000,
        sortDirection: 'asc',
        sortField: 'name',
      });
    });
  });

  describe('and Space Awareness is enabled', () => {
    beforeEach(() => {
      getActionDetailsByIdMock.mockResolvedValue({});
    });

    afterEach(() => {
      getActionDetailsByIdMock.mockReset();
    });

    it('should write action request with agent policy info when space awareness is enabled', async () => {
      await endpointActionsClient.isolate(
        responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
      );

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
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

    it.each(responseActionsClientMock.getClientSupportedResponseActionMethodNames('endpoint'))(
      'should error when %s is called with agents not valid for active space',
      async (methodName) => {
        (
          classConstructorOptions.endpointService.getInternalFleetServices().agent
            .getByIds as jest.Mock
        ).mockImplementation(async () => {
          throw new AgentNotFoundError('Agent some-id not found');
        });
        getActionDetailsByIdMock.mockResolvedValue(
          new EndpointActionGenerator('seed').generateActionDetails({
            agents: ['1-2-3'],
            isCompleted: false,
            agentType: 'endpoint',
            command: 'runscript',
            agentState: { '1-2-3': { isCompleted: false } },
          })
        );
        const options = responseActionsClientMock.getOptionsForResponseActionMethod(methodName);

        // @ts-expect-error `options` type is too broad because we're getting it from a helper
        await expect(endpointActionsClient[methodName](options)).rejects.toThrow(
          'Agent some-id not found'
        );
        expect(
          (await classConstructorOptions.endpointService.getFleetActionsClient()).create
        ).not.toHaveBeenCalled();
      }
    );

    it('should create failed action request for automated response actions', async () => {
      classConstructorOptions.isAutomated = true;
      // @ts-expect-error mocking this for testing purposes
      endpointActionsClient.checkAgentIds = jest.fn().mockResolvedValueOnce({
        isValid: false,
        valid: [],
        invalid: ['invalid-id'],
        hosts: [{ agent: { id: 'invalid-id', name: '' }, host: { hostname: '' } }],
      });

      await endpointActionsClient.isolate(
        responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
      );

      expect(classConstructorOptions.esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            agent: { id: [], policy: [] },
            tags: [ALLOWED_ACTION_REQUEST_TAGS.integrationPolicyDeleted],
          }),
        }),
        expect.anything()
      );
    });

    it('should return action details for failed automated response actions even when no valid agents', async () => {
      classConstructorOptions.isAutomated = true;
      // @ts-expect-error mocking this for testing purposes
      endpointActionsClient.checkAgentIds = jest.fn().mockResolvedValueOnce({
        isValid: false,
        valid: [],
        invalid: ['invalid-id'],
        hosts: [{ agent: { id: 'invalid-id', name: '' }, host: { hostname: '' } }],
      });

      await endpointActionsClient.isolate(
        responseActionsClientMock.createIsolateOptions(getCommonResponseActionOptions())
      );

      expect(getActionDetailsByIdMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        { bypassSpaceValidation: true }
      );
    });
  });
});
