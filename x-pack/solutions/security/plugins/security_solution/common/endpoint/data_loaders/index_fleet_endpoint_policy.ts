/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient, KbnClientResponse } from '@kbn/test';
import type {
  AgentPolicy,
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  CreatePackagePolicyRequest,
  CreatePackagePolicyResponse,
  DeleteAgentPolicyResponse,
  GetPackagePoliciesResponse,
  PostDeletePackagePoliciesResponse,
} from '@kbn/fleet-plugin/common';
import {
  AGENT_POLICY_API_ROUTES,
  AGENTS_INDEX,
  PACKAGE_POLICY_API_ROUTES,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  API_VERSIONS,
} from '@kbn/fleet-plugin/common';
import { memoize } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import { catchHttpErrorFormatAndThrow } from '../format_http_error';
import { usageTracker } from './usage_tracker';
import { getEndpointPackageInfo } from '../utils/package';
import type { PolicyData } from '../types';
import { policyFactory as policyConfigFactory } from '../models/policy_config';
import { RETRYABLE_TRANSIENT_ERRORS, retryOnError, wrapErrorAndRejectPromise } from './utils';

export interface IndexedFleetEndpointPolicyResponse {
  integrationPolicies: PolicyData[];
  agentPolicies: AgentPolicy[];
}

enum TimeoutsInMS {
  TEN_SECONDS = 10 * 1000,
  FIVE_MINUTES = 5 * 60 * 1000,
}
/**
 * Create an endpoint Integration Policy (and associated Agent Policy) via Fleet
 * (NOTE: ensure that fleet is setup first before calling this loading function)
 */
export const indexFleetEndpointPolicy = usageTracker.track(
  'indexFleetEndpointPolicy',
  async (
    kbnClient: KbnClient,
    policyName: string,
    endpointPackageVersion?: string,
    agentPolicyName?: string,
    log?: ToolingLog,
    spaceIds?: string[]
  ): Promise<IndexedFleetEndpointPolicyResponse> => {
    const response: IndexedFleetEndpointPolicyResponse = {
      integrationPolicies: [],
      agentPolicies: [],
    };

    const packageVersion =
      endpointPackageVersion ?? (await getDefaultEndpointPackageVersion(kbnClient));

    // Create Agent Policy first
    const newAgentPolicyData: CreateAgentPolicyRequest['body'] = {
      name:
        agentPolicyName || `Policy for ${policyName} (${Math.random().toString(36).substr(2, 5)})`,
      description: `Policy created with endpoint data generator (${policyName})`,
      namespace: spaceIds?.[0] ?? 'default',
      monitoring_enabled: ['logs', 'metrics'],
      space_ids: spaceIds,
    };

    let agentPolicy: KbnClientResponse<CreateAgentPolicyResponse>;

    try {
      agentPolicy = (await kbnClient
        .request({
          path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
          headers: {
            'elastic-api-version': API_VERSIONS.public.v1,
          },
          method: 'POST',
          body: newAgentPolicyData,
        })
        .catch(wrapErrorAndRejectPromise)) as KbnClientResponse<CreateAgentPolicyResponse>;
    } catch (error) {
      throw new Error(`create fleet agent policy failed ${error}`);
    }

    response.agentPolicies.push(agentPolicy.data.item);

    // Create integration (package) policy
    const newPackagePolicyData: CreatePackagePolicyRequest['body'] = {
      name: policyName,
      // skip_ensure_installed: true,
      description: 'Protect the worlds data',
      policy_ids: [agentPolicy.data.item.id],
      enabled: true,
      inputs: [
        {
          type: 'endpoint',
          enabled: true,
          streams: [],
          config: {
            policy: {
              value: policyConfigFactory(),
            },
          },
        },
      ],
      namespace: 'default',
      package: {
        name: 'endpoint',
        title: 'Elastic Defend',
        version: packageVersion,
      },
    };

    const findPackagePolicyByName = async (): Promise<CreatePackagePolicyResponse | undefined> =>
      kbnClient
        .request<GetPackagePoliciesResponse>({
          path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
          method: 'GET',
          query: {
            perPage: 1,
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name:"${policyName}"`,
          },
          headers: {
            'elastic-api-version': API_VERSIONS.public.v1,
          },
        })
        .catch(catchHttpErrorFormatAndThrow)
        .then((res) => {
          const item = res.data.items[0];
          return item ? { item } : undefined;
        });

    const createPackagePolicy = async (): Promise<CreatePackagePolicyResponse> =>
      kbnClient
        .request<CreatePackagePolicyResponse>({
          path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
          method: 'POST',
          body: newPackagePolicyData,
          headers: {
            'elastic-api-version': API_VERSIONS.public.v1,
          },
        })
        .then((res) => res.data)
        .catch(async (error: Error & { status?: number }) => {
          // A retried create can 409 if a prior attempt already committed this uniquely named policy.
          if (error.status === 409) {
            const existing = await findPackagePolicyByName();
            if (existing?.item.policy_ids?.includes(agentPolicy.data.item.id)) {
              log?.debug(
                `Package policy [${policyName}] already exists after 409; reusing existing policy`
              );
              return existing;
            }
          }

          return catchHttpErrorFormatAndThrow(error);
        });

    const started = new Date();
    const hasTimedOut = (): boolean => {
      const elapsedTime = Date.now() - started.getTime();
      return elapsedTime > TimeoutsInMS.FIVE_MINUTES;
    };

    let packagePolicy: CreatePackagePolicyResponse | undefined;
    log?.debug(`Creating integration policy with name: ${policyName}`);

    while (!packagePolicy && !hasTimedOut()) {
      packagePolicy = await retryOnError(
        async () => createPackagePolicy(),
        [...RETRYABLE_TRANSIENT_ERRORS, 'resource_not_found_exception'],
        log
      );

      if (!packagePolicy) {
        await new Promise((resolve) => setTimeout(resolve, TimeoutsInMS.TEN_SECONDS));
      }
    }

    if (!packagePolicy) {
      throw new Error(`Create package policy failed`);
    }

    log?.verbose(`Integration policy created:`, JSON.stringify(packagePolicy, null, 2));

    response.integrationPolicies.push(packagePolicy.item as PolicyData);

    return response;
  }
);

export interface DeleteIndexedFleetEndpointPoliciesResponse {
  integrationPolicies: PostDeletePackagePoliciesResponse | undefined;
  agentPolicies: DeleteAgentPolicyResponse[] | undefined;
}

/**
 * Delete indexed Fleet Endpoint integration policies along with their respective Agent Policies.
 * Prior to calling this function, ensure that no agents are associated with the Agent Policy.
 * (NOTE: ensure that fleet is setup first before calling this loading function)
 * @param kbnClient
 * @param indexData
 */
export const deleteIndexedFleetEndpointPolicies = async (
  kbnClient: KbnClient,
  indexData: IndexedFleetEndpointPolicyResponse,
  esClient?: Client
): Promise<DeleteIndexedFleetEndpointPoliciesResponse> => {
  const response: DeleteIndexedFleetEndpointPoliciesResponse = {
    integrationPolicies: undefined,
    agentPolicies: undefined,
  };

  if (indexData.integrationPolicies.length) {
    response.integrationPolicies = (
      (await kbnClient
        .request({
          path: PACKAGE_POLICY_API_ROUTES.DELETE_PATTERN,
          headers: {
            'elastic-api-version': API_VERSIONS.public.v1,
          },
          method: 'POST',
          body: {
            packagePolicyIds: indexData.integrationPolicies.map((policy) => policy.id),
          },
        })
        .catch(wrapErrorAndRejectPromise)) as KbnClientResponse<PostDeletePackagePoliciesResponse>
    ).data;
  }

  if (indexData.agentPolicies.length) {
    // Package-policy deletion updates the agent policy and can rewrite `.fleet-agents`
    // docs after the earlier agent delete. Fleet then rejects the policy delete while
    // any active agent still references it, so clear those agents immediately before.
    if (esClient) {
      await clearActiveAgentsForPolicies(
        esClient,
        indexData.agentPolicies.map((agentPolicy) => agentPolicy.id)
      );
    }

    response.agentPolicies = [];

    for (const agentPolicy of indexData.agentPolicies) {
      response.agentPolicies.push(
        (
          (await kbnClient
            .request({
              path: AGENT_POLICY_API_ROUTES.DELETE_PATTERN,
              headers: {
                'elastic-api-version': API_VERSIONS.public.v1,
              },
              method: 'POST',
              body: {
                agentPolicyId: agentPolicy.id,
                force: true,
              },
            })
            .catch(wrapErrorAndRejectPromise)) as KbnClientResponse<DeleteAgentPolicyResponse>
        ).data
      );
    }
  }

  return response;
};

const ACTIVE_AGENT_CLEAR_ATTEMPTS = 5;

/**
 * Fleet's agent-policy delete counts active agents on `.fleet-agents`. A concurrent
 * policy update can lose the version conflict on deleteByQuery (`conflicts: 'proceed'`),
 * so retry and then mark any remaining agents inactive.
 */
async function clearActiveAgentsForPolicies(esClient: Client, policyIds: string[]): Promise<void> {
  if (policyIds.length === 0) {
    return;
  }

  const assignedAgentsQuery = {
    bool: {
      filter: [{ term: { active: true } }, { terms: { policy_id: policyIds } }],
    },
  };

  for (let attempt = 0; attempt < ACTIVE_AGENT_CLEAR_ATTEMPTS; attempt++) {
    await esClient
      .deleteByQuery({
        index: AGENTS_INDEX,
        ignore_unavailable: true,
        refresh: true,
        conflicts: 'proceed',
        wait_for_completion: true,
        query: { terms: { policy_id: policyIds } },
      })
      .catch(wrapErrorAndRejectPromise);

    const remaining = await esClient.count({
      index: AGENTS_INDEX,
      ignore_unavailable: true,
      query: assignedAgentsQuery,
    });

    if (remaining.count === 0) {
      return;
    }

    await esClient
      .updateByQuery({
        index: AGENTS_INDEX,
        ignore_unavailable: true,
        refresh: true,
        conflicts: 'proceed',
        wait_for_completion: true,
        query: assignedAgentsQuery,
        script: { lang: 'painless', source: 'ctx._source.active = false' },
      })
      .catch(wrapErrorAndRejectPromise);

    const afterDeactivate = await esClient.count({
      index: AGENTS_INDEX,
      ignore_unavailable: true,
      query: assignedAgentsQuery,
    });

    if (afterDeactivate.count === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
}

const getDefaultEndpointPackageVersion = usageTracker.track(
  'getDefaultEndpointPackageVersion',
  memoize(
    async (kbnClient: KbnClient) => {
      return (await getEndpointPackageInfo(kbnClient)).version;
    },
    (kbnClient: KbnClient) => {
      return kbnClient.resolveUrl('/');
    }
  )
);
