/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { securityServiceMock } from '@kbn/core/server/mocks';
import type { SecurityStartMock } from '@kbn/core-security-server-mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { PackagePolicyNotFoundError } from '@kbn/fleet-plugin/server/errors';
import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type {
  SetExportProviderKeyRequestBody,
  SetExportProviderKeyRequestParams,
} from '../../../../common/api/endpoint';
import { EXPORT_PROVIDER_KEY_ROUTE } from '../../../../common/endpoint/constants';
import { setExportProviders } from '../../../../common/endpoint/models/export_providers';
import { getPolicyDataForUpdate } from '../../../../common/endpoint/service/policy';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { ExportProvider, PolicyData } from '../../../../common/endpoint/types';
import { NotFoundError, EndpointAuthorizationError } from '../../errors';
import type { ExportProviderKeyClientInterface } from '../../lib/export_provider_keys';
import {
  EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
  EXPORT_PROVIDER_KEY_SET_AUDIT_ACTION,
} from '../../lib/export_provider_keys';
import type { EndpointInternalFleetServicesInterfaceMocked } from '../../services/fleet/endpoint_fleet_services_factory.mocks';
import { registerSetExportProviderKeyRoute } from './export_provider_key';

type Params = SetExportProviderKeyRequestParams;
type Body = SetExportProviderKeyRequestBody;
type MockedKeyClient = jest.Mocked<ExportProviderKeyClientInterface>;
type MockedFleetServices = EndpointInternalFleetServicesInterfaceMocked;

const PACKAGE_POLICY_ID = 'package-policy-1';
const POLICY_VERSION = 'WzQsMV0=';
const PROVIDER_1_ID = 'azure-1';
const NEW_KEY_ID = 'new-key-id';
/** 86 base64 characters followed by `==`: matches the real Azure storage account key shape */
const VALID_KEY = `${'A'.repeat(86)}==`;

const provider1: ExportProvider = {
  id: PROVIDER_1_ID,
  type: 'azure_blob',
  account_name: 'acct1',
  container: 'dumps1',
};

const provider2: ExportProvider = {
  id: 'azure-2',
  type: 'azure_blob',
  account_name: 'acct2',
  container: 'dumps2',
};

const packagePolicyGenerator = new FleetPackagePolicyGenerator('export-provider-key-route-tests');

const buildPolicy = (providers: ExportProvider[]): PolicyData => {
  const policy = packagePolicyGenerator.generateEndpointPackagePolicy({
    id: PACKAGE_POLICY_ID,
    version: POLICY_VERSION,
  });

  policy.inputs[0].config.policy.value = setExportProviders(
    policy.inputs[0].config.policy.value,
    providers
  );

  return policy;
};

/**
 * Stringifies a mock call argument, resolving lazy logger callbacks and pulling `message` out of
 * `Error` instances (whose own properties are not enumerable, so `JSON.stringify` alone misses it).
 * Used to assert the plaintext key never reaches a logger, an audit event or an HTTP response.
 */
const serializeForKeyCheck = (value: unknown): string => {
  if (typeof value === 'function') {
    return serializeForKeyCheck((value as () => unknown)());
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  if (Array.isArray(value)) {
    return value.map(serializeForKeyCheck).join(' ');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => `${key}=${serializeForKeyCheck(entryValue)}`)
      .join(' ');
  }
  return String(value);
};

describe('PUT export provider key route', () => {
  let apiTestSetup: HttpApiTestSetupMock<Params, never, Body>;
  let httpRequestMock: ReturnType<HttpApiTestSetupMock<Params, never, Body>['createRequestMock']>;
  let httpHandlerContextMock: HttpApiTestSetupMock<Params, never, Body>['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<Params, never, Body>['httpResponseMock'];
  let basePolicy: PolicyData;
  let securityMock: SecurityStartMock;
  let keyClient: MockedKeyClient;
  let fleetServices: MockedFleetServices;

  const callRoute = async (): Promise<void> => {
    await apiTestSetup
      .getRegisteredVersionedRoute('put', EXPORT_PROVIDER_KEY_ROUTE, '1')
      .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);
  };

  const getAllLoggedText = (): string => {
    // `createLogger()` returns a logger sharing the same underlying mock functions regardless of
    // the context name passed to it, so this one call also observes what the handler itself logs.
    const logger = apiTestSetup.endpointAppContextMock.service.createLogger() as MockedLogger;
    const auditLogger = securityMock.audit.asScoped(httpRequestMock);

    return [
      ...logger.debug.mock.calls,
      ...logger.info.mock.calls,
      ...logger.warn.mock.calls,
      ...logger.error.mock.calls,
      ...auditLogger.log.mock.calls,
      ...httpResponseMock.ok.mock.calls,
      ...httpResponseMock.customError.mock.calls,
      ...httpResponseMock.notFound.mock.calls,
      ...httpResponseMock.forbidden.mock.calls,
      ...httpResponseMock.badRequest.mock.calls,
    ]
      .flat()
      .map(serializeForKeyCheck)
      .join('\n');
  };

  beforeEach(() => {
    apiTestSetup = createHttpApiTestSetupMock<Params, never, Body>();
    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);

    apiTestSetup.endpointAppContextMock.experimentalFeatures = {
      ...apiTestSetup.endpointAppContextMock.experimentalFeatures,
      responseActionsEndpointFileExport: true,
    };

    httpRequestMock = apiTestSetup.createRequestMock({
      params: { package_policy_id: PACKAGE_POLICY_ID, provider_id: PROVIDER_1_ID },
      body: {
        type: 'account_key',
        account_key: VALID_KEY,
        package_policy_version: POLICY_VERSION,
      },
    });

    basePolicy = buildPolicy([provider1, provider2]);

    securityMock = securityServiceMock.createStart();
    securityMock.authc.getCurrentUser.mockReturnValue(
      securityServiceMock.createMockAuthenticatedUser({ username: 'analyst' })
    );
    apiTestSetup.endpointAppContextMock.service.security = securityMock;

    (
      apiTestSetup.endpointAppContextMock.service.getLicenseService().isAtLeast as jest.Mock
    ).mockReturnValue(true);

    keyClient =
      apiTestSetup.endpointAppContextMock.service.getExportProviderKeyClient() as MockedKeyClient;
    keyClient.isEncryptionAvailable.mockReturnValue(true);
    keyClient.createAccountKey.mockResolvedValue(NEW_KEY_ID);

    fleetServices =
      apiTestSetup.endpointAppContextMock.service.getInternalFleetServices() as MockedFleetServices;
    fleetServices.ensureInCurrentSpace.mockResolvedValue(undefined);
    fleetServices.packagePolicy.get.mockResolvedValue(basePolicy);
    fleetServices.packagePolicy.update.mockResolvedValue(basePolicy);

    registerSetExportProviderKeyRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
  });

  it('does not register the route when the feature flag is off', () => {
    apiTestSetup.endpointAppContextMock.experimentalFeatures = {
      ...apiTestSetup.endpointAppContextMock.experimentalFeatures,
      responseActionsEndpointFileExport: false,
    };
    apiTestSetup.routerMock.versioned.put.mockClear();

    registerSetExportProviderKeyRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);

    expect(apiTestSetup.routerMock.versioned.put).not.toHaveBeenCalled();
  });

  it('responds with forbidden when the user lacks canWritePolicyManagement', async () => {
    apiTestSetup.setEndpointAuthz({ canWritePolicyManagement: false });

    await callRoute();

    expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
      body: expect.any(EndpointAuthorizationError),
    });
    expect(fleetServices.packagePolicy.get).not.toHaveBeenCalled();
  });

  describe('happy path', () => {
    let updatedPolicy: PolicyData;

    beforeEach(() => {
      updatedPolicy = buildPolicy([
        { ...provider1, credentials: { type: 'account_key', key_id: NEW_KEY_ID } },
        provider2,
      ]);
      fleetServices.packagePolicy.update.mockResolvedValue(updatedPolicy);
    });

    it('creates the key, updates only the targeted provider and returns the updated policy', async () => {
      await callRoute();

      expect(keyClient.createAccountKey).toHaveBeenCalledWith({
        packagePolicyId: PACKAGE_POLICY_ID,
        accountName: provider1.account_name,
        accountKey: VALID_KEY,
      });

      const expectedUpdate = getPolicyDataForUpdate(basePolicy);
      expectedUpdate.version = POLICY_VERSION;
      expectedUpdate.inputs[0].config.policy.value = setExportProviders(
        expectedUpdate.inputs[0].config.policy.value,
        [{ ...provider1, credentials: { type: 'account_key', key_id: NEW_KEY_ID } }, provider2]
      );

      expect(fleetServices.packagePolicy.update).toHaveBeenCalledTimes(1);
      expect(fleetServices.packagePolicy.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        PACKAGE_POLICY_ID,
        expectedUpdate,
        { user: securityMock.authc.getCurrentUser(httpRequestMock) }
      );

      expect(httpResponseMock.ok).toHaveBeenCalledWith({ body: { item: updatedPolicy } });
    });

    it('logs a success audit event naming the new key', async () => {
      await callRoute();

      expect(securityMock.audit.asScoped(httpRequestMock).log).toHaveBeenCalledWith({
        message: `User set the storage account key of export provider [id=${PROVIDER_1_ID}] in Elastic Defend policy [id=${PACKAGE_POLICY_ID}]: key [id=${NEW_KEY_ID}]`,
        event: {
          action: EXPORT_PROVIDER_KEY_SET_AUDIT_ACTION,
          category: ['database'],
          type: ['creation'],
          outcome: 'success',
        },
        kibana: {
          saved_object: { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id: NEW_KEY_ID },
        },
      });
    });

    it('never logs, audits or returns the plaintext key', async () => {
      await callRoute();

      expect(getAllLoggedText()).not.toContain(VALID_KEY);
    });
  });

  it('rejects a key with the wrong format with a 400 and creates no key object', async () => {
    httpRequestMock.body = { ...httpRequestMock.body, account_key: 'not-a-valid-key' };

    await callRoute();

    expect(httpResponseMock.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: expect.objectContaining({
        message: `account_key must be the storage account's access key (88 characters, base64)`,
      }),
    });
    expect(keyClient.createAccountKey).not.toHaveBeenCalled();
    expect(securityMock.audit.asScoped(httpRequestMock).log).toHaveBeenCalledWith(
      expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
    );
  });

  it('responds with 404 when the provider id is not in the policy', async () => {
    httpRequestMock.params = {
      package_policy_id: PACKAGE_POLICY_ID,
      provider_id: 'does-not-exist',
    };

    await callRoute();

    expect(httpResponseMock.notFound).toHaveBeenCalledWith({
      body: expect.objectContaining({
        message: `Export provider [does-not-exist] not found in Elastic Defend policy [${PACKAGE_POLICY_ID}]`,
      }),
    });
    expect(keyClient.createAccountKey).not.toHaveBeenCalled();
  });

  it('responds with 404 when the package policy does not exist', async () => {
    fleetServices.packagePolicy.get.mockResolvedValue(null);

    await callRoute();

    expect(httpResponseMock.notFound).toHaveBeenCalledWith({
      body: expect.objectContaining({
        message: `Elastic Defend policy [${PACKAGE_POLICY_ID}] not found`,
      }),
    });
  });

  it('responds with 404 when the package policy exists but is not an Endpoint policy', async () => {
    fleetServices.packagePolicy.get.mockResolvedValue({
      ...basePolicy,
      package: { name: 'not-endpoint', title: 'Other', version: '1.0.0' },
    });

    await callRoute();

    expect(httpResponseMock.notFound).toHaveBeenCalledWith({
      body: expect.objectContaining({
        message: `Elastic Defend policy [${PACKAGE_POLICY_ID}] not found`,
      }),
    });
  });

  it('responds with 404 when the policy is not visible in the current space', async () => {
    fleetServices.ensureInCurrentSpace.mockRejectedValue(
      new NotFoundError(`Integration policy ID(s) not found: [${PACKAGE_POLICY_ID}]`)
    );

    await callRoute();

    expect(httpResponseMock.notFound).toHaveBeenCalledWith({
      body: expect.objectContaining({
        message: `Elastic Defend policy [${PACKAGE_POLICY_ID}] not found`,
      }),
    });
  });

  it('responds with 403 when the license is below Enterprise', async () => {
    const licenseService = apiTestSetup.endpointAppContextMock.service.getLicenseService();

    (licenseService.isAtLeast as jest.Mock).mockReturnValue(false);
    (licenseService.getLicenseInformation as jest.Mock).mockReturnValue(
      licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } })
    );

    await callRoute();

    expect(httpResponseMock.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: expect.objectContaining({
        message: 'Platinum license does not support this action. Please upgrade your license.',
      }),
    });
    expect(securityMock.audit.asScoped(httpRequestMock).log).toHaveBeenCalledWith(
      expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
    );
  });

  it('responds with 403 when the serverless product feature is disabled', async () => {
    jest
      .spyOn(apiTestSetup.endpointAppContextMock.service.getProductFeaturesService(), 'isEnabled')
      .mockReturnValue(false);

    await callRoute();

    expect(httpResponseMock.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: expect.objectContaining({
        message: 'To configure export providers, you must add Endpoint Complete to your project.',
      }),
    });
  });

  it('responds with 400 when encryption is unavailable', async () => {
    keyClient.isEncryptionAvailable.mockReturnValue(false);

    await callRoute();

    expect(httpResponseMock.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: expect.objectContaining({
        message: `Kibana can't store the key: set xpack.encryptedSavedObjects.encryptionKey`,
      }),
    });
    expect(keyClient.createAccountKey).not.toHaveBeenCalled();
  });

  it('responds with 409 and creates no key object when the policy version is stale', async () => {
    fleetServices.packagePolicy.get.mockResolvedValue({
      ...basePolicy,
      version: 'a-different-version',
    });

    await callRoute();

    expect(httpResponseMock.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: expect.objectContaining({
        message: 'The policy changed since you opened it; reload and enter the key again',
      }),
    });
    expect(keyClient.createAccountKey).not.toHaveBeenCalled();
  });

  it('responds with 409 on a concurrent update conflict and does not delete the created key', async () => {
    fleetServices.packagePolicy.update.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError('ingest-package-policies', PACKAGE_POLICY_ID)
    );

    await callRoute();

    expect(keyClient.createAccountKey).toHaveBeenCalled();
    expect(keyClient.deleteKeys).not.toHaveBeenCalled();
    expect(httpResponseMock.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: expect.objectContaining({
        message: 'The policy changed since you opened it; reload and enter the key again',
      }),
    });
    expect(securityMock.audit.asScoped(httpRequestMock).log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(`key [id=${NEW_KEY_ID}] was created`),
        event: expect.objectContaining({ outcome: 'failure' }),
      })
    );
  });

  it.each<[string, () => Error]>([
    [
      'a saved-objects not-found error',
      () =>
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          'ingest-package-policies',
          PACKAGE_POLICY_ID
        ),
    ],
    [
      "Fleet's PackagePolicyNotFoundError",
      () =>
        new PackagePolicyNotFoundError(`Package policy '${PACKAGE_POLICY_ID}' not found`, {
          packagePolicyId: PACKAGE_POLICY_ID,
        }),
    ],
  ])(
    'responds with 404 and does not delete the created key when the update throws %s',
    async (_, buildError) => {
      fleetServices.packagePolicy.update.mockRejectedValue(buildError());

      await callRoute();

      expect(keyClient.createAccountKey).toHaveBeenCalled();
      expect(keyClient.deleteKeys).not.toHaveBeenCalled();
      expect(httpResponseMock.notFound).toHaveBeenCalledWith({
        body: expect.objectContaining({
          message: `Elastic Defend policy [${PACKAGE_POLICY_ID}] not found`,
        }),
      });
      expect(securityMock.audit.asScoped(httpRequestMock).log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(`key [id=${NEW_KEY_ID}] was created`),
          event: expect.objectContaining({ outcome: 'failure' }),
        })
      );
    }
  );

  it('passes through a callback error with apiPassThrough and a numeric statusCode', async () => {
    const callbackError = Object.assign(
      new Error(`Package policy overrides can't set response_actions`),
      { apiPassThrough: true, statusCode: 400 }
    );

    fleetServices.packagePolicy.update.mockRejectedValue(callbackError);

    await callRoute();

    expect(httpResponseMock.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: expect.objectContaining({
        message: `Package policy overrides can't set response_actions`,
      }),
    });
  });
});
