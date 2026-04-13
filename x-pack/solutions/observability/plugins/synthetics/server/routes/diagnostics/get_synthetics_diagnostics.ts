/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import {
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  type PackagePolicy,
} from '@kbn/fleet-plugin/common';
import { getSyntheticsDynamicSettings } from '../../saved_objects/synthetics_settings';
import { syntheticsParamType } from '../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { OverviewStatusState, SyntheticsParams } from '../../../common/runtime_types';
import type { SyntheticsServerSetup } from '../../types';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../types';
import type { OverviewStatusQuery } from '../common';
import { OverviewStatusService } from '../overview_status/overview_status_service';
import { getPrivateLocationsAndAgentPolicies } from '../settings/private_locations/get_private_locations';
import { getAgentPoliciesAsInternalUser } from '../settings/private_locations/get_agent_policies';
import {
  countMonitorsByLocationId,
  redactMonitorAttributesForDiagnostics,
} from './redact_monitor_attributes_for_diagnostics';

const SYNTHETICS_PACKAGE_POLICIES_KUERY = 'ingest-package-policies.package.name:synthetics';

const PACKAGE_POLICY_REFERENCE_TYPES = new Set([
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
]);

const summarizePackagePolicy = (policy: PackagePolicy) => ({
  id: policy.id,
  name: policy.name,
  description: policy.description,
  namespace: policy.namespace,
  enabled: policy.enabled,
  is_managed: policy.is_managed,
  revision: policy.revision,
  policy_ids: policy.policy_ids,
  spaceIds: policy.spaceIds,
  package: policy.package
    ? {
        name: policy.package.name,
        title: policy.package.title,
        version: policy.package.version,
      }
    : undefined,
  updated_at: policy.updated_at,
  updated_by: policy.updated_by,
  created_at: policy.created_at,
  created_by: policy.created_by,
});

const listAllSyntheticsPackagePolicies = async (
  savedObjectsClient: SavedObjectsClientContract,
  server: SyntheticsServerSetup
): Promise<PackagePolicy[]> => {
  const items: PackagePolicy[] = [];
  let page = 1;
  const perPage = 500;
  let hasMore = true;

  while (hasMore) {
    const result = await server.fleet.packagePolicyService.list(savedObjectsClient, {
      kuery: SYNTHETICS_PACKAGE_POLICIES_KUERY,
      page,
      perPage,
      sortField: 'name',
      sortOrder: 'asc',
    });
    items.push(...result.items);
    hasMore = result.items.length === perPage;
    page += 1;
  }

  return items;
};

const collectGlobalParamMetadata = async (savedObjectsClient: SavedObjectsClientContract) => {
  const finder = savedObjectsClient.createPointInTimeFinder<SyntheticsParams>({
    type: syntheticsParamType,
    perPage: 500,
  });

  const params: Array<{
    id: string;
    key: string;
    description?: string;
    tags?: string[];
    namespaces?: string[];
  }> = [];

  for await (const result of finder.find()) {
    for (const so of result.saved_objects) {
      const { key, description, tags } = so.attributes;
      if (typeof key !== 'string') {
        continue;
      }
      params.push({
        id: so.id,
        key,
        ...(typeof description === 'string' ? { description } : {}),
        ...(Array.isArray(tags) ? { tags: tags as string[] } : {}),
        namespaces: so.namespaces,
      });
    }
  }

  void finder.close();

  return params;
};

const getOverviewStatusForDiagnostics = async (
  routeContext: RouteContext
): Promise<OverviewStatusState | { error: string }> => {
  try {
    return await new OverviewStatusService(
      routeContext as RouteContext<Record<string, unknown>, OverviewStatusQuery>
    ).getOverviewStatus();
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
};

export const getSyntheticsDiagnosticsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_DIAGNOSTICS,
  validate: {},
  writeAccess: false,
  handler: async (routeContext) => {
    const {
      monitorConfigRepository,
      savedObjectsClient,
      server,
      spaceId,
      syntheticsEsClient,
      syntheticsMonitorClient,
    } = routeContext;

    const [
      monitorSavedObjects,
      privateLocationsContext,
      agentPolicies,
      packagePolicies,
      globalParams,
      dynamicSettings,
      overviewStatus,
    ] = await Promise.all([
      monitorConfigRepository.getAll({}),
      getPrivateLocationsAndAgentPolicies(savedObjectsClient, syntheticsMonitorClient),
      getAgentPoliciesAsInternalUser({ server, withAgentCount: true, spaceId }),
      listAllSyntheticsPackagePolicies(savedObjectsClient, server),
      collectGlobalParamMetadata(savedObjectsClient),
      getSyntheticsDynamicSettings(savedObjectsClient),
      getOverviewStatusForDiagnostics(routeContext),
    ]);

    const referencedPackagePolicyIds = new Set<string>();
    for (const so of monitorSavedObjects) {
      for (const ref of so.references ?? []) {
        if (ref.id && PACKAGE_POLICY_REFERENCE_TYPES.has(ref.type)) {
          referencedPackagePolicyIds.add(ref.id);
        }
      }
    }

    const monitors = monitorSavedObjects.map((so) => ({
      type: so.type,
      id: so.id,
      namespaces: so.namespaces,
      updated_at: so.updated_at,
      created_at: so.created_at,
      references: so.references,
      attributes: redactMonitorAttributesForDiagnostics(so.attributes as Record<string, unknown>),
    }));

    let indices:
      | {
          mappings?: unknown;
          settings?: unknown;
          stats?: unknown;
          error?: string;
        }
      | undefined;

    try {
      const [mappings, settings, stats] = await Promise.all([
        syntheticsEsClient.baseESClient.indices.getMapping({
          index: 'synthetics-*',
          ignore_unavailable: true,
          allow_no_indices: true,
        }),
        syntheticsEsClient.baseESClient.indices.getSettings({
          index: 'synthetics-*',
          ignore_unavailable: true,
          allow_no_indices: true,
        }),
        syntheticsEsClient.baseESClient.indices.stats({
          index: 'synthetics-*',
          metric: ['store', 'docs'],
        }),
      ]);
      indices = { mappings, settings, stats };
    } catch (e) {
      indices = {
        error: e instanceof Error ? e.message : String(e),
      };
    }

    const packagePolicySummaries = packagePolicies.map(summarizePackagePolicy);

    return {
      meta: {
        spaceId,
        kibanaVersion: server.stackVersion,
      },
      overviewStatus,
      monitors,
      monitorCountByLocationId: countMonitorsByLocationId(monitorSavedObjects),
      referencedPackagePolicyIds: [...referencedPackagePolicyIds].sort(),
      packagePolicies: packagePolicySummaries,
      privateLocations: privateLocationsContext.locations,
      privateLocationAgentPolicies: privateLocationsContext.agentPolicies,
      fleetAgentPolicies: agentPolicies,
      globalParams,
      dynamicSettings,
      indices,
      syntheticsServiceSyncErrors: syntheticsMonitorClient.syntheticsService.syncErrors,
    };
  },
});
