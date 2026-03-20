/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '../../common/lib/kibana';
import type { Entity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';

const QUERY_KEY = 'endpoint-assets-list';

/** Entity Store API endpoint for listing host entities */
const ENTITY_STORE_LIST_API = '/api/entity_store/entities/list';

export interface EndpointAssetRecord {
  id: string;
  name: string;
  hostname: string;
  platform: string;
  osName: string;
  osVersion: string;
  agentId: string;
  agentName: string;
  lastSeen: string;
  source: string;
  // Endpoint trust intelligence fields
  postureScore?: number;
  postureLevel?: string;
  adminCount?: number;
  elevatedRisk?: boolean;
  firewallEnabled?: boolean;
  diskEncryption?: string;
  detections?: {
    encodedPowershell?: number;
    suspiciousPorts?: number;
  };
}

interface EntityStoreResponse {
  records: Entity[];
  total: number;
  page: number;
  per_page: number;
}

interface UseEndpointAssetsResult {
  assets: EndpointAssetRecord[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  total: number;
  summary: {
    total: number;
    active24h: number;
    criticalPosture: number;
    elevatedPrivileges: number;
    recentlyChanged: number;
  } | null;
}

/**
 * Transform Entity Store record to EndpointAssetRecord format
 */
const transformEntityToAssetRecord = (entity: Entity): EndpointAssetRecord => {
  // Type guard for HostEntity
  const hostEntity = entity as Entity & {
    host?: {
      name?: string;
      hostname?: string[];
      os?: {
        name?: string[];
        platform?: string;
        version?: string;
        family?: string;
      };
    };
    agent?: {
      id?: string;
      name?: string;
    };
    endpoint?: {
      posture?: {
        score?: number;
        level?: string;
        firewall_enabled?: boolean;
        disk_encryption?: string;
      };
      privileges?: {
        admin_count?: number;
        elevated_risk?: boolean;
      };
      detections?: {
        encoded_powershell_count?: number;
        suspicious_ports_count?: number;
      };
    };
  };

  const host = hostEntity.host;
  const agent = hostEntity.agent;
  const endpoint = hostEntity.endpoint;

  return {
    id: entity.entity.id,
    name: entity.entity.name || host?.name || 'Unknown',
    hostname: host?.hostname?.[0] || host?.name || '',
    platform: host?.os?.platform || host?.os?.family || 'unknown',
    osName: host?.os?.name?.[0] || 'Unknown',
    osVersion: host?.os?.version || '',
    agentId: agent?.id || '',
    agentName: agent?.name || '',
    lastSeen: entity['@timestamp'] || '',
    source: entity.entity.source || 'osquery',
    // Endpoint trust fields
    postureScore: endpoint?.posture?.score ? Number(endpoint.posture.score) : undefined,
    postureLevel: endpoint?.posture?.level,
    adminCount: endpoint?.privileges?.admin_count ? Number(endpoint.privileges.admin_count) : undefined,
    elevatedRisk: endpoint?.privileges?.elevated_risk === true || endpoint?.privileges?.elevated_risk === 'true' as unknown as boolean,
    firewallEnabled: endpoint?.posture?.firewall_enabled === true || endpoint?.posture?.firewall_enabled === 'true' as unknown as boolean,
    diskEncryption: endpoint?.posture?.disk_encryption,
    detections: {
      encodedPowershell: endpoint?.detections?.encoded_powershell_count ? Number(endpoint.detections.encoded_powershell_count) : 0,
      suspiciousPorts: endpoint?.detections?.suspicious_ports_count ? Number(endpoint.detections.suspicious_ports_count) : 0,
    },
  };
};

/**
 * Hook for fetching endpoint assets from the Entity Store.
 *
 * Queries the Entity Store API which aggregates data from
 * endpoint-assets-osquery-* via the host entity engine.
 */
export const useEndpointAssets = (): UseEndpointAssetsResult => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchAssets = useCallback(async (): Promise<{
    assets: EndpointAssetRecord[];
    total: number;
  }> => {
    const { http } = services;
    if (!http) {
      throw new Error('HTTP service not available');
    }

    // Use Entity Store API to fetch host entities
    const response = await http.get<EntityStoreResponse>(ENTITY_STORE_LIST_API, {
      query: {
        entity_types: 'host',
        page: 1,
        per_page: 500,
        sort_field: '@timestamp',
        sort_order: 'desc',
      },
      headers: {
        'elastic-api-version': '2023-10-31',
      },
    });

    // Transform Entity Store records to EndpointAssetRecord format
    const assets: EndpointAssetRecord[] = response.records.map(transformEntityToAssetRecord);

    return { assets, total: response.total };
  }, [services]);

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchAssets,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  }, [queryClient]);

  // Calculate summary statistics from the data
  const summary = useMemo(() => {
    if (!data?.assets) return null;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const active24h = data.assets.filter((asset) => {
      const lastSeen = new Date(asset.lastSeen);
      return lastSeen >= oneDayAgo;
    }).length;

    // Calculate critical posture (score < 60 or level CRITICAL/HIGH)
    const criticalPosture = data.assets.filter((asset) => {
      if (asset.postureLevel) {
        const level = asset.postureLevel.toUpperCase();
        return level === 'CRITICAL' || level === 'HIGH';
      }
      if (asset.postureScore !== undefined) {
        return asset.postureScore < 60;
      }
      return false;
    }).length;

    // Calculate elevated privileges from Entity Store data
    const elevatedPrivileges = data.assets.filter((asset) => asset.elevatedRisk === true).length;

    return {
      total: data.total,
      active24h,
      criticalPosture,
      elevatedPrivileges,
      recentlyChanged: 0, // Drift tracking - future enhancement
    };
  }, [data]);

  return {
    assets: data?.assets ?? [],
    loading: isLoading,
    error: error as Error | null,
    refresh,
    total: data?.total ?? 0,
    summary,
  };
};
