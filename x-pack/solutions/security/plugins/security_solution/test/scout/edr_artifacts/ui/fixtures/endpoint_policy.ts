/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath, getSpaceIdFromPath } from '@kbn/core-spaces-common';
import type { GetInfoResponse } from '@kbn/fleet-plugin/common';
import { AGENT_POLICY_API_ROUTES, API_VERSIONS, epmRouteService } from '@kbn/fleet-plugin/common';
import { KbnClient } from '@kbn/kbn-client';
import type { ScoutLogger } from '@kbn/scout-security';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
  type IndexedFleetEndpointPolicyResponse,
} from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { PolicyData } from '../../../../../common/endpoint/types';

export interface ScoutEndpointPolicyRequestOptions {
  readonly retryRequests?: boolean;
}

/**
 * KbnClient retries every failed status (including 404) 5 times with 1s+2s+3s+4s
 * backoff (~10s per call). `indexFleetEndpointPolicy` then retries
 * `resource_not_found_exception` 5 more times at 10s. Nested, that exceeds
 * Playwright's 60s worker-fixture budget before the real error surfaces.
 * That reason holds only for callers without their own fixture timeout, so
 * `retryRequests: true` keeps KbnClient's default retries for callers whose
 * fixture has a budget that fits the nested retries. With it on,
 * `deleteScoutEndpointPolicy` also treats a 404 on the agent-policy delete as
 * already deleted.
 */
const withNoRequestRetries = (kbnClient: KbnClient): KbnClient => {
  const originalRequest = kbnClient.request.bind(kbnClient);
  const wrapped = Object.create(kbnClient) as KbnClient;
  wrapped.request = ((options) =>
    originalRequest({
      ...options,
      retries: 0,
    })) as KbnClient['request'];
  return wrapped;
};

/**
 * FTR space tests build a KbnClient whose URL already includes `/s/{spaceId}`.
 * Prefixing `options.path` on the original default-space client is not
 * equivalent: `resolveUrl` and non-request helpers stay on `/`, and Fleet
 * 404s the follow-up package-policy create.
 *
 * Rebuilding `new KbnClient({ log, url })` drops `certificateAuthorities`
 * (http2/TLS) and can mis-order a Kibana server basePath. Keep this only
 * because path-prefixing is the option that actually failed here.
 *
 * Do not send EPM getInfo through this client. Fleet/EPM setup runs in
 * `default`; `GET /s/{space}/api/fleet/epm/packages/endpoint` 404s, and the
 * loader then retries package-policy create for up to 5 minutes.
 *
 * Do not pass `spaceIds` into the loader when using this client. That body
 * field makes Fleet move the agent-policy SO into `spaceIds[0]` after creating
 * it in the request space; the package-policy POST then 404s in the original
 * space.
 */
const createSpaceUrlKbnClient = (
  kbnClient: KbnClient,
  log: ScoutLogger,
  spaceId?: string,
  { retryRequests = false }: ScoutEndpointPolicyRequestOptions = {}
): KbnClient => {
  const applyRetryPolicy = (client: KbnClient): KbnClient =>
    retryRequests ? client : withNoRequestRetries(client);

  if (!spaceId || spaceId === 'default') {
    return applyRetryPolicy(kbnClient);
  }

  const url = new URL(kbnClient.resolveUrl('/'));
  const { pathname } = getSpaceIdFromPath(url.pathname);
  url.pathname = addSpaceIdToPath('/', spaceId, pathname);

  return applyRetryPolicy(new KbnClient({ log, url: url.href }));
};

const fetchDefaultSpaceEndpointPackageVersion = async (kbnClient: KbnClient): Promise<string> => {
  const endpointPackage = (
    await kbnClient.request<GetInfoResponse>({
      path: epmRouteService.getInfoPath('endpoint'),
      method: 'GET',
      headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
      retries: 0,
    })
  ).data.item;

  if (!endpointPackage?.version) {
    throw new Error(
      'EPM Endpoint package was not found in the default space. Ensure global.setup ran setupFleetForEndpoint.'
    );
  }

  return endpointPackage.version;
};

/**
 * Artifact item create/update validates `policy:<id>` tags against Fleet's
 * package-policy saved objects. Browser `page.route` mocks cannot satisfy that
 * server check, so this suite creates one real endpoint package policy (no
 * agents, no Fleet Server).
 */
export const createScoutEndpointPolicy = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  name = `Scout artifact tabs ${Date.now()}`,
  spaceId?: string,
  options?: ScoutEndpointPolicyRequestOptions
): Promise<IndexedFleetEndpointPolicyResponse> => {
  // Same split as FTR space tests: version from the default-space client, then
  // agent + package policy creates on a client whose URL is `/s/{spaceId}`.
  const version = await fetchDefaultSpaceEndpointPackageVersion(kbnClient);
  log.debug(
    `[endpointPolicy] creating '${name}' in space '${
      spaceId ?? 'default'
    }' with endpoint package ${version}`
  );
  return indexFleetEndpointPolicy(
    createSpaceUrlKbnClient(kbnClient, log, spaceId, options),
    name,
    version,
    undefined,
    log
  );
};

export const deleteScoutEndpointPolicy = async (
  kbnClient: KbnClient,
  log: ScoutLogger,
  indexed: IndexedFleetEndpointPolicyResponse,
  spaceId?: string,
  options?: ScoutEndpointPolicyRequestOptions
): Promise<void> => {
  const client = createSpaceUrlKbnClient(kbnClient, log, spaceId, options);

  if (options?.retryRequests !== true) {
    await deleteIndexedFleetEndpointPolicies(client, indexed);
    return;
  }

  // A retried delete whose first response was lost (e.g. a gateway 502) finds the
  // agent policy already gone and gets a 404, so a 404 means deleted here. The
  // package-policy bulk delete reports a missing id per item, not as a 404.
  await deleteIndexedFleetEndpointPolicies(client, { ...indexed, agentPolicies: [] });
  for (const { id } of indexed.agentPolicies) {
    await client.request({
      path: AGENT_POLICY_API_ROUTES.DELETE_PATTERN,
      headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
      method: 'POST',
      body: { agentPolicyId: id, force: true },
      ignoreErrors: [404],
    });
  }
};

export const getCreatedPackagePolicy = (
  indexed: IndexedFleetEndpointPolicyResponse
): PolicyData => {
  const policy = indexed.integrationPolicies[0];
  if (!policy) {
    throw new Error('Expected an endpoint package policy to be created');
  }
  return policy;
};
