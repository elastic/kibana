/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import { registerExportProvidersRoute } from './export_providers_handler';
import { registerActionRoutes } from '.';
import { EXPORT_PROVIDERS_ROUTE } from '../../../../common/endpoint/constants';
import { EndpointHostNotFoundError } from '../../services/metadata';
import { NotFoundError } from '../../errors';
import { EndpointMetadataGenerator } from '../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { FleetAgentGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_generator';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { setExportProviders } from '../../../../common/endpoint/models/export_providers';
import type { ExportProvider } from '../../../../common/endpoint/types';

const AGENT_ID = 'fleet-agent-1';
const AGENT_POLICY_ID = 'agent-policy-1';

describe('export_providers_handler', () => {
  let testSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<HttpApiTestSetupMock['createRequestMock']>;
  let httpHandlerContextMock: HttpApiTestSetupMock['httpHandlerContextMock'];
  let httpResponseMock: jest.Mocked<KibanaResponseFactory>;
  let callHandler: () => ReturnType<RequestHandler>;
  let getMetadataForEndpointsMock: jest.Mock;
  let packagePolicyListMock: jest.Mock;

  beforeEach(() => {
    testSetup = createHttpApiTestSetupMock();
    ({ httpHandlerContextMock, httpResponseMock } = testSetup);

    httpRequestMock = testSetup.createRequestMock({ query: { agentId: AGENT_ID } });

    getMetadataForEndpointsMock = jest.fn().mockResolvedValue([
      new EndpointMetadataGenerator('seed').generate({
        elastic: { agent: { id: AGENT_ID } },
      }),
    ]);
    (
      testSetup.endpointAppContextMock.service.getEndpointMetadataService as jest.Mock
    ).mockReturnValue({
      getMetadataForEndpoints: getMetadataForEndpointsMock,
    });

    const fleetServices =
      testSetup.endpointAppContextMock.service.getInternalFleetServices('default');
    (fleetServices.fetchAgentsById as jest.Mock).mockResolvedValue([
      new FleetAgentGenerator('seed').generate({ id: AGENT_ID, policy_id: AGENT_POLICY_ID }),
    ]);

    packagePolicyListMock = fleetServices.packagePolicy.list as jest.Mock;
    packagePolicyListMock.mockResolvedValue({
      items: [
        new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
          policy_ids: [AGENT_POLICY_ID],
        }),
      ],
      page: 1,
      perPage: 10_000,
      total: 1,
    });

    registerExportProvidersRoute(testSetup.routerMock, testSetup.endpointAppContextMock);

    const { routeHandler } = testSetup.getRegisteredVersionedRoute(
      'get',
      EXPORT_PROVIDERS_ROUTE,
      '1'
    );
    callHandler = () => routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when the user only has canWriteFileOperations', async () => {
    testSetup.setEndpointAuthz({ canWriteFileOperations: true, canWriteExecuteOperations: false });

    await callHandler();

    expect(httpResponseMock.ok).toHaveBeenCalled();
  });

  it('returns 200 when the user only has canWriteExecuteOperations', async () => {
    testSetup.setEndpointAuthz({ canWriteFileOperations: false, canWriteExecuteOperations: true });

    await callHandler();

    expect(httpResponseMock.ok).toHaveBeenCalled();
  });

  it('returns 403 when the user has neither privilege', async () => {
    testSetup.setEndpointAuthz({
      canWriteFileOperations: false,
      canWriteExecuteOperations: false,
    });

    await callHandler();

    expect(httpResponseMock.forbidden).toHaveBeenCalled();
  });

  it('returns 404 for an unknown agent', async () => {
    getMetadataForEndpointsMock.mockResolvedValue([]);

    await callHandler();

    expect(httpResponseMock.notFound).toHaveBeenCalledWith({
      body: expect.any(EndpointHostNotFoundError),
    });
  });

  it('returns 404 for an agent enrolled in another space', async () => {
    getMetadataForEndpointsMock.mockRejectedValue(
      new NotFoundError(`Agent ID(s) not found: [${AGENT_ID}]`)
    );

    await callHandler();

    expect(httpResponseMock.notFound).toHaveBeenCalledWith({
      body: expect.any(NotFoundError),
    });
  });

  it('returns 200 with an empty list when the policy has no export providers', async () => {
    await callHandler();

    expect(httpResponseMock.ok).toHaveBeenCalledWith({ body: { data: [] } });
  });

  it('returns only id, type, account_name and container, even when the stored provider carries extra fields', async () => {
    const provider: ExportProvider = {
      id: 'azure-1',
      type: 'azure_blob',
      account_name: 'acct',
      container: 'dumps',
    };
    const providerWithExtras = {
      ...provider,
      service_url: 'https://acct.blob.core.windows.net',
      credentials: { account_key: { isSecretRef: true, id: 'x' } },
      foo: 'bar',
    };
    const packagePolicy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
      policy_ids: [AGENT_POLICY_ID],
    });
    packagePolicy.inputs[0].config.policy.value = setExportProviders(
      packagePolicy.inputs[0].config.policy.value,
      [providerWithExtras]
    );
    packagePolicyListMock.mockResolvedValue({
      items: [packagePolicy],
      page: 1,
      perPage: 10_000,
      total: 1,
    });

    await callHandler();

    expect(httpResponseMock.ok).toHaveBeenCalledWith({
      body: { data: [provider] },
    });
  });
});

describe('export_providers_handler registration via registerActionRoutes()', () => {
  it('does not register the export providers route when the feature flag is off', () => {
    const testSetup = createHttpApiTestSetupMock();

    registerActionRoutes(testSetup.routerMock, testSetup.endpointAppContextMock);

    expect(() =>
      testSetup.getRegisteredVersionedRoute('get', EXPORT_PROVIDERS_ROUTE, '1')
    ).toThrow();
  });

  it('registers the export providers route when the feature flag is on', () => {
    const testSetup = createHttpApiTestSetupMock();
    Object.assign(testSetup.endpointAppContextMock.experimentalFeatures, {
      responseActionsEndpointFileExport: true,
    });

    registerActionRoutes(testSetup.routerMock, testSetup.endpointAppContextMock);

    expect(() =>
      testSetup.getRegisteredVersionedRoute('get', EXPORT_PROVIDERS_ROUTE, '1')
    ).not.toThrow();
  });
});
