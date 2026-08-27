/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEqual } from 'lodash';
import type { KibanaRequest, Logger } from '@kbn/core/server';

import { PROTECTED_POLICY_SETTING_PATHS } from '../../../common/endpoint/service/policy/protected_policy_settings';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';

/**
 * Throws a 403 if the caller is changing any of the protected artifact trust/transport advanced
 * policy settings without superuser (canWriteAdminData) privileges.
 *
 * These settings control where the root/SYSTEM Endpoint downloads its protection artifacts from
 * and which public key it uses to verify the manifest signature. Compromising them allows a
 * non-superuser to redirect or forge artifacts delivered fleet-wide.
 *
 * **Fail-open when `request` is absent**: background/internal callers (license watcher, manifest
 * manager, bulkUpdate) have no request context and must be allowed to continue.
 */
export const validateProtectedPolicySettings = async ({
  newPolicyValue,
  currentPolicyValue,
  endpointServices,
  request,
  logger,
}: {
  newPolicyValue: Record<string, unknown> | undefined;
  currentPolicyValue: Record<string, unknown> | undefined;
  endpointServices: EndpointAppContextService;
  request: KibanaRequest | undefined;
  logger: Logger;
}): Promise<void> => {
  // Internal background callers (license watcher, manifest manager, bulkUpdate) carry no request.
  // Fail open so they can continue operating normally.
  if (!request) return;

  const changedPaths = PROTECTED_POLICY_SETTING_PATHS.filter(
    (path) => !isEqual(get(newPolicyValue, path), get(currentPolicyValue, path))
  );

  if (changedPaths.length === 0) return;

  const { canWriteAdminData } = await endpointServices.getEndpointAuthz(request);
  if (canWriteAdminData) return;

  logger.warn(
    `Rejected attempt to modify protected Elastic Defend policy settings [${changedPaths.join(
      ', '
    )}] without superuser/admin privileges`
  );

  const err = new Error(
    `Modifying the following Elastic Defend policy settings requires superuser/admin privileges: ${changedPaths.join(
      ', '
    )}`
  ) as Error & { statusCode?: number; apiPassThrough?: boolean };
  err.statusCode = 403;
  // apiPassThrough MUST be true — Fleet's packagePolicyUpdate callback catch block swallows
  // errors that lack this flag and writes the original (unsanitised) payload instead.
  err.apiPassThrough = true;
  throw err;
};
