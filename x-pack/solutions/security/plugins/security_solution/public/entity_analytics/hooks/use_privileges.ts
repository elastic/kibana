/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import { useKibana } from '../../common/lib/kibana';
import type {
  PrivilegesSummary,
  PrivilegeAsset,
  PrivilegeRiskLevel,
  TopAdminUser,
} from '../../../common/endpoint_assets';

const PRIVILEGES_QUERY_KEY = 'endpoint-assets-privileges';
// Use Entity Store index - aggregates data from endpoint-assets-osquery-* via host entity engine
const ENTITY_STORE_HOST_INDEX = '.entities.v1.latest.security_host_*';

/**
 * Determine risk level based on admin count
 * - Low: 0-2 admins (normal)
 * - Medium: 3-4 admins (elevated)
 * - High: 5+ admins (excessive)
 */
const getPrivilegeRiskLevel = (adminCount: number): PrivilegeRiskLevel => {
  if (adminCount <= 2) return 'low';
  if (adminCount <= 4) return 'medium';
  return 'high';
};

/**
 * Classify admin user type based on username patterns
 */
const classifyUserType = (username: string): TopAdminUser['userType'] => {
  const lower = username.toLowerCase();

  // Built-in accounts
  if (
    lower === 'administrator' ||
    lower === 'admin' ||
    lower === 'root' ||
    lower === 'localadmin'
  ) {
    return 'built-in';
  }

  // Service accounts
  if (lower.startsWith('svc_') || lower.startsWith('service_') || lower.includes('service')) {
    return 'service';
  }

  // Suspicious patterns
  if (
    lower.startsWith('temp') ||
    lower.startsWith('test') ||
    lower.startsWith('tmp') ||
    lower.includes('_temp') ||
    lower.includes('_test') ||
    lower === 'guest'
  ) {
    return 'suspicious';
  }

  return 'user';
};

/**
 * Extract admin users from Entity Store or transform output
 * Handles both Entity Store format (simple array) and transform format (nested objects)
 *
 * Entity Store format: local_admins = ["Administrator", "john.doe"]
 * Transform format: local_admins.admins_list = { "Administrator": 5, "john.doe": 2 }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractAdminUsers = (privileges: any): string[] => {
  if (!privileges) return [];

  // Path 1: Entity Store format - direct array of strings
  if (Array.isArray(privileges.local_admins)) {
    return privileges.local_admins.filter((u: string) => u && u !== '');
  }

  // Path 2: Flattened terms agg format (transform output)
  // Structure: local_admins.admins_list = { username: doc_count, ... }
  if (
    privileges.local_admins?.admins_list &&
    typeof privileges.local_admins.admins_list === 'object' &&
    !Array.isArray(privileges.local_admins.admins_list)
  ) {
    return Object.keys(privileges.local_admins.admins_list).filter(
      (k: string) => k && k !== ''
    );
  }

  // Path 3: Standard buckets array format (if not flattened)
  if (privileges.local_admins?.admins_list?.buckets) {
    return privileges.local_admins.admins_list.buckets
      .map((b: { key: string }) => b.key)
      .filter((k: string) => k && k !== '');
  }

  // Path 4: direct terms agg buckets
  if (privileges.local_admins?.buckets) {
    return privileges.local_admins.buckets
      .map((b: { key: string }) => b.key)
      .filter((k: string) => k && k !== '');
  }

  return [];
};

/**
 * Get admin count from Entity Store or transform output
 *
 * Entity Store may store values as strings due to ingest pipeline
 * Entity Store format: admin_count = "0" or 0
 * Transform format: admin_count.count = <number> (nested object)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAdminCount = (privileges: any): number => {
  if (!privileges) return 0;

  const adminCount = privileges.admin_count;

  // Path 1: Entity Store format - direct number or string number
  if (typeof adminCount === 'number') {
    return adminCount;
  }
  if (typeof adminCount === 'string') {
    const parsed = parseInt(adminCount, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Path 2: Transform flattened cardinality (admin_count.count = number)
  if (typeof adminCount?.count === 'number') {
    return adminCount.count;
  }
  if (typeof adminCount?.count === 'string') {
    const parsed = parseInt(adminCount.count, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Path 3: Nested cardinality value (admin_count.count.value)
  if (typeof adminCount?.count?.value === 'number') {
    return adminCount.count.value;
  }

  // Path 4: Fall back to extracted admin users length
  const admins = extractAdminUsers(privileges);
  return admins.length;
};

/**
 * Extract nested value from Entity Store using dot notation
 * Handles both single values (newestValue) and arrays (collect)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNestedValue = (obj: any, path: string): string => {
  if (!obj) return '-';

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return '-';
    current = current[part];
  }

  // Handle arrays (from collect fields) - return first value
  if (Array.isArray(current)) {
    return current.length > 0 ? String(current[0]) : '-';
  }

  // Handle top_metrics format
  if (current && typeof current === 'object') {
    const keys = Object.keys(current);
    if (keys.length === 1) {
      const val = current[keys[0]];
      return val !== null && val !== undefined ? String(val) : '-';
    }
  }

  return current !== null && current !== undefined ? String(current) : '-';
};

// Transform document type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransformDocument = Record<string, any>;

export interface UsePrivilegesResult {
  summary: PrivilegesSummary | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook to fetch and aggregate privilege data from endpoint assets
 *
 * Queries the Entity Store host index which aggregates data from
 * endpoint-assets-osquery-* via the host entity engine.
 */
export const usePrivileges = (): UsePrivilegesResult => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchPrivileges = useCallback(async (): Promise<PrivilegesSummary> => {
    const { data } = services;
    if (!data?.search) {
      throw new Error('Search service not available');
    }

    type PrivilegesSearchRequest = IKibanaSearchRequest<estypes.SearchRequest>;
    type PrivilegesSearchResponse = IKibanaSearchResponse<
      estypes.SearchResponse<TransformDocument, never>
    >;

    const searchRequest: estypes.SearchRequest = {
      index: ENTITY_STORE_HOST_INDEX,
      size: 500,
    };

    const response = await lastValueFrom(
      data.search.search<PrivilegesSearchRequest, PrivilegesSearchResponse>({
        params: searchRequest as PrivilegesSearchRequest['params'],
      })
    );

    const hits = response.rawResponse.hits.hits;

    // DEBUG: Log privileges data from Entity Store
    // eslint-disable-next-line no-console
    console.log('[Privileges] Entity Store data:', {
      totalHits: hits.length,
      firstDoc: hits[0]?._source,
      privileges: hits.map((h) => ({
        name: h._source?.entity?.name,
        privileges: h._source?.endpoint?.privileges,
        adminCount: h._source?.endpoint?.privileges?.admin_count,
        localAdmins: h._source?.endpoint?.privileges?.local_admins,
      })),
    });

    // Aggregate privilege data
    const assets: PrivilegeAsset[] = [];
    const adminUserMap: Map<string, Set<string>> = new Map(); // username -> set of asset IDs
    let totalAdminAccounts = 0;
    let assetsWithElevatedRisk = 0;
    const riskDistribution = { low: 0, medium: 0, high: 0 };

    for (const hit of hits) {
      const doc = hit._source;
      if (!doc) continue;

      const entityId = getNestedValue(doc, 'entity.id');
      const entityName = getNestedValue(doc, 'entity.name');
      const platform = getNestedValue(doc, 'host.os.platform');

      const adminCount = getAdminCount(doc.endpoint?.privileges);
      const adminUsers = extractAdminUsers(doc.endpoint?.privileges);
      const riskLevel = getPrivilegeRiskLevel(adminCount);
      const hasElevatedRisk = adminCount > 2;

      // Track per-asset data
      assets.push({
        entityId,
        entityName,
        platform,
        adminCount,
        adminUsers,
        riskLevel,
        hasElevatedRisk,
      });

      // Aggregate totals
      totalAdminAccounts += adminCount;
      if (hasElevatedRisk) {
        assetsWithElevatedRisk++;
      }

      // Track risk distribution
      riskDistribution[riskLevel]++;

      // Track admin users across fleet
      for (const username of adminUsers) {
        if (!adminUserMap.has(username)) {
          adminUserMap.set(username, new Set());
        }
        adminUserMap.get(username)!.add(entityId);
      }
    }

    // Calculate average admin count
    const averageAdminCount = assets.length > 0 ? totalAdminAccounts / assets.length : 0;

    // Build top admin users list
    const topAdminUsers: TopAdminUser[] = Array.from(adminUserMap.entries())
      .map(([username, assetIds]) => ({
        username,
        assetCount: assetIds.size,
        userType: classifyUserType(username),
      }))
      .sort((a, b) => b.assetCount - a.assetCount);

    // Sort assets by admin count (highest first)
    assets.sort((a, b) => b.adminCount - a.adminCount);

    return {
      totalAdminAccounts,
      assetsWithElevatedRisk,
      averageAdminCount,
      uniqueAdminUsers: adminUserMap.size,
      riskDistribution,
      assets,
      topAdminUsers,
    };
  }, [services]);

  const { data, isLoading, error } = useQuery({
    queryKey: [PRIVILEGES_QUERY_KEY],
    queryFn: fetchPrivileges,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [PRIVILEGES_QUERY_KEY] });
  }, [queryClient]);

  return {
    summary: data ?? null,
    loading: isLoading,
    error: error as Error | null,
    refresh,
  };
};
