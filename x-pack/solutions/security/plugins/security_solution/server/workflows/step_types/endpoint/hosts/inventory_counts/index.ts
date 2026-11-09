/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildPolicyIdsOrVariantsKuery,
  FLEET_ENDPOINT_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import type { Agent } from '@kbn/fleet-plugin/common';
import { FleetUnauthorizedError } from '@kbn/fleet-plugin/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  type getEndpointInventoryCountsInputSchema,
  getEndpointInventoryCountsStepCommonDefinition,
} from '../../../../../../common/workflows/step_types/endpoint/hosts';
import { metadataCurrentIndexPattern } from '../../../../../../common/endpoint/constants';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { prefixIndexPatternsWithCcs } from '../../../../../endpoint/utils/ccs_utils';
import { collectPages } from '../../../../../endpoint/services/endpoint_host_selection';
import { parseNonNegativeInteger } from '../../common/number';
import { readErrorOutcome } from '../../common/read_error';
import { readKibanaApi } from '../../common/read_kibana_api';

const FLEET_AGENT_COUNT_PART = 'fleet_agent_count';
const UNITED_METADATA_COUNT_PART = 'united_metadata_count';
const CURRENT_METADATA_COUNT_PART = 'current_metadata_count';

const ENDPOINT_PACKAGE_POLICY_KUERY = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_ENDPOINT_PACKAGE}`;

const PACKAGE_POLICY_PAGE_SIZE = 100;
const MAX_PACKAGE_POLICY_PAGES = 100;
const FLEET_AGENT_PAGE_SIZE = 1000;
const MAX_FLEET_AGENT_PAGES = 1000;
const MAX_FLEET_AGENTS = 1_000_000;
const AGENT_POLICY_BATCH_SIZE = 500;
const FLEET_PIT_KEEP_ALIVE = '1m';

type InventoryContextManager = StepHandlerContext<
  typeof getEndpointInventoryCountsInputSchema
>['contextManager'];

interface CountOutcome {
  count?: number;
  unauthorized?: string;
  unavailable?: string;
}

interface PackagePolicyWithAgentCount {
  id: string;
  policy_ids: string[];
  agents?: unknown;
}

interface FleetInventoryOutcome extends CountOutcome {
  agentPolicyIds?: string[];
}

interface PackagePoliciesRouteResponse {
  items?: unknown;
  total?: unknown;
}

const readFleetAgentCount = async (
  contextManager: InventoryContextManager,
  signal: AbortSignal
): Promise<FleetInventoryOutcome> => {
  try {
    const {
      items,
      truncated,
      total: routeTotal,
    } = await collectPages<PackagePolicyWithAgentCount>(
      async (page) => {
        signal.throwIfAborted();
        const query = new URLSearchParams({
          page: String(page),
          perPage: String(PACKAGE_POLICY_PAGE_SIZE),
          kuery: ENDPOINT_PACKAGE_POLICY_KUERY,
          withAgentCount: 'true',
        });
        const body = await readKibanaApi<PackagePoliciesRouteResponse>(
          contextManager,
          `/api/fleet/package_policies?${query.toString()}`,
          signal
        );
        const total = parseNonNegativeInteger(body?.total);
        if (!Array.isArray(body?.items) || total === undefined) {
          throw new Error('Invalid package policies response');
        }
        return {
          items: body.items as PackagePolicyWithAgentCount[],
          total,
          fetchedCount: body.items.length,
        };
      },
      { pageSize: PACKAGE_POLICY_PAGE_SIZE, maxPages: MAX_PACKAGE_POLICY_PAGES }
    );
    const uniqueItems = [...new Map(items.map((item) => [item.id, item])).values()];
    if (truncated || uniqueItems.length !== routeTotal) {
      return { unavailable: FLEET_AGENT_COUNT_PART };
    }
    if (uniqueItems.some(({ policy_ids: policyIds }) => !Array.isArray(policyIds))) {
      return { unavailable: FLEET_AGENT_COUNT_PART };
    }
    return {
      agentPolicyIds: [...new Set(uniqueItems.flatMap(({ policy_ids: policyIds }) => policyIds))],
      count: uniqueItems.reduce(
        (total, item) => total + (parseNonNegativeInteger(item.agents) ?? 0),
        0
      ),
    };
  } catch (error) {
    signal.throwIfAborted();
    return readErrorOutcome(error, FLEET_AGENT_COUNT_PART);
  }
};

const readUnitedMetadataCount = async (
  contextManager: InventoryContextManager,
  signal: AbortSignal
): Promise<CountOutcome> => {
  const query = new URLSearchParams({ pageSize: '1' });
  try {
    signal.throwIfAborted();
    const body = await readKibanaApi<{ total?: unknown }>(
      contextManager,
      `/api/endpoint/metadata?${query.toString()}`,
      signal
    );
    const count = parseNonNegativeInteger(body?.total);
    return count !== undefined ? { count } : { unavailable: UNITED_METADATA_COUNT_PART };
  } catch (error) {
    signal.throwIfAborted();
    return readErrorOutcome(error, UNITED_METADATA_COUNT_PART);
  }
};

const readCurrentMetadataCount = async (
  contextManager: InventoryContextManager,
  fleetInventory: FleetInventoryOutcome,
  endpointAppContextService: Pick<
    EndpointAppContextService,
    'isCcsEnabled' | 'getFleetAgentService' | 'getInternalEsClient'
  >,
  signal: AbortSignal
): Promise<CountOutcome> => {
  signal.throwIfAborted();
  const { agentPolicyIds, unauthorized } = fleetInventory;
  if (agentPolicyIds === undefined) {
    return unauthorized
      ? { unauthorized: CURRENT_METADATA_COUNT_PART }
      : { unavailable: CURRENT_METADATA_COUNT_PART };
  }
  if (agentPolicyIds.length === 0) {
    return { count: 0 };
  }
  const pagination: { pitId?: string; searchAfter?: Agent['sort'] } = {};
  try {
    const agentClient = endpointAppContextService
      .getFleetAgentService()
      .asScoped(contextManager.getFakeRequest());
    const index = prefixIndexPatternsWithCcs(
      metadataCurrentIndexPattern,
      await endpointAppContextService.isCcsEnabled()
    );
    let snapshotTotal = 0;
    let count = 0;
    for (let offset = 0; offset < agentPolicyIds.length; offset += AGENT_POLICY_BATCH_SIZE) {
      const policyIds = agentPolicyIds.slice(offset, offset + AGENT_POLICY_BATCH_SIZE);
      let batchTotal = 0;
      let rawCount = 0;
      const { items, truncated } = await collectPages<number>(
        async (page) => {
          signal.throwIfAborted();
          const { pitId, searchAfter } = pagination;
          const response = await agentClient.listAgents({
            showInactive: true,
            perPage: FLEET_AGENT_PAGE_SIZE,
            kuery: `status:* and ${buildPolicyIdsOrVariantsKuery(policyIds)}`,
            pitKeepAlive: FLEET_PIT_KEEP_ALIVE,
            ...(pitId ? { pitId } : { openPit: true }),
            ...(page > 1 ? { searchAfter } : {}),
          });
          const { agents, pit } = response;
          if (pit) {
            Object.assign(pagination, { pitId: pit });
          }
          signal.throwIfAborted();
          if (!pit) {
            throw new Error('Invalid Fleet agents response');
          }
          Object.assign(pagination, { searchAfter: agents[agents.length - 1]?.sort });
          if (page === 1) {
            const total = parseNonNegativeInteger(response.total);
            if (total === undefined) {
              throw new Error('Invalid Fleet agents total');
            }
            batchTotal = total;
            snapshotTotal += total;
            if (snapshotTotal > MAX_FLEET_AGENTS) {
              throw new Error('Fleet agents walk exceeds limit');
            }
          }
          rawCount += agents.length;
          if (
            rawCount < batchTotal &&
            (agents.length === 0 || !pagination.searchAfter || pagination.searchAfter.length === 0)
          ) {
            throw new Error('Incomplete Fleet agents walk');
          }
          if (agents.length === 0) {
            return { items: [], total: batchTotal, fetchedCount: 0 };
          }
          const agentIds = agents.map(({ id }) => id);
          const metadata = await contextManager.getScopedEsClient().search(
            {
              index,
              size: 0,
              track_total_hits: true,
              allow_no_indices: false,
              query: {
                bool: {
                  should: [
                    { terms: { 'elastic.agent.id': agentIds } },
                    {
                      bool: {
                        must_not: { exists: { field: 'elastic.agent.id' } },
                        filter: { terms: { 'agent.id': agentIds } },
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            },
            { signal }
          );
          signal.throwIfAborted();
          const pageCount = parseNonNegativeInteger(
            typeof metadata.hits.total === 'object' ? metadata.hits.total.value : undefined
          );
          if (
            metadata._shards?.failed > 0 ||
            metadata.timed_out ||
            (metadata._clusters?.skipped ?? 0) > 0 ||
            (metadata._clusters?.partial ?? 0) > 0 ||
            (metadata._clusters?.failed ?? 0) > 0 ||
            pageCount === undefined
          ) {
            throw new Error('Incomplete current metadata count');
          }
          return { items: [pageCount], total: batchTotal, fetchedCount: agents.length };
        },
        { pageSize: FLEET_AGENT_PAGE_SIZE, maxPages: MAX_FLEET_AGENT_PAGES }
      );
      signal.throwIfAborted();
      if (truncated) {
        return { unavailable: CURRENT_METADATA_COUNT_PART };
      }
      count += items.reduce((total, pageCount) => total + pageCount, 0);
    }
    return { count };
  } catch (error) {
    signal.throwIfAborted();
    return error instanceof FleetUnauthorizedError
      ? { unauthorized: CURRENT_METADATA_COUNT_PART }
      : readErrorOutcome(error, CURRENT_METADATA_COUNT_PART);
  } finally {
    if (pagination.pitId) {
      await endpointAppContextService
        .getInternalEsClient()
        .closePointInTime({ id: pagination.pitId })
        .catch(() => {});
    }
  }
};

export const createGetEndpointInventoryCountsStepDefinition = (
  endpointAppContextService: Pick<
    EndpointAppContextService,
    'isCcsEnabled' | 'getFleetAgentService' | 'getInternalEsClient'
  >
) =>
  createServerStepDefinition({
    ...getEndpointInventoryCountsStepCommonDefinition,
    handler: async (context) => {
      const fleetInventory = readFleetAgentCount(context.contextManager, context.abortSignal);
      const [fleetAgents, unitedMetadata, currentMetadata] = await Promise.all([
        fleetInventory,
        readUnitedMetadataCount(context.contextManager, context.abortSignal),
        fleetInventory.then((inventory) =>
          readCurrentMetadataCount(
            context.contextManager,
            inventory,
            endpointAppContextService,
            context.abortSignal
          )
        ),
      ]);

      const unauthorized = [
        fleetAgents.unauthorized,
        unitedMetadata.unauthorized,
        currentMetadata.unauthorized,
      ].filter((part): part is string => part !== undefined);
      const unavailable = [
        fleetAgents.unavailable,
        unitedMetadata.unavailable,
        currentMetadata.unavailable,
      ].filter((part): part is string => part !== undefined);

      return {
        output: {
          ...(fleetAgents.count !== undefined ? { fleet_agent_count: fleetAgents.count } : {}),
          ...(unitedMetadata.count !== undefined
            ? { united_metadata_count: unitedMetadata.count }
            : {}),
          ...(currentMetadata.count !== undefined
            ? { current_metadata_count: currentMetadata.count }
            : {}),
          unauthorized,
          unavailable,
        },
      };
    },
  });
