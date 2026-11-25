/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetOneAgentResponse } from '@kbn/fleet-plugin/common';
import { agentRouteService } from '@kbn/fleet-plugin/common';
import { uninstallTokensRouteService } from '@kbn/fleet-plugin/common/services/routes';
import type {
  PostAgentReassignResponse,
  PostAgentUnenrollResponse,
} from '@kbn/fleet-plugin/common/types/rest_spec/agent';
import type {
  GetUninstallTokenResponse,
  GetUninstallTokensMetadataResponse,
} from '@kbn/fleet-plugin/common/types/rest_spec/uninstall_token';
import type { ApiClientFixture, ScoutLogger } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { HOST_METADATA_GET_ROUTE } from '../../../../../common/endpoint/constants';
import type { HostInfo } from '../../../../../common/endpoint/types';
import { HostPolicyResponseActionStatus } from '../../../../../common/endpoint/types';
import type { EndpointAgentPolicy } from './protected_policy';

type RequestHeaders = Record<string, string>;

const AGENT_POLICY_TIMEOUT_MS = 120_000;
const AGENT_UNENROLL_TIMEOUT_MS = 120_000;
const ENDPOINT_POLICY_TIMEOUT_MS = 180_000;
const ACCEPTED_APPLIED_STATUSES: readonly HostPolicyResponseActionStatus[] = [
  HostPolicyResponseActionStatus.success,
  HostPolicyResponseActionStatus.warning,
];

export interface FleetApiResponse<T> {
  statusCode: number;
  body: T;
}

export const reassignAgent = async (
  apiClient: ApiClientFixture,
  headers: RequestHeaders,
  agentId: string,
  agentPolicyId: string
): Promise<FleetApiResponse<PostAgentReassignResponse>> =>
  apiClient.post<PostAgentReassignResponse>(agentRouteService.getReassignPath(agentId), {
    headers,
    responseType: 'json',
    body: { policy_id: agentPolicyId },
  });

const readAgent = async (
  apiClient: ApiClientFixture,
  headers: RequestHeaders,
  agentId: string
): Promise<FleetApiResponse<GetOneAgentResponse>> =>
  apiClient.get<GetOneAgentResponse>(agentRouteService.getInfoPath(agentId), {
    headers,
    responseType: 'json',
  });

const readHostMetadata = async (
  apiClient: ApiClientFixture,
  headers: RequestHeaders,
  agentId: string
): Promise<FleetApiResponse<HostInfo>> =>
  apiClient.get<HostInfo>(HOST_METADATA_GET_ROUTE.replace('{id}', agentId), {
    headers,
    responseType: 'json',
  });

/**
 * Polls host metadata until Endpoint reports `packagePolicyId` applied at `packagePolicyRevision`
 * or later with a `success` or `warning` status. Throws as soon as that revision reports another status.
 */
const waitForEndpointOnPolicy = async (
  apiClient: ApiClientFixture,
  headers: RequestHeaders,
  agentId: string,
  {
    packagePolicyId,
    packagePolicyRevision,
  }: Pick<EndpointAgentPolicy, 'packagePolicyId' | 'packagePolicyRevision'>,
  log?: ScoutLogger
): Promise<void> => {
  const startedAt = Date.now();
  let isFirstRead = true;

  await expect
    .poll(
      async () => {
        const { statusCode, body } = await readHostMetadata(apiClient, headers, agentId);
        if (statusCode !== 200) {
          return `status ${statusCode}: ${JSON.stringify(body)}`;
        }

        const { applied } = body.metadata.Endpoint.policy;
        const { id, status, endpoint_policy_version: endpointPolicyVersion } = applied;
        const revisionApplied = Number(endpointPolicyVersion) >= packagePolicyRevision;
        if (isFirstRead) {
          isFirstRead = false;
          log?.info(
            `[edr_real_fleet] agent ${agentId} first Endpoint policy read: applied.id=${id}, endpoint_policy_version=${endpointPolicyVersion}, status=${status}; waiting for ${packagePolicyId} at revision ${packagePolicyRevision}`
          );
        }
        if (
          id === packagePolicyId &&
          revisionApplied &&
          !ACCEPTED_APPLIED_STATUSES.includes(status)
        ) {
          throw new Error(
            `Endpoint on agent ${agentId} did not apply package policy ${packagePolicyId} (status ${status}): ${JSON.stringify(
              applied
            )}`
          );
        }

        return { id, revisionApplied };
      },
      {
        message: `Endpoint on agent ${agentId} reports package policy ${packagePolicyId} applied at revision ${packagePolicyRevision} or later`,
        timeout: ENDPOINT_POLICY_TIMEOUT_MS,
        intervals: [5_000],
      }
    )
    .toStrictEqual({ id: packagePolicyId, revisionApplied: true });

  log?.info(
    `[edr_real_fleet] agent ${agentId} Endpoint applied package policy ${packagePolicyId} after ${
      Date.now() - startedAt
    } ms`
  );
};

/**
 * Polls until the agent reports `agentPolicyId` at `revision` or later and is not updating, then until
 * Endpoint reports the agent policy's Elastic Defend package policy applied. The headers need the
 * `securitySolution` API privilege for the host metadata route.
 */
export const waitForAgentOnPolicy = async (
  apiClient: ApiClientFixture,
  headers: RequestHeaders,
  agentId: string,
  policy: Pick<
    EndpointAgentPolicy,
    'agentPolicyId' | 'revision' | 'packagePolicyId' | 'packagePolicyRevision'
  >,
  log?: ScoutLogger
): Promise<void> => {
  const { agentPolicyId, revision } = policy;
  await expect
    .poll(
      async () => {
        const { statusCode, body } = await readAgent(apiClient, headers, agentId);
        if (statusCode !== 200) {
          return `status ${statusCode}: ${JSON.stringify(body)}`;
        }

        const { policy_id: policyId, policy_revision: policyRevision, status } = body.item;
        return {
          policyId,
          revisionApplied: (policyRevision ?? 0) >= revision,
          updating: status === 'updating',
        };
      },
      {
        message: `agent ${agentId} reports policy ${agentPolicyId} at revision ${revision} or later`,
        timeout: AGENT_POLICY_TIMEOUT_MS,
        intervals: [5_000],
      }
    )
    .toStrictEqual({ policyId: agentPolicyId, revisionApplied: true, updating: false });

  await waitForEndpointOnPolicy(apiClient, headers, agentId, policy, log);
};

/** Sends a graceful unenroll (no `revoke`): Fleet waits for the agent to acknowledge it. */
export const unenrollAgent = async (
  apiClient: ApiClientFixture,
  headers: RequestHeaders,
  agentId: string
): Promise<FleetApiResponse<PostAgentUnenrollResponse>> =>
  apiClient.post<PostAgentUnenrollResponse>(agentRouteService.getUnenrollPath(agentId), {
    headers,
    responseType: 'json',
    body: {},
  });

/** Polls until Fleet reports the agent's ack: unenrolled, inactive and unenrolled_at set. */
export const waitForAgentUnenrolled = async (
  apiClient: ApiClientFixture,
  headers: RequestHeaders,
  agentId: string
): Promise<void> => {
  await expect
    .poll(
      async () => {
        const { statusCode, body } = await readAgent(apiClient, headers, agentId);
        if (statusCode !== 200) {
          return `status ${statusCode}: ${JSON.stringify(body)}`;
        }

        const { status, active, unenrolled_at: unenrolledAt } = body.item;
        return { status, active, unenrolledAtSet: Boolean(unenrolledAt) };
      },
      {
        message: `agent ${agentId} acknowledges the unenroll`,
        timeout: AGENT_UNENROLL_TIMEOUT_MS,
        intervals: [5_000],
      }
    )
    .toStrictEqual({ status: 'unenrolled', active: false, unenrolledAtSet: true });
};

/** Decrypted uninstall token of `agentPolicyId`. Throws when Fleet does not return it. */
export const getUninstallToken = async (
  apiClient: ApiClientFixture,
  headers: RequestHeaders,
  agentPolicyId: string
): Promise<string> => {
  const listResponse = await apiClient.get<GetUninstallTokensMetadataResponse>(
    `${uninstallTokensRouteService.getListPath()}?policyId=${encodeURIComponent(agentPolicyId)}`,
    { headers, responseType: 'json' }
  );
  if (listResponse.statusCode !== 200) {
    throw new Error(
      `Listing uninstall tokens of ${agentPolicyId} returned ${
        listResponse.statusCode
      }: ${JSON.stringify(listResponse.body)}`
    );
  }

  // `policyId` is a partial match, so keep only this policy's token.
  const metadata = listResponse.body.items.find(({ policy_id: id }) => id === agentPolicyId);
  if (!metadata) {
    throw new Error(`No uninstall token found for agent policy ${agentPolicyId}`);
  }

  const tokenResponse = await apiClient.get<GetUninstallTokenResponse>(
    uninstallTokensRouteService.getInfoPath(metadata.id),
    { headers, responseType: 'json' }
  );
  if (tokenResponse.statusCode !== 200) {
    throw new Error(
      `Reading uninstall token ${metadata.id} returned ${
        tokenResponse.statusCode
      }: ${JSON.stringify(tokenResponse.body)}`
    );
  }

  return tokenResponse.body.item.token;
};
