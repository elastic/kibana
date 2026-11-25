/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ScoutLogger } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { HOST_METADATA_GET_ROUTE } from '../../../common/endpoint/constants';
import type { HostInfo } from '../../../common/endpoint/types';
import { HostPolicyResponseActionStatus } from '../../../common/endpoint/types';

const APPLIED_POLICY_TIMEOUT_MS = 180_000;
const APPLIED_POLICY_POLL_INTERVAL_MS = 5_000;
const ACCEPTED_APPLIED_STATUSES: readonly HostPolicyResponseActionStatus[] = [
  HostPolicyResponseActionStatus.success,
  HostPolicyResponseActionStatus.warning,
];

export interface WaitForAppliedEndpointPolicyOptions {
  minimumRevision: number;
  /** When set, Endpoint must also report this package policy as `applied.id`. */
  packagePolicyId?: string;
  /**
   * Throw as soon as the expected policy reports `minimumRevision` or later with a status other
   * than `success` or `warning`, instead of waiting for the timeout.
   */
  failOnUnacceptedStatus?: boolean;
  log?: ScoutLogger;
}

/**
 * Polls host metadata until Endpoint on `agentId` reports a policy applied at `minimumRevision` or
 * later and returns that revision. The headers need the `securitySolution` API privilege.
 */
export const waitForAppliedEndpointPolicy = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  agentId: string,
  {
    minimumRevision,
    packagePolicyId,
    failOnUnacceptedStatus = false,
    log,
  }: WaitForAppliedEndpointPolicyOptions
): Promise<number> => {
  const startedAt = Date.now();
  const expectedPolicy = packagePolicyId
    ? `package policy ${packagePolicyId}`
    : 'any package policy';
  let isFirstRead = true;
  let appliedRevision = 0;

  await expect
    .poll(
      async () => {
        const { statusCode, body } = await apiClient.get<HostInfo>(
          HOST_METADATA_GET_ROUTE.replace('{id}', agentId),
          { headers, responseType: 'json' }
        );
        if (statusCode !== 200) {
          return `status ${statusCode}: ${JSON.stringify(body)}`;
        }

        const { applied } = body.metadata.Endpoint.policy;
        const { id, status, endpoint_policy_version: endpointPolicyVersion } = applied;
        appliedRevision = Number(endpointPolicyVersion);
        const policyMatched = packagePolicyId === undefined || id === packagePolicyId;
        const revisionReached = appliedRevision >= minimumRevision;
        if (isFirstRead) {
          isFirstRead = false;
          log?.info(
            `[edr_real_fleet] agent ${agentId} first Endpoint policy read: applied.id=${id}, endpoint_policy_version=${endpointPolicyVersion}, status=${status}; waiting for ${expectedPolicy} at revision ${minimumRevision}`
          );
        }
        if (
          failOnUnacceptedStatus &&
          policyMatched &&
          revisionReached &&
          !ACCEPTED_APPLIED_STATUSES.includes(status)
        ) {
          throw new Error(
            `Endpoint on agent ${agentId} did not apply ${expectedPolicy} (status ${status}): ${JSON.stringify(
              applied
            )}`
          );
        }

        return { policyMatched, revisionReached, applied };
      },
      {
        message: `Endpoint on agent ${agentId} reports ${expectedPolicy} applied at revision ${minimumRevision} or later`,
        timeout: APPLIED_POLICY_TIMEOUT_MS,
        intervals: [APPLIED_POLICY_POLL_INTERVAL_MS],
      }
    )
    .toMatchObject({ policyMatched: true, revisionReached: true });

  log?.info(
    `[edr_real_fleet] agent ${agentId} Endpoint applied ${expectedPolicy} at revision ${appliedRevision} after ${
      Date.now() - startedAt
    } ms`
  );

  return appliedRevision;
};
