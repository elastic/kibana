/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import type { AuditEvent, RequestHandler } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import type {
  SetExportProviderKeyRequestBody,
  SetExportProviderKeyRequestParams,
  SetExportProviderKeyResponse,
} from '../../../../common/api/endpoint';
import { SetExportProviderKeyRequestSchema } from '../../../../common/api/endpoint';
import { EXPORT_PROVIDER_KEY_ROUTE } from '../../../../common/endpoint/constants';
import {
  getExportProviders,
  setExportProviders,
} from '../../../../common/endpoint/models/export_providers';
import { getPolicyDataForUpdate } from '../../../../common/endpoint/service/policy';
import { getExportProviderAccountKeyError } from '../../../../common/endpoint/service/response_actions/export_providers';
import type {
  ExportProviderAccountKeyReference,
  PolicyData,
} from '../../../../common/endpoint/types';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import { NotFoundError } from '../../errors';
import {
  EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
  EXPORT_PROVIDER_KEY_SET_AUDIT_ACTION,
} from '../../lib/export_provider_keys';
import type { EndpointAppContext } from '../../types';
import { errorHandler } from '../error_handler';
import { withEndpointAuthz } from '../with_endpoint_authz';

/** Same text used for the version precondition and for a conflict raised during the update itself. */
const POLICY_CHANGED_MESSAGE =
  'The policy changed since you opened it; reload and enter the key again';

/** A package policy update callback error that Fleet rethrows instead of swallowing. */
type ApiPassThroughError = Error & { apiPassThrough: true; statusCode: number };

const isApiPassThroughError = (error: unknown): error is ApiPassThroughError =>
  typeof error === 'object' &&
  error !== null &&
  'apiPassThrough' in error &&
  Boolean(error.apiPassThrough) &&
  'statusCode' in error &&
  typeof error.statusCode === 'number';

const createPolicyNotFoundError = (packagePolicyId: string): NotFoundError =>
  new NotFoundError(`Elastic Defend policy [${packagePolicyId}] not found`);

const createKeySetSuccessAuditEvent = ({
  providerId,
  packagePolicyId,
  keyId,
}: {
  providerId: string;
  packagePolicyId: string;
  keyId: string;
}): AuditEvent => ({
  message: `User set the storage account key of export provider [id=${providerId}] in Elastic Defend policy [id=${packagePolicyId}]: key [id=${keyId}]`,
  event: {
    action: EXPORT_PROVIDER_KEY_SET_AUDIT_ACTION,
    category: ['database'],
    type: ['creation'],
    outcome: 'success',
  },
  kibana: {
    saved_object: { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id: keyId },
  },
});

const createKeySetFailureAuditEvent = ({
  providerId,
  packagePolicyId,
  keyId,
  error,
}: {
  providerId: string;
  packagePolicyId: string;
  /** Set only when the key object had already been created before the failure */
  keyId: string | undefined;
  error: Error;
}): AuditEvent => ({
  message: `Failed attempt to set the storage account key of export provider [id=${providerId}] in Elastic Defend policy [id=${packagePolicyId}]${
    keyId ? `: key [id=${keyId}] was created` : ''
  }`,
  event: {
    action: EXPORT_PROVIDER_KEY_SET_AUDIT_ACTION,
    category: ['database'],
    type: ['creation'],
    outcome: 'failure',
  },
  ...(keyId
    ? { kibana: { saved_object: { type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE, id: keyId } } }
    : {}),
  error: { code: error.name, message: error.message },
});

export const getSetExportProviderKeyHandler = (
  endpointAppContextServices: EndpointAppContextService
): RequestHandler<
  SetExportProviderKeyRequestParams,
  never,
  SetExportProviderKeyRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppContextServices.createLogger('setExportProviderKeyHandler');

  return async (context, request, response) => {
    const { package_policy_id: packagePolicyId, provider_id: providerId } = request.params;
    // Set once the key object has been created, so a failure audit after that point can name it.
    let createdKeyId: string | undefined;

    try {
      logger.debug(
        () =>
          `Setting the storage account key of export provider [id=${providerId}] in Elastic Defend policy [id=${packagePolicyId}]`
      );

      const licenseService = endpointAppContextServices.getLicenseService();

      if (!licenseService.isAtLeast('enterprise')) {
        throw new CustomHttpRequestError(
          `${capitalize(
            licenseService.getLicenseInformation()?.type || 'current'
          )} license does not support this action. Please upgrade your license.`,
          403
        );
      }

      if (
        !endpointAppContextServices
          .getProductFeaturesService()
          .isEnabled(ProductFeatureSecurityKey.endpointResponseActions)
      ) {
        throw new CustomHttpRequestError(
          'To configure export providers, you must add Endpoint Complete to your project.',
          403
        );
      }

      const keyClient = endpointAppContextServices.getExportProviderKeyClient();

      if (!keyClient.isEncryptionAvailable()) {
        throw new CustomHttpRequestError(
          `Kibana can't store the key: set xpack.encryptedSavedObjects.encryptionKey`,
          400
        );
      }

      const spaceId = (await context.securitySolution).getSpaceId();
      const fleetServices = endpointAppContextServices.getInternalFleetServices(spaceId);

      let packagePolicy: PackagePolicy | null;

      try {
        packagePolicy = await fleetServices.packagePolicy.get(
          fleetServices.getSoClient(),
          packagePolicyId
        );
      } catch (error) {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          throw createPolicyNotFoundError(packagePolicyId);
        }

        throw error;
      }

      if (!packagePolicy || packagePolicy.package?.name !== 'endpoint') {
        throw createPolicyNotFoundError(packagePolicyId);
      }

      try {
        // Fleet space awareness may be off, in which case the scoped SO client above does not
        // actually filter by space; this is the check that still rejects a policy outside it.
        await fleetServices.ensureInCurrentSpace({ integrationPolicyIds: [packagePolicyId] });
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw createPolicyNotFoundError(packagePolicyId);
        }

        throw error;
      }

      const policy = packagePolicy as PolicyData;

      if (policy.version !== request.body.package_policy_version) {
        throw new CustomHttpRequestError(POLICY_CHANGED_MESSAGE, 409);
      }

      const providers = getExportProviders(policy.inputs[0].config.policy.value);
      const provider = providers.find(({ id }) => id === providerId);

      if (!provider) {
        throw new NotFoundError(
          `Export provider [${providerId}] not found in Elastic Defend policy [${packagePolicyId}]`
        );
      }

      if (getExportProviderAccountKeyError(request.body.account_key)) {
        throw new CustomHttpRequestError(
          `account_key must be the storage account's access key (88 characters, base64)`,
          400
        );
      }

      createdKeyId = await keyClient.createAccountKey({
        packagePolicyId,
        accountName: provider.account_name,
        accountKey: request.body.account_key,
      });
      // `const` so the non-null value stays narrowed inside the `.map()` callback below.
      const keyId = createdKeyId;
      const credentials: ExportProviderAccountKeyReference = { type: 'account_key', key_id: keyId };

      const update = getPolicyDataForUpdate(policy);

      update.version = request.body.package_policy_version;
      update.inputs[0].config.policy.value = setExportProviders(
        update.inputs[0].config.policy.value,
        providers.map((candidate) =>
          candidate.id === provider.id ? { ...candidate, credentials } : candidate
        )
      );

      const user = endpointAppContextServices.security?.authc.getCurrentUser(request) ?? undefined;
      let updatedPolicy: PackagePolicy;

      try {
        updatedPolicy = await fleetServices.packagePolicy.update(
          fleetServices.getSoClient(),
          endpointAppContextServices.getInternalEsClient(),
          packagePolicyId,
          update,
          { user }
        );
      } catch (error) {
        if (SavedObjectsErrorHelpers.isConflictError(error)) {
          throw new CustomHttpRequestError(POLICY_CHANGED_MESSAGE, 409);
        }

        if (isApiPassThroughError(error)) {
          throw new CustomHttpRequestError(error.message, error.statusCode);
        }

        throw error;
      }

      endpointAppContextServices.security?.audit
        .asScoped(request)
        .log(createKeySetSuccessAuditEvent({ providerId, packagePolicyId, keyId }));

      const body: SetExportProviderKeyResponse = { item: updatedPolicy as PolicyData };

      return response.ok({ body });
    } catch (error) {
      endpointAppContextServices.security?.audit.asScoped(request).log(
        createKeySetFailureAuditEvent({
          providerId,
          packagePolicyId,
          keyId: createdKeyId,
          error,
        })
      );

      return errorHandler(logger, response, error);
    }
  };
};

export const registerSetExportProviderKeyRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
): void => {
  if (!endpointContext.experimentalFeatures.responseActionsEndpointFileExport) {
    return;
  }

  const logger = endpointContext.logFactory.get('setExportProviderKeyRoute');

  router.versioned
    .put({
      access: 'internal',
      path: EXPORT_PROVIDER_KEY_ROUTE,
      security: {
        authz: { requiredPrivileges: ['securitySolution'] },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: SetExportProviderKeyRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWritePolicyManagement'] },
        logger,
        getSetExportProviderKeyHandler(endpointContext.service)
      )
    );
};
