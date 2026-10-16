/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_ENDPOINT_PACKAGE, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  type getEndpointInventoryCountsInputSchema,
  getEndpointInventoryCountsStepCommonDefinition,
} from '../../../../../../common/workflows/step_types/endpoint/hosts';
import { metadataCurrentIndexPattern } from '../../../../../../common/endpoint/constants';
import { collectPages } from '../../../../../endpoint/services/endpoint_host_selection';
import { parseNonNegativeInteger } from '../../common/number';
import { readErrorOutcome } from '../../common/read_error';

const FLEET_AGENT_COUNT_PART = 'fleet_agent_count';
const UNITED_METADATA_COUNT_PART = 'united_metadata_count';
const CURRENT_METADATA_COUNT_PART = 'current_metadata_count';

const ENDPOINT_PACKAGE_POLICY_KUERY = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_ENDPOINT_PACKAGE}`;

const PACKAGE_POLICY_PAGE_SIZE = 100;
const MAX_PACKAGE_POLICY_PAGES = 100;

type InventoryContextManager = StepHandlerContext<
  typeof getEndpointInventoryCountsInputSchema
>['contextManager'];

interface CountOutcome {
  count?: number;
  unauthorized?: string;
  unavailable?: string;
}

interface PackagePolicyWithAgentCount {
  agents?: unknown;
}

interface PackagePoliciesRouteResponse {
  items?: unknown;
  total?: unknown;
}

const readFleetAgentCount = async (
  contextManager: InventoryContextManager
): Promise<CountOutcome> => {
  try {
    const { items, truncated } = await collectPages<PackagePolicyWithAgentCount>(
      async (page) => {
        const query = new URLSearchParams({
          page: String(page),
          perPage: String(PACKAGE_POLICY_PAGE_SIZE),
          kuery: ENDPOINT_PACKAGE_POLICY_KUERY,
          withAgentCount: 'true',
        });
        const { body } = await contextManager.callKibanaApi<PackagePoliciesRouteResponse>({
          method: 'GET',
          path: `/api/fleet/package_policies?${query.toString()}`,
        });
        const total = parseNonNegativeInteger(body?.total);
        if (!Array.isArray(body?.items) || total === undefined) {
          throw new Error('Invalid package policies response');
        }
        return {
          items: body.items as PackagePolicyWithAgentCount[],
          total,
        };
      },
      { pageSize: PACKAGE_POLICY_PAGE_SIZE, maxPages: MAX_PACKAGE_POLICY_PAGES }
    );
    if (truncated) {
      return { unavailable: FLEET_AGENT_COUNT_PART };
    }
    return {
      count: items.reduce((total, item) => total + (parseNonNegativeInteger(item.agents) ?? 0), 0),
    };
  } catch (error) {
    return readErrorOutcome(error, FLEET_AGENT_COUNT_PART);
  }
};

const readUnitedMetadataCount = async (
  contextManager: InventoryContextManager
): Promise<CountOutcome> => {
  const query = new URLSearchParams({ pageSize: '1' });
  try {
    const { body } = await contextManager.callKibanaApi<{ total?: unknown }>({
      method: 'GET',
      path: `/api/endpoint/metadata?${query.toString()}`,
    });
    const count = parseNonNegativeInteger(body?.total);
    return count !== undefined ? { count } : { unavailable: UNITED_METADATA_COUNT_PART };
  } catch (error) {
    return readErrorOutcome(error, UNITED_METADATA_COUNT_PART);
  }
};

const readCurrentMetadataCount = async (
  contextManager: InventoryContextManager
): Promise<CountOutcome> => {
  try {
    const response = await contextManager.getScopedEsClient().count({
      index: metadataCurrentIndexPattern,
      allow_no_indices: false,
    });
    if (response._shards?.failed > 0) {
      return { unavailable: CURRENT_METADATA_COUNT_PART };
    }
    const count = parseNonNegativeInteger(response.count);
    return count !== undefined ? { count } : { unavailable: CURRENT_METADATA_COUNT_PART };
  } catch (error) {
    return readErrorOutcome(error, CURRENT_METADATA_COUNT_PART);
  }
};

export const getEndpointInventoryCountsStepDefinition = createServerStepDefinition({
  ...getEndpointInventoryCountsStepCommonDefinition,
  handler: async (context) => {
    const [fleetAgents, unitedMetadata, currentMetadata] = await Promise.all([
      readFleetAgentCount(context.contextManager),
      readUnitedMetadataCount(context.contextManager),
      readCurrentMetadataCount(context.contextManager),
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
