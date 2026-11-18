/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetOneAgentResponse } from '@kbn/fleet-plugin/common';
import { agentRouteService } from '@kbn/fleet-plugin/common';
import { uninstallTokensRouteService } from '@kbn/fleet-plugin/common/services/routes';
import type { PostAgentReassignResponse } from '@kbn/fleet-plugin/common/types/rest_spec/agent';
import type {
  GetUninstallTokenResponse,
  GetUninstallTokensMetadataResponse,
} from '@kbn/fleet-plugin/common/types/rest_spec/uninstall_token';
import type { ApiClientFixture } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';

type RequestHeaders = Record<string, string>;

const AGENT_POLICY_TIMEOUT_MS = 120_000;

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

/** Polls until the agent reports `agentPolicyId` at `revision` or later and is not updating. */
export const waitForAgentOnPolicy = async (
  apiClient: ApiClientFixture,
  headers: RequestHeaders,
  agentId: string,
  { agentPolicyId, revision }: { agentPolicyId: string; revision: number }
): Promise<void> => {
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
