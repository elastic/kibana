/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CoreSetup, CoreStart, KibanaRequest } from '@kbn/core/server';
import { StatusError } from '../errors/status_error';

/**
 * What the detection engine does outside a workflow run, such as turning its rules on, runs as the
 * service account bound to this workload in the space. A user only starts those actions.
 */
export const DETECTION_ENGINE_WORKLOAD_TYPE = 'detection_engine';
/** One binding per space: the binding carries the space. */
export const DETECTION_ENGINE_WORKLOAD_ID = 'detection_engine';

/** Registers the workload type. Binding or running as an account is refused for an unregistered type. */
export function registerDetectionEngineWorkloadType(core: CoreSetup): void {
  core.security.serviceAccounts.registerWorkloadType({
    type: DETECTION_ENGINE_WORKLOAD_TYPE,
    name: 'Nightshift detection engine',
    description:
      'Changes the Nightshift detection engine makes outside workflow runs, such as turning its rules on.',
  });
}

/**
 * The refusal for detection engine work in a space that is not set up. There is no fallback to the
 * caller's own privileges: a space either runs as its account or does not run.
 */
export function createNotSetUpError({
  serviceAccountsEnabled = true,
}: { serviceAccountsEnabled?: boolean } = {}): StatusError {
  return new StatusError(
    serviceAccountsEnabled
      ? 'Nightshift is not set up in this space. A user with the manage_security privilege must set it ' +
        'up: POST /internal/significant_events/service_account/_enable in this space.'
      : 'Nightshift is not set up in this space: service accounts are disabled in this deployment. ' +
        'Set xpack.security.serviceAccounts.enabled: true, then set the space up.',
    503
  );
}

/** The id of the account the space's detection engine runs as, or `undefined` when not set up. */
export async function getDetectionEngineAccountId({
  core,
  spaceId,
}: {
  core: CoreStart;
  spaceId: string;
}): Promise<string | undefined> {
  if (!core.security.serviceAccounts.isEnabled()) {
    return undefined;
  }
  const binding = await core.security.serviceAccounts.getWorkloadBinding({
    workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
    workloadId: DETECTION_ENGINE_WORKLOAD_ID,
    spaceId,
  });
  return binding?.serviceAccountId;
}

/** Whether the space's detection engine has an account to run as. */
export async function isDetectionEngineSetUp({
  core,
  spaceId,
}: {
  core: CoreStart;
  spaceId: string;
}): Promise<boolean> {
  return (await getDetectionEngineAccountId({ core, spaceId })) !== undefined;
}

/** Whether the request's user holds `manage_security`, which binding an account requires. */
export async function canManageSecurity({
  core,
  request,
}: {
  core: Pick<CoreStart, 'elasticsearch'>;
  request: KibanaRequest;
}): Promise<boolean> {
  const { has_all_requested: allowed } = await core.elasticsearch.client
    .asScoped(request)
    .asCurrentUser.security.hasPrivileges({ cluster: ['manage_security'] });
  return allowed;
}

/**
 * Runs `fn` with a request authenticated as the account bound to the space's detection engine.
 * With `expectedAccountId`, refuses when the space was rebound to another account in between.
 */
export function withDetectionEngineAccount<T>({
  core,
  spaceId,
  expectedAccountId,
  fn,
}: {
  core: CoreStart;
  spaceId: string;
  expectedAccountId?: string;
  fn: (accountRequest: KibanaRequest) => Promise<T>;
}): Promise<T> {
  return core.security.serviceAccounts.withScopedRequestForWorkload(
    {
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
      spaceId,
      expectedServiceAccountId: expectedAccountId,
      executionId: uuidv4(),
    },
    fn
  );
}

/**
 * Runs `fn` as the space's account, refused with 503 when the space is not set up. A user's request
 * is swapped for one authenticated as the account. A service account's request is used as it is
 * when it is the space's account, such as a bound workflow run calling back into Kibana, and
 * refused with 403 otherwise: only that account may act for the detection engine.
 */
export async function asDetectionEngineAccount<T>({
  core,
  request,
  spaceId,
  fn,
}: {
  core: CoreStart;
  request: KibanaRequest;
  spaceId: string;
  fn: (accountRequest: KibanaRequest) => Promise<T>;
}): Promise<T> {
  const accountId = await getDetectionEngineAccountId({ core, spaceId });
  if (accountId === undefined) {
    throw createNotSetUpError({
      serviceAccountsEnabled: core.security.serviceAccounts.isEnabled(),
    });
  }
  const principal = core.security.authc.getPrincipal(request);
  if (principal?.type !== 'service_account') {
    return withDetectionEngineAccount({ core, spaceId, expectedAccountId: accountId, fn });
  }
  if (principal.serviceAccountId !== accountId) {
    throw new StatusError(
      `Service account [${principal.serviceAccountId}] is not the detection engine account of this space`,
      403
    );
  }
  return fn(request);
}

/**
 * Refuses a service account that is not the space's detection engine account. A user's request
 * passes: only service accounts are held to the space's account, so another Nightshift account
 * cannot act for this engine, and a space that is not set up refuses every service account.
 */
export async function assertServiceAccountActsForSpace({
  core,
  request,
  spaceId,
}: {
  core: CoreStart;
  request: KibanaRequest;
  spaceId: string;
}): Promise<void> {
  const principal = core.security.authc.getPrincipal(request);
  if (principal?.type !== 'service_account') {
    return;
  }
  const accountId = await getDetectionEngineAccountId({ core, spaceId });
  if (accountId === undefined) {
    throw createNotSetUpError({
      serviceAccountsEnabled: core.security.serviceAccounts.isEnabled(),
    });
  }
  if (principal.serviceAccountId !== accountId) {
    throw new StatusError(
      `Service account [${principal.serviceAccountId}] is not the detection engine account of this space`,
      403
    );
  }
}
