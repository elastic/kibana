/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiStat,
  EuiPanel,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiBadge,
  EuiIcon,
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiDescriptionList,
  EuiHorizontalRule,
  EuiText,
  EuiLink,
  EuiCode,
  EuiAccordion,
  EuiCallOut,
  EuiHealth,
  EuiToolTip,
} from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useKibana } from '../../common/lib/kibana';
import { PlatformIcon } from '../../management/components/endpoint_responder/components/header_info/platforms';
import { PrivilegesContent } from './privileges_content';
import { usePrivileges } from '../hooks/use_privileges';
import type { FindingType } from '../../../common/endpoint_assets';
import { SecurityFindingsDetailFlyout } from '../components/security_findings_detail_flyout';

const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.pageTitle',
  {
    defaultMessage: 'Endpoint Assets',
  }
);

const PAGE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.pageSubtitle',
  {
    defaultMessage: 'Security Posture & Asset Visibility powered by Osquery',
  }
);

const TAB_INVENTORY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.tabInventory',
  { defaultMessage: 'Inventory' }
);

const TAB_POSTURE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.tabPosture',
  { defaultMessage: 'Security Posture' }
);

const TAB_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.tabPrivileges',
  { defaultMessage: 'Privileges' }
);

const TAB_DRIFT = i18n.translate('xpack.securitySolution.entityAnalytics.endpointAssets.tabDrift', {
  defaultMessage: 'Drift',
});

// Constants - Use Entity Store index for all queries
// The Entity Store aggregates data from endpoint-assets-osquery-* via the host entity engine
const ENTITY_STORE_HOST_INDEX = '.entities.v1.latest.security_host_*';
const QUERY_KEY = 'endpoint-assets-entity-store';
const ASSET_DETAIL_QUERY_KEY = 'endpoint-asset-detail';

// Types
interface EntityStoreHit {
  '@timestamp': string;
  entity: {
    id: string;
    name: string;
    source: string;
  };
  host?: {
    id?: string;
    name?: string;
    hostname?: string;
    os?: {
      name?: string;
      platform?: string;
      version?: string;
    };
  };
  agent?: {
    id?: string;
    name?: string;
  };
}

interface EndpointAssetRecord {
  id: string;
  name: string;
  hostname: string;
  platform: string;
  osName: string;
  osVersion: string;
  agentName: string;
  lastSeen: string;
  source: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssetDetailDocument = Record<string, any>;

type TabId = 'inventory' | 'posture' | 'privileges' | 'drift';

// Helper functions
const normalizePlatform = (platform: string): 'windows' | 'macos' | 'linux' | null => {
  const p = platform?.toLowerCase();
  switch (p) {
    case 'windows':
      return 'windows';
    case 'darwin':
    case 'macos':
      return 'macos';
    case 'linux':
    case 'ubuntu':
    case 'rhel':
    case 'centos':
    case 'debian':
      return 'linux';
    default:
      return null;
  }
};

const getPlatformIcon = (platform: string): React.ReactNode => {
  const normalizedPlatform = normalizePlatform(platform);
  if (normalizedPlatform) {
    return <PlatformIcon platform={normalizedPlatform} size="m" />;
  }
  return <EuiIcon type="desktop" size="m" />;
};

const getPlatformLabel = (platform: string): string => {
  switch (platform?.toLowerCase()) {
    case 'darwin':
      return 'macOS';
    case 'rhel':
      return 'RHEL';
    default:
      return platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Unknown';
  }
};

const formatLastSeen = (date: string): string => {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)} days ago`;
  return d.toLocaleDateString();
};

const formatDateTime = (date: string): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

/**
 * Extracts the actual value from transform top_metrics result.
 * Transform stores values like: { "host.id": "actual-value" }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractValue = (obj: any): string => {
  if (obj === null || obj === undefined) return '-';
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      const val = obj[keys[0]];
      if (val === null || val === undefined) return '-';
      return String(val);
    }
    return JSON.stringify(obj);
  }
  return String(obj);
};

/**
 * Flattens nested object into dot-notation key-value pairs
 */
const flattenObject = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: Record<string, any>,
  prefix = ''
): Array<{ key: string; value: string }> => {
  const result: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result.push({ key: fullKey, value: '-' });
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Check if it's a transform top_metrics result (single key with value)
      const objKeys = Object.keys(value);
      if (objKeys.length === 1 && objKeys[0].includes('.')) {
        // This is a top_metrics result like { "host.id": "value" }
        result.push({ key: fullKey, value: extractValue(value) });
      } else {
        // Recurse into nested object
        result.push(...flattenObject(value, fullKey));
      }
    } else if (Array.isArray(value)) {
      // Format arrays nicely - join with comma or show first value for single items
      const formatted = value.length === 1 ? String(value[0]) : value.join(', ');
      result.push({ key: fullKey, value: formatted || '-' });
    } else {
      result.push({ key: fullKey, value: String(value) });
    }
  }

  return result;
};

// Hook to fetch endpoint assets from Entity Store
const useEndpointAssetsFromEntityStore = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchAssets = useCallback(async (): Promise<{
    assets: EndpointAssetRecord[];
    total: number;
  }> => {
    const { data } = services;
    if (!data?.search) {
      throw new Error('Search service not available');
    }

    type EntitySearchRequest = IKibanaSearchRequest<estypes.SearchRequest>;
    type EntitySearchResponse = IKibanaSearchResponse<
      estypes.SearchResponse<EntityStoreHit, never>
    >;

    const searchRequest: estypes.SearchRequest = {
      index: ENTITY_STORE_HOST_INDEX,
      size: 500,
      sort: [{ '@timestamp': 'desc' }],
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: 'entity.id',
              },
            },
          ],
        },
      },
    };

    const response = await lastValueFrom(
      data.search.search<EntitySearchRequest, EntitySearchResponse>({
        params: searchRequest as EntitySearchRequest['params'],
      })
    );

    const hits = response.rawResponse.hits.hits;
    const total =
      typeof response.rawResponse.hits.total === 'number'
        ? response.rawResponse.hits.total
        : response.rawResponse.hits.total?.value ?? 0;

    // DEBUG: Log Inventory tab Entity Store data
    // eslint-disable-next-line no-console
    console.log('[Inventory Tab] Entity Store data:', {
      index: ENTITY_STORE_HOST_INDEX,
      totalHits: hits.length,
      total,
      documents: hits.map((h) => ({
        entityId: h._source?.entity?.id,
        entityName: h._source?.entity?.name,
        source: h._source?.entity?.source,
        host: h._source?.host,
        agent: h._source?.agent,
        endpoint: h._source?.endpoint,
      })),
    });

    const assets: EndpointAssetRecord[] = hits.map((hit) => {
      const source = hit._source!;
      // Entity Store uses arrays for 'collect' fields, single values for 'newestValue' fields
      const getFirst = (val: unknown): string => {
        if (Array.isArray(val)) return val[0] || '';
        if (typeof val === 'string') return val;
        return '';
      };
      return {
        id: source.entity.id,
        name: source.entity.name || getFirst(source.host?.hostname) || getFirst(source.host?.name) || 'Unknown',
        hostname: getFirst(source.host?.hostname) || getFirst(source.host?.name) || '',
        platform: source.host?.os?.platform || getFirst(source.host?.os?.type) || 'unknown',
        osName: getFirst(source.host?.os?.name) || 'Unknown',
        osVersion: source.host?.os?.version || '',
        agentName: source.agent?.name || '',
        lastSeen: source['@timestamp'],
        source: source.entity.source,
      };
    });

    return { assets, total };
  }, [services]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchAssets,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  }, [queryClient]);

  const summary = useMemo(() => {
    if (!data?.assets) return null;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const active24h = data.assets.filter((asset) => {
      const lastSeen = new Date(asset.lastSeen);
      return lastSeen >= oneDayAgo;
    }).length;

    return {
      total: data.total,
      active24h,
    };
  }, [data]);

  return {
    assets: data?.assets ?? [],
    loading: isLoading,
    error: error as Error | null,
    refresh,
    refetch,
    total: data?.total ?? 0,
    summary,
  };
};

// Hook to fetch asset details from transform output index
const useAssetDetails = (entityId: string | null) => {
  const { services } = useKibana();

  const fetchDetails = useCallback(async (): Promise<AssetDetailDocument | null> => {
    if (!entityId) return null;

    const { data } = services;
    if (!data?.search) {
      throw new Error('Search service not available');
    }

    type DetailSearchRequest = IKibanaSearchRequest<estypes.SearchRequest>;
    type DetailSearchResponse = IKibanaSearchResponse<
      estypes.SearchResponse<AssetDetailDocument, never>
    >;

    const searchRequest: estypes.SearchRequest = {
      index: ENTITY_STORE_HOST_INDEX,
      size: 1,
      query: {
        term: {
          'entity.id': entityId,
        },
      },
    };

    const response = await lastValueFrom(
      data.search.search<DetailSearchRequest, DetailSearchResponse>({
        params: searchRequest as DetailSearchRequest['params'],
      })
    );

    const hits = response.rawResponse.hits.hits;

    // DEBUG: Log Asset Detail flyout Entity Store data
    // eslint-disable-next-line no-console
    console.log('[Asset Detail Flyout] Entity Store data:', {
      index: ENTITY_STORE_HOST_INDEX,
      entityId,
      found: hits.length > 0,
      document: hits[0]?._source,
    });

    if (hits.length === 0) return null;

    return hits[0]._source ?? null;
  }, [entityId, services]);

  const { data, isLoading, error } = useQuery({
    queryKey: [ASSET_DETAIL_QUERY_KEY, entityId],
    queryFn: fetchDetails,
    enabled: !!entityId,
    staleTime: 30000,
  });

  return {
    details: data ?? null,
    loading: isLoading,
    error: error as Error | null,
  };
};

// Types for Security Posture
type PostureStatus = 'PASS' | 'FAIL' | 'UNKNOWN';
type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

interface PostureCheck {
  name: string;
  status: PostureStatus;
  points: number; // Points deducted if failed
}

interface SecurityFinding {
  type: string;
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  latestDetection?: string;
  latestVtLink?: string;
}

interface AssetPostureIssue {
  entityId: string;
  entityName: string;
  platform: string;
  issues: string[];
  securityFindings: SecurityFinding[];
}

interface AssetMissingData {
  entityId: string;
  entityName: string;
  platform: string;
  missingChecks: string[];
  suggestedQueries: Array<{ name: string; description: string }>;
}

interface AssetWithScore {
  entityId: string;
  entityName: string;
  platform: string;
  score: number;
  riskLevel: RiskLevel;
  checks: {
    diskEncryption: PostureStatus;
    firewall: PostureStatus;
    secureBoot: PostureStatus;
    shellHistory: PostureStatus;
    adminCount: PostureStatus;
  };
  adminCount: number;
  failedChecks: string[];
}

interface RiskDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface SecurityPostureSummary {
  passed: number;
  failed: number;
  unknown: number;
  totalChecks: number;
  failedChecks: Array<{
    check: string;
    failedCount: number;
    severity: string;
    affectedAssets: string[];
  }>;
  securityFindings: Array<{
    type: string;
    assetsAffected: number;
    affectedAssetNames: string[];
    latestDetection: string;
    severity: string;
    latestVtLink?: string;
  }>;
  assetsWithIssues: AssetPostureIssue[];
  assetsWithMissingData: AssetMissingData[];
  assetsWithScores: AssetWithScore[];
  riskDistribution: RiskDistribution;
}

/**
 * Read the already-processed posture fields from the ingest pipeline.
 * Note: Entity Store may store values as strings due to mapping
 * - disk_encryption: "OK" | "FAIL" | "UNKNOWN"
 * - firewall_enabled: "true" | "false" | true | false
 * - secure_boot: "true" | "false" | true | false
 * - score: "100" | 100 (string or number)
 * - level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
 */

// Helper to parse string booleans
const parseBoolean = (val: unknown): boolean | undefined => {
  if (val === true || val === 'true') return true;
  if (val === false || val === 'false') return false;
  return undefined;
};

// Helper to parse string numbers
const parseNumber = (val: unknown): number | undefined => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

// Interpret disk encryption from processed field
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDiskEncryptionStatus = (posture: any): PostureStatus => {
  const value = posture?.disk_encryption;
  if (value === 'OK') return 'PASS';
  if (value === 'FAIL') return 'FAIL';
  return 'UNKNOWN';
};

// Interpret firewall from processed boolean field (handles string "true"/"false")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFirewallStatus = (posture: any): PostureStatus => {
  const value = parseBoolean(posture?.firewall_enabled);
  // Check if we have data - if firewall_enabled exists at all
  if (value === undefined) return 'UNKNOWN';
  return value === true ? 'PASS' : 'FAIL';
};

// Extract value from security findings (no .value wrapper, direct object)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractSecurityValue = (obj: any): string | null => {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  const keys = Object.keys(obj);
  if (keys.length === 0) return null;
  const firstKey = keys[0];
  const value = obj[firstKey];
  if (value === null || value === undefined || value === '' || value === 'null') return null;
  return String(value);
};

// Check if security findings exist
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hasSecurityFindings = (security: any): boolean => {
  return (
    (security?.suspicious_tasks?.doc_count || 0) > 0 ||
    (security?.suspicious_services?.doc_count || 0) > 0 ||
    (security?.unsigned_processes?.doc_count || 0) > 0
  );
};

// Interpret secure boot from processed boolean field (handles string "true"/"false")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSecureBootStatus = (posture: any): PostureStatus => {
  const value = parseBoolean(posture?.secure_boot);
  // Check if we have data - if secure_boot exists at all
  if (value === undefined) return 'UNKNOWN';
  return value === true ? 'PASS' : 'FAIL';
};

// Get admin count from privileges (handles string numbers like "2")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAdminCount = (privileges: any): number => {
  const adminCount = privileges?.admin_count;

  // Handle string or number directly
  const parsed = parseNumber(adminCount);
  if (parsed !== undefined) return parsed;

  // Handle nested object format
  if (typeof adminCount === 'object' && adminCount?.count !== undefined) {
    const nestedParsed = parseNumber(adminCount.count);
    if (nestedParsed !== undefined) return nestedParsed;
    return parseNumber(adminCount.count?.value) ?? 0;
  }
  return 0;
};

// Check if admin count is excessive (>2 is considered a risk)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAdminCountStatus = (adminCount: number, privileges: any): PostureStatus => {
  // Check if we have any privilege data collected
  const hasData = privileges?.admin_count !== undefined || privileges?.local_admins !== undefined;
  if (!hasData) return 'UNKNOWN';
  // If we have data but count is 0, that means we collected data and found no admins (PASS)
  return adminCount <= 2 ? 'PASS' : 'FAIL';
};

/**
 * Calculate posture score based on RFC scoring rules:
 * Base Score: 100
 * Deductions:
 * - Disk encryption disabled:     -25 points
 * - Firewall disabled:            -20 points
 * - Secure boot disabled:         -15 points
 * - Local admin count > 2:        -10 points
 * - Suspicious shell config:      -10 points
 */
const calculatePostureScore = (checks: {
  diskEncryption: PostureStatus;
  firewall: PostureStatus;
  secureBoot: PostureStatus;
  shellHistory: PostureStatus;
  adminCount: PostureStatus;
}): number => {
  let score = 100;

  // Only deduct points for FAIL status, not UNKNOWN
  if (checks.diskEncryption === 'FAIL') score -= 25;
  if (checks.firewall === 'FAIL') score -= 20;
  if (checks.secureBoot === 'FAIL') score -= 15;
  if (checks.adminCount === 'FAIL') score -= 10;
  if (checks.shellHistory === 'FAIL') score -= 10;

  return Math.max(0, score);
};

/**
 * Determine risk level from posture score:
 * - 90-100: LOW
 * - 70-89:  MEDIUM
 * - 50-69:  HIGH
 * - 0-49:   CRITICAL
 */
const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 90) return 'low';
  if (score >= 70) return 'medium';
  if (score >= 50) return 'high';
  return 'critical';
};

const getRiskLevelColor = (level: RiskLevel): string => {
  switch (level) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'default';
    case 'low':
      return 'success';
  }
};

// Hook to fetch security posture data
const useSecurityPosture = () => {
  const { services } = useKibana();

  const fetchPosture = useCallback(async (): Promise<SecurityPostureSummary> => {
    const { data } = services;
    if (!data?.search) {
      throw new Error('Search service not available');
    }

    type PostureSearchRequest = IKibanaSearchRequest<estypes.SearchRequest>;
    type PostureSearchResponse = IKibanaSearchResponse<
      estypes.SearchResponse<AssetDetailDocument, never>
    >;

    const searchRequest: estypes.SearchRequest = {
      index: ENTITY_STORE_HOST_INDEX,
      size: 500,
    };

    const response = await lastValueFrom(
      data.search.search<PostureSearchRequest, PostureSearchResponse>({
        params: searchRequest as PostureSearchRequest['params'],
      })
    );

    const hits = response.rawResponse.hits.hits;

    // DEBUG: Log Security Posture tab Entity Store data
    // eslint-disable-next-line no-console
    console.log('[Security Posture Tab] Entity Store data:', {
      index: ENTITY_STORE_HOST_INDEX,
      totalHits: hits.length,
      documents: hits.map((h) => ({
        entityId: h._source?.entity?.id,
        entityName: h._source?.entity?.name,
        posture: h._source?.endpoint?.posture,
        privileges: h._source?.endpoint?.privileges,
        security: h._source?.endpoint?.security,
        shell: h._source?.endpoint?.shell,
      })),
    });

    let passed = 0;
    let failed = 0;
    let unknown = 0;

    const failedChecksMap: Record<
      string,
      { count: number; assets: Set<string>; assetNames: string[] }
    > = {
      'Disk Encryption Disabled': { count: 0, assets: new Set(), assetNames: [] },
      'Firewall Disabled': { count: 0, assets: new Set(), assetNames: [] },
      'Secure Boot Disabled': { count: 0, assets: new Set(), assetNames: [] },
      'Excessive Local Admins': { count: 0, assets: new Set(), assetNames: [] },
      'Suspicious Shell Config': { count: 0, assets: new Set(), assetNames: [] },
    };

    const securityFindingsMap: Record<
      string,
      {
        count: number;
        assets: Set<string>;
        assetNames: string[];
        latestDetection: string;
        latestVtLink?: string;
      }
    > = {};
    const assetsWithIssues: AssetPostureIssue[] = [];
    const assetsWithMissingData: AssetMissingData[] = [];
    const assetsWithScores: AssetWithScore[] = [];
    const riskDistribution: RiskDistribution = { critical: 0, high: 0, medium: 0, low: 0 };

    // Query suggestions by platform and check type
    const getQuerySuggestions = (
      checkType: string,
      plat: string
    ): { name: string; description: string } => {
      const platformLower = plat.toLowerCase();
      if (checkType === 'Disk Encryption') {
        if (platformLower === 'windows') {
          return { name: 'bitlocker_info', description: 'Query BitLocker encryption status' };
        }
        return {
          name: 'disk_encryption / mounts',
          description: 'Query LUKS/dm-crypt encryption status',
        };
      }
      if (checkType === 'Firewall') {
        if (platformLower === 'windows') {
          return {
            name: 'windows_security_center',
            description: 'Query Windows Firewall status via Security Center',
          };
        }
        return { name: 'iptables', description: 'Query iptables/firewalld rules' };
      }
      if (checkType === 'Shell History') {
        if (platformLower === 'windows') {
          return { name: 'powershell_events', description: 'Query PowerShell command history' };
        }
        return { name: 'shell_history', description: 'Query bash/zsh command history' };
      }
      return { name: 'unknown', description: 'Unknown query type' };
    };

    for (const hit of hits) {
      const doc = hit._source;
      if (!doc) continue;

      const entityId = getNestedValue(doc, 'entity.id');
      const entityName = getNestedValue(doc, 'entity.name');
      const platform = getNestedValue(doc, 'host.os.platform');
      const issues: string[] = [];
      const securityFindings: SecurityFinding[] = [];
      const missingChecks: string[] = [];
      const suggestedQueries: Array<{ name: string; description: string }> = [];

      // Get all posture check statuses from already-processed fields
      // The ingest pipeline converts raw osquery values to normalized formats
      const diskEncryption = getDiskEncryptionStatus(doc.endpoint?.posture);
      const firewall = getFirewallStatus(doc.endpoint?.posture);
      const secureBoot = getSecureBootStatus(doc.endpoint?.posture);
      const adminCount = getAdminCount(doc.endpoint?.privileges);
      const adminCountStatus = getAdminCountStatus(adminCount, doc.endpoint?.privileges);
      // Shell data doesn't have .value wrapper like posture fields - use extractSecurityValue
      const suspiciousShell = extractSecurityValue(doc.endpoint?.shell?.suspicious);
      const shellHistoryStatus: PostureStatus =
        suspiciousShell === 'yes' ? 'FAIL' : suspiciousShell === 'no' ? 'PASS' : 'UNKNOWN';

      // Track failed checks for this asset
      const assetFailedChecks: string[] = [];

      // Disk Encryption Check
      if (diskEncryption === 'PASS') passed++;
      if (diskEncryption === 'FAIL') {
        failed++;
        failedChecksMap['Disk Encryption Disabled'].count++;
        if (!failedChecksMap['Disk Encryption Disabled'].assets.has(entityId)) {
          failedChecksMap['Disk Encryption Disabled'].assets.add(entityId);
          failedChecksMap['Disk Encryption Disabled'].assetNames.push(entityName);
        }
        issues.push('Disk Encryption Disabled');
        assetFailedChecks.push('Disk Encryption');
      }
      if (diskEncryption === 'UNKNOWN') {
        unknown++;
        missingChecks.push('Disk Encryption');
        suggestedQueries.push(getQuerySuggestions('Disk Encryption', platform));
      }

      // Firewall Check
      if (firewall === 'PASS') passed++;
      if (firewall === 'FAIL') {
        failed++;
        failedChecksMap['Firewall Disabled'].count++;
        if (!failedChecksMap['Firewall Disabled'].assets.has(entityId)) {
          failedChecksMap['Firewall Disabled'].assets.add(entityId);
          failedChecksMap['Firewall Disabled'].assetNames.push(entityName);
        }
        issues.push('Firewall Disabled');
        assetFailedChecks.push('Firewall');
      }
      if (firewall === 'UNKNOWN') {
        unknown++;
        missingChecks.push('Firewall');
        suggestedQueries.push(getQuerySuggestions('Firewall', platform));
      }

      // Secure Boot Check
      if (secureBoot === 'PASS') passed++;
      if (secureBoot === 'FAIL') {
        failed++;
        failedChecksMap['Secure Boot Disabled'].count++;
        if (!failedChecksMap['Secure Boot Disabled'].assets.has(entityId)) {
          failedChecksMap['Secure Boot Disabled'].assets.add(entityId);
          failedChecksMap['Secure Boot Disabled'].assetNames.push(entityName);
        }
        issues.push('Secure Boot Disabled');
        assetFailedChecks.push('Secure Boot');
      }
      if (secureBoot === 'UNKNOWN') {
        unknown++;
        missingChecks.push('Secure Boot');
        suggestedQueries.push({ name: 'secureboot', description: 'Query Secure Boot status' });
      }

      // Admin Count Check
      if (adminCountStatus === 'PASS') passed++;
      if (adminCountStatus === 'FAIL') {
        failed++;
        failedChecksMap['Excessive Local Admins'].count++;
        if (!failedChecksMap['Excessive Local Admins'].assets.has(entityId)) {
          failedChecksMap['Excessive Local Admins'].assets.add(entityId);
          failedChecksMap['Excessive Local Admins'].assetNames.push(entityName);
        }
        issues.push(`${adminCount} Local Admins (>2)`);
        assetFailedChecks.push('Admin Count');
      }
      if (adminCountStatus === 'UNKNOWN') {
        unknown++;
        missingChecks.push('Admin Count');
        suggestedQueries.push({
          name: 'user_groups',
          description: 'Query local admin group membership',
        });
      }

      // Shell History Check
      if (shellHistoryStatus === 'PASS') passed++;
      if (shellHistoryStatus === 'FAIL') {
        failed++;
        failedChecksMap['Suspicious Shell Config'].count++;
        if (!failedChecksMap['Suspicious Shell Config'].assets.has(entityId)) {
          failedChecksMap['Suspicious Shell Config'].assets.add(entityId);
          failedChecksMap['Suspicious Shell Config'].assetNames.push(entityName);
        }
        issues.push('Suspicious Shell Config');
        assetFailedChecks.push('Shell History');
      }
      if (shellHistoryStatus === 'UNKNOWN') {
        unknown++;
        missingChecks.push('Shell History');
        suggestedQueries.push(getQuerySuggestions('Shell History', platform));
      }

      // Calculate posture score for this asset
      const checks = {
        diskEncryption,
        firewall,
        secureBoot,
        shellHistory: shellHistoryStatus,
        adminCount: adminCountStatus,
      };
      const score = calculatePostureScore(checks);
      const riskLevel = getRiskLevel(score);

      // Track risk distribution
      riskDistribution[riskLevel]++;

      // Add to assets with scores
      assetsWithScores.push({
        entityId,
        entityName,
        platform,
        score,
        riskLevel,
        checks,
        adminCount,
        failedChecks: assetFailedChecks,
      });

      const suspiciousTasks = doc.endpoint?.security?.suspicious_tasks?.doc_count || 0;
      if (suspiciousTasks > 0) {
        const detectionMethod = extractSecurityValue(
          doc.endpoint?.security?.suspicious_tasks?.latest_detection_method
        );
        const detectionReason = extractSecurityValue(
          doc.endpoint?.security?.suspicious_tasks?.latest_detection_reason
        );
        const vtLink = extractSecurityValue(
          doc.endpoint?.security?.suspicious_tasks?.latest_vt_link
        );

        // Build detection description
        const detectionDesc = detectionReason
          ? detectionMethod
            ? `${detectionMethod}: ${detectionReason}`
            : detectionReason
          : detectionMethod || 'Suspicious activity detected';

        securityFindings.push({
          type: 'Suspicious Tasks (LOTL)',
          count: suspiciousTasks,
          severity: 'critical',
          latestDetection: detectionDesc,
          latestVtLink: vtLink || undefined,
        });
        issues.push(`${suspiciousTasks} suspicious tasks (LOTL)`);

        if (!securityFindingsMap['Suspicious Tasks (LOTL)']) {
          securityFindingsMap['Suspicious Tasks (LOTL)'] = {
            count: suspiciousTasks,
            assets: new Set([entityId]),
            assetNames: [entityName],
            latestDetection: detectionReason || detectionMethod || 'Suspicious activity detected',
            latestVtLink: vtLink || undefined,
          };
        } else {
          securityFindingsMap['Suspicious Tasks (LOTL)'].count += suspiciousTasks;
          if (!securityFindingsMap['Suspicious Tasks (LOTL)'].assets.has(entityId)) {
            securityFindingsMap['Suspicious Tasks (LOTL)'].assets.add(entityId);
            securityFindingsMap['Suspicious Tasks (LOTL)'].assetNames.push(entityName);
          }
        }
      }

      const unsignedProcesses = doc.endpoint?.security?.unsigned_processes?.doc_count || 0;
      if (unsignedProcesses > 0) {
        const processName = extractSecurityValue(
          doc.endpoint?.security?.unsigned_processes?.latest_name
        );
        const processResult = extractSecurityValue(
          doc.endpoint?.security?.unsigned_processes?.latest_result
        );
        const vtLink = extractSecurityValue(
          doc.endpoint?.security?.unsigned_processes?.latest_vt_link
        );

        const unsignedDesc = processName
          ? `${processName} (${processResult || 'untrusted'})`
          : processResult || 'Untrusted processes detected';

        securityFindings.push({
          type: 'Unsigned Processes',
          count: unsignedProcesses,
          severity: 'high',
          latestDetection: unsignedDesc,
          latestVtLink: vtLink || undefined,
        });
        issues.push(`${unsignedProcesses} unsigned processes`);

        if (!securityFindingsMap['Unsigned Processes']) {
          securityFindingsMap['Unsigned Processes'] = {
            count: unsignedProcesses,
            assets: new Set([entityId]),
            assetNames: [entityName],
            latestDetection: unsignedDesc,
            latestVtLink: vtLink || undefined,
          };
        } else {
          securityFindingsMap['Unsigned Processes'].count += unsignedProcesses;
          if (!securityFindingsMap['Unsigned Processes'].assets.has(entityId)) {
            securityFindingsMap['Unsigned Processes'].assets.add(entityId);
            securityFindingsMap['Unsigned Processes'].assetNames.push(entityName);
          }
        }
      }

      const suspiciousServices = doc.endpoint?.security?.suspicious_services?.doc_count || 0;
      if (suspiciousServices > 0) {
        const serviceName = extractSecurityValue(
          doc.endpoint?.security?.suspicious_services?.latest_name
        );
        const signatureStatus = extractSecurityValue(
          doc.endpoint?.security?.suspicious_services?.latest_signature_status
        );
        const vtLink = extractSecurityValue(
          doc.endpoint?.security?.suspicious_services?.latest_vt_link
        );

        const serviceDesc = signatureStatus
          ? serviceName
            ? `${serviceName} (${signatureStatus})`
            : `Signature: ${signatureStatus}`
          : serviceName || 'Services with signature issues';

        securityFindings.push({
          type: 'Suspicious Services',
          count: suspiciousServices,
          severity: 'medium',
          latestDetection: serviceDesc,
          latestVtLink: vtLink || undefined,
        });
        issues.push(`${suspiciousServices} suspicious services`);

        if (!securityFindingsMap['Suspicious Services']) {
          securityFindingsMap['Suspicious Services'] = {
            count: suspiciousServices,
            assets: new Set([entityId]),
            assetNames: [entityName],
            latestDetection: serviceDesc,
            latestVtLink: vtLink || undefined,
          };
        } else {
          securityFindingsMap['Suspicious Services'].count += suspiciousServices;
          if (!securityFindingsMap['Suspicious Services'].assets.has(entityId)) {
            securityFindingsMap['Suspicious Services'].assets.add(entityId);
            securityFindingsMap['Suspicious Services'].assetNames.push(entityName);
          }
        }
      }

      if (issues.length > 0) {
        assetsWithIssues.push({
          entityId,
          entityName,
          platform,
          issues,
          securityFindings,
        });
      }

      // Track assets with missing data
      if (missingChecks.length > 0) {
        assetsWithMissingData.push({
          entityId,
          entityName,
          platform,
          missingChecks,
          suggestedQueries,
        });
      }
    }

    const failedChecks = Object.entries(failedChecksMap)
      .filter(([_, data]) => data.count > 0)
      .map(([check, data]) => ({
        check,
        failedCount: data.count,
        severity:
          check === 'Disk Encryption Disabled'
            ? 'critical'
            : check === 'Firewall Disabled'
            ? 'high'
            : 'medium',
        affectedAssets: data.assetNames,
      }));

    const securityFindings = Object.entries(securityFindingsMap).map(([type, data]) => ({
      type,
      assetsAffected: data.assets.size,
      affectedAssetNames: data.assetNames,
      latestDetection: data.latestDetection,
      severity: type.includes('Tasks') ? 'critical' : type.includes('Unsigned') ? 'high' : 'medium',
      latestVtLink: data.latestVtLink,
    }));

    const totalChecks = passed + failed + unknown;

    return {
      passed,
      failed,
      unknown,
      totalChecks,
      failedChecks,
      securityFindings,
      assetsWithIssues,
      assetsWithMissingData,
      assetsWithScores: assetsWithScores.sort((a, b) => a.score - b.score), // Sort by score ascending (worst first)
      riskDistribution,
    };
  }, [services]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['security-posture'],
    queryFn: fetchPosture,
    staleTime: 30000,
  });

  return {
    summary: data ?? null,
    loading: isLoading,
    error: error as Error | null,
  };
};

/**
 * Extract a nested value from Entity Store using dot notation path
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

  // Handle top_metrics format: { "field.name": "value" }
  if (current && typeof current === 'object') {
    const keys = Object.keys(current);
    if (keys.length === 1) {
      const val = current[keys[0]];
      return val !== null && val !== undefined ? String(val) : '-';
    }
  }

  return current !== null && current !== undefined ? String(current) : '-';
};

// Asset Details Flyout Component
const AssetDetailsFlyout: React.FC<{
  asset: EndpointAssetRecord;
  onClose: () => void;
}> = ({ asset, onClose }) => {
  const { details, loading, error } = useAssetDetails(asset.id);

  // Extract real values from transform output for summary display
  const summaryData = useMemo(() => {
    if (!details) {
      return {
        platform: asset.platform,
        osName: asset.osName,
        osVersion: asset.osVersion,
        hostname: asset.hostname,
        agentName: asset.agentName,
      };
    }

    return {
      platform: getNestedValue(details, 'host.os.platform'),
      osName: getNestedValue(details, 'host.os.name'),
      osVersion: getNestedValue(details, 'host.os.version'),
      hostname:
        getNestedValue(details, 'host.hostname') !== '-'
          ? getNestedValue(details, 'host.hostname')
          : getNestedValue(details, 'host.name'),
      agentName: getNestedValue(details, 'agent.name'),
    };
  }, [details, asset]);

  // Group fields by category for better display
  const groupedFields = useMemo(() => {
    if (!details) return null;

    const groups: Record<string, Array<{ key: string; value: string }>> = {
      entity: [],
      host: [],
      agent: [],
      endpoint: [],
      asset: [],
      event: [],
      other: [],
    };

    const flattened = flattenObject(details);

    for (const item of flattened) {
      const category = item.key.split('.')[0];
      if (groups[category]) {
        groups[category].push(item);
      } else {
        groups.other.push(item);
      }
    }

    return groups;
  }, [details]);

  const renderFieldGroup = (
    title: string,
    fields: Array<{ key: string; value: string }> | undefined,
    icon: string
  ) => {
    if (!fields || fields.length === 0) return null;

    return (
      <EuiAccordion
        id={`accordion-${title}`}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>
                  {title} ({fields.length})
                </h4>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        initialIsOpen={title === 'Entity' || title === 'Host'}
        paddingSize="m"
      >
        <EuiDescriptionList
          type="column"
          compressed
          listItems={fields.map((f) => ({
            title: <EuiCode transparentBackground>{f.key}</EuiCode>,
            description: f.value === '-' ? <EuiText color="subdued">-</EuiText> : f.value,
          }))}
        />
      </EuiAccordion>
    );
  };

  // Use platform from transform data if available
  const displayPlatform = details ? summaryData.platform : asset.platform;
  const displayHostname = details ? summaryData.hostname : asset.hostname;

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>{getPlatformIcon(displayPlatform)}</EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>{asset.name}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {displayHostname && displayHostname !== '-' && displayHostname !== asset.name
                ? displayHostname
                : asset.id}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {loading && (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {error && (
          <EuiCallOut title="Error loading details" color="danger" iconType="alert">
            <p>{error.message}</p>
          </EuiCallOut>
        )}

        {!loading && !error && !details && (
          <EuiCallOut title="No details available" color="warning" iconType="help">
            <p>
              Could not find detailed facts for this asset in the transform output index. The
              transform may still be processing.
            </p>
          </EuiCallOut>
        )}

        {!loading && !error && details && groupedFields && (
          <>
            {/* Quick Summary */}
            <EuiPanel paddingSize="m" hasBorder>
              <EuiDescriptionList
                type="column"
                compressed
                listItems={[
                  { title: 'Entity ID', description: asset.id },
                  {
                    title: 'Platform',
                    description: (
                      <EuiFlexGroup alignItems="center" gutterSize="s">
                        <EuiFlexItem grow={false}>
                          {getPlatformIcon(summaryData.platform)}
                        </EuiFlexItem>
                        <EuiFlexItem>{getPlatformLabel(summaryData.platform)}</EuiFlexItem>
                      </EuiFlexGroup>
                    ),
                  },
                  {
                    title: 'OS',
                    description: `${summaryData.osName}${
                      summaryData.osVersion && summaryData.osVersion !== '-'
                        ? ` ${summaryData.osVersion}`
                        : ''
                    }`,
                  },
                  {
                    title: 'Hostname',
                    description: summaryData.hostname,
                  },
                  {
                    title: 'Agent',
                    description: summaryData.agentName,
                  },
                  { title: 'Last Seen', description: formatDateTime(asset.lastSeen) },
                  {
                    title: 'Source',
                    description: (
                      <EuiBadge color="hollow">
                        {asset.source?.includes('osquery') ? 'Osquery' : asset.source}
                      </EuiBadge>
                    ),
                  },
                ]}
              />
            </EuiPanel>

            <EuiSpacer size="l" />

            <EuiTitle size="s">
              <h3>All Facts</h3>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              <p>All fields collected from osquery and stored in the transform output.</p>
            </EuiText>

            <EuiSpacer size="m" />

            {renderFieldGroup('Entity', groupedFields.entity, 'indexPatternApp')}
            <EuiHorizontalRule margin="s" />

            {renderFieldGroup('Host', groupedFields.host, 'compute')}
            <EuiHorizontalRule margin="s" />

            {renderFieldGroup('Agent', groupedFields.agent, 'agentApp')}
            <EuiHorizontalRule margin="s" />

            {renderFieldGroup('Endpoint', groupedFields.endpoint, 'securityApp')}
            <EuiHorizontalRule margin="s" />

            {renderFieldGroup('Asset', groupedFields.asset, 'package')}
            <EuiHorizontalRule margin="s" />

            {renderFieldGroup('Event', groupedFields.event, 'calendar')}

            {groupedFields.other.length > 0 && (
              <>
                <EuiHorizontalRule margin="s" />
                {renderFieldGroup('Other', groupedFields.other, 'document')}
              </>
            )}

            <EuiSpacer size="l" />

            {/* Raw JSON View */}
            <EuiAccordion
              id="accordion-raw-json"
              buttonContent={
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="document" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h4>Raw Document</h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              initialIsOpen={false}
              paddingSize="m"
            >
              <EuiCode language="json" transparentBackground>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(details, null, 2)}
                </pre>
              </EuiCode>
            </EuiAccordion>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

// Security Posture Content Component
const SecurityPostureContent: React.FC = React.memo(() => {
  const { summary, loading, error } = useSecurityPosture();
  const [findingsFlyoutConfig, setFindingsFlyoutConfig] = useState<{
    hostId: string;
    hostName: string;
    findingType: FindingType;
    summaryCount: number;
  } | null>(null);

  // Handler for opening security findings detail flyout
  const handleViewAllFindings = useCallback(
    (asset: AssetPostureIssue, finding: SecurityFinding) => {
      setFindingsFlyoutConfig({
        hostId: asset.entityId,
        hostName: asset.entityName,
        findingType: finding.type as FindingType,
        summaryCount: finding.count,
      });
    },
    []
  );

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        color="danger"
        title={<h2>Error Loading Security Posture Data</h2>}
        body={<p>{error.message}</p>}
      />
    );
  }

  if (!summary) {
    return (
      <EuiEmptyPrompt
        iconType="securityApp"
        title={<h2>No Security Posture Data Available</h2>}
        body={
          <p>Security posture data will appear once osquery data is collected and processed.</p>
        }
      />
    );
  }

  const failedChecksColumns: Array<
    EuiBasicTableColumn<{
      check: string;
      failedCount: number;
      severity: string;
      affectedAssets: string[];
    }>
  > = [
    {
      field: 'check',
      name: 'Check',
      render: (check: string) => <strong>{check}</strong>,
    },
    {
      field: 'failedCount',
      name: 'Failed Count',
      align: 'right',
      render: (count: number, item: { affectedAssets: string[] }) => (
        <EuiToolTip
          position="top"
          content={
            <div>
              <strong>Affected Hosts:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                {item.affectedAssets.map((name, idx) => (
                  <li key={idx}>{name}</li>
                ))}
              </ul>
            </div>
          }
        >
          <EuiBadge color="danger" style={{ cursor: 'pointer' }}>
            {count}
          </EuiBadge>
        </EuiToolTip>
      ),
    },
    {
      field: 'severity',
      name: 'Severity',
      render: (severity: string) => (
        <EuiBadge
          color={severity === 'critical' ? 'danger' : severity === 'high' ? 'warning' : 'default'}
        >
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </EuiBadge>
      ),
    },
  ];

  const securityFindingsColumns: Array<
    EuiBasicTableColumn<{
      type: string;
      assetsAffected: number;
      affectedAssetNames: string[];
      latestDetection: string;
      severity: string;
      latestVtLink?: string;
    }>
  > = [
    {
      field: 'type',
      name: 'Finding Type',
      render: (type: string) => <strong>{type}</strong>,
    },
    {
      field: 'assetsAffected',
      name: 'Assets Affected',
      align: 'right',
      render: (count: number, item: { affectedAssetNames: string[] }) => (
        <EuiToolTip
          position="top"
          content={
            <div>
              <strong>Affected Hosts:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                {item.affectedAssetNames.map((name, idx) => (
                  <li key={idx}>{name}</li>
                ))}
              </ul>
            </div>
          }
        >
          <EuiBadge color="warning" style={{ cursor: 'pointer' }}>
            {count}
          </EuiBadge>
        </EuiToolTip>
      ),
    },
    {
      field: 'latestDetection',
      name: 'Latest Detection',
      render: (detection: string, item: { latestVtLink?: string }) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{detection}</EuiFlexItem>
          {item.latestVtLink && (
            <EuiFlexItem grow={false}>
              <EuiLink href={item.latestVtLink} target="_blank" external>
                VirusTotal
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'severity',
      name: 'Severity',
      render: (severity: string) => (
        <EuiBadge
          color={severity === 'critical' ? 'danger' : severity === 'high' ? 'warning' : 'default'}
        >
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </EuiBadge>
      ),
    },
  ];

  const assetsWithIssuesColumns: Array<EuiBasicTableColumn<AssetPostureIssue>> = [
    {
      field: 'entityName',
      name: 'Asset',
      render: (name: string, asset: AssetPostureIssue) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{getPlatformIcon(asset.platform)}</EuiFlexItem>
          <EuiFlexItem>
            <strong>{name}</strong>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'platform',
      name: 'Platform',
      render: (platform: string) => getPlatformLabel(platform),
    },
    {
      field: 'issues',
      name: 'Issues',
      render: (issues: string[]) => (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {issues.map((issue, idx) => (
            <EuiFlexItem grow={false} key={idx}>
              <EuiBadge color="danger">{issue}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'securityFindings',
      name: 'Security Findings',
      render: (findings: SecurityFinding[]) => {
        if (!findings || findings.length === 0) {
          return (
            <EuiText size="s" color="subdued">
              None
            </EuiText>
          );
        }
        return (
          <EuiFlexGroup gutterSize="xs" direction="column" responsive={false}>
            {findings.map((finding, idx) => (
              <EuiFlexItem key={idx}>
                <EuiBadge color={finding.severity === 'critical' ? 'danger' : 'warning'}>
                  {finding.type}: {finding.count}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: 'Actions',
      width: '100px',
      render: (asset: AssetPostureIssue) => {
        const firstFinding = asset.securityFindings?.[0];
        if (!firstFinding) {
          return null;
        }
        return (
          <button
            type="button"
            style={{
              background: 'none',
              border: '1px solid #0077CC',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              color: '#0077CC',
              fontSize: '12px',
            }}
            data-test-subj="view-all-findings-button"
            onClick={() => handleViewAllFindings(asset, firstFinding)}
          >
            View All
          </button>
        );
      },
    },
  ];

  const totalAssets = summary.assetsWithScores.length;
  const checksPerAsset = 5; // Disk Encryption, Firewall, Secure Boot, Admin Count, Shell History

  // Asset scores table columns
  const assetScoresColumns: Array<EuiBasicTableColumn<AssetWithScore>> = [
    {
      field: 'entityName',
      name: 'Asset',
      sortable: true,
      render: (name: string, asset: AssetWithScore) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{getPlatformIcon(asset.platform)}</EuiFlexItem>
          <EuiFlexItem>
            <strong>{name}</strong>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'score',
      name: 'Score',
      sortable: true,
      width: '80px',
      align: 'center',
      render: (score: number, asset: AssetWithScore) => (
        <EuiToolTip
          position="top"
          content={
            <div>
              <strong>Posture Score: {score}/100</strong>
              <br />
              <small>
                {asset.failedChecks.length === 0
                  ? 'All checks passed'
                  : `Failed: ${asset.failedChecks.join(', ')}`}
              </small>
            </div>
          }
        >
          <EuiBadge
            color={getRiskLevelColor(asset.riskLevel)}
            style={{ cursor: 'pointer', minWidth: '45px' }}
          >
            {score}
          </EuiBadge>
        </EuiToolTip>
      ),
    },
    {
      field: 'riskLevel',
      name: 'Risk',
      sortable: true,
      width: '100px',
      render: (level: RiskLevel) => (
        <EuiBadge color={getRiskLevelColor(level)}>
          {level.charAt(0).toUpperCase() + level.slice(1)}
        </EuiBadge>
      ),
    },
    {
      field: 'checks',
      name: 'Checks',
      render: (_: unknown, asset: AssetWithScore) => (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip content="Disk Encryption">
              <EuiHealth
                color={
                  asset.checks.diskEncryption === 'PASS'
                    ? 'success'
                    : asset.checks.diskEncryption === 'FAIL'
                    ? 'danger'
                    : 'subdued'
                }
              >
                Enc
              </EuiHealth>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content="Firewall">
              <EuiHealth
                color={
                  asset.checks.firewall === 'PASS'
                    ? 'success'
                    : asset.checks.firewall === 'FAIL'
                    ? 'danger'
                    : 'subdued'
                }
              >
                FW
              </EuiHealth>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content="Secure Boot">
              <EuiHealth
                color={
                  asset.checks.secureBoot === 'PASS'
                    ? 'success'
                    : asset.checks.secureBoot === 'FAIL'
                    ? 'danger'
                    : 'subdued'
                }
              >
                SB
              </EuiHealth>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={`Admin Count: ${asset.adminCount}`}>
              <EuiHealth
                color={
                  asset.checks.adminCount === 'PASS'
                    ? 'success'
                    : asset.checks.adminCount === 'FAIL'
                    ? 'danger'
                    : 'subdued'
                }
              >
                Adm
              </EuiHealth>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content="Shell History">
              <EuiHealth
                color={
                  asset.checks.shellHistory === 'PASS'
                    ? 'success'
                    : asset.checks.shellHistory === 'FAIL'
                    ? 'danger'
                    : 'subdued'
                }
              >
                Sh
              </EuiHealth>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Section A: Risk Level Distribution */}
      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h3>Risk Level Distribution</h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              Asset risk levels based on posture scores. Score = 100 minus deductions for failed
              checks.
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiPanel hasBorder color="danger" paddingSize="m">
                <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <strong style={{ fontSize: '28px', color: '#BD271E' }}>
                      {summary.riskDistribution.critical}
                    </strong>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" textAlign="center">
                      <strong>Critical</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued" textAlign="center">
                      Score 0-49
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder color="warning" paddingSize="m">
                <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <strong style={{ fontSize: '28px', color: '#F5A700' }}>
                      {summary.riskDistribution.high}
                    </strong>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" textAlign="center">
                      <strong>High</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued" textAlign="center">
                      Score 50-69
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <strong style={{ fontSize: '28px', color: '#69707D' }}>
                      {summary.riskDistribution.medium}
                    </strong>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" textAlign="center">
                      <strong>Medium</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued" textAlign="center">
                      Score 70-89
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder color="success" paddingSize="m">
                <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <strong style={{ fontSize: '28px', color: '#017D73' }}>
                      {summary.riskDistribution.low}
                    </strong>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" textAlign="center">
                      <strong>Low</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued" textAlign="center">
                      Score 90-100
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      {/* Section B: Posture Checks Summary */}
      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h3>Posture Checks Summary</h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              Evaluating <strong>{checksPerAsset} security checks</strong> across{' '}
              <strong>
                {totalAssets} endpoint{totalAssets !== 1 ? 's' : ''}
              </strong>
              : Disk Encryption, Firewall, Secure Boot, Admin Count, and Shell History. Total of{' '}
              <strong>{summary.totalChecks} individual checks</strong>.
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiPanel hasBorder color="success" paddingSize="m">
                <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <EuiHealth color="success">
                      <strong style={{ fontSize: '24px', color: '#017D73' }}>
                        {summary.passed.toLocaleString()}
                      </strong>
                    </EuiHealth>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" textAlign="center">
                      <strong>Checks Passed</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued" textAlign="center">
                      Security control enabled and configured correctly
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder color="danger" paddingSize="m">
                <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <EuiHealth color="danger">
                      <strong style={{ fontSize: '24px', color: '#BD271E' }}>
                        {summary.failed.toLocaleString()}
                      </strong>
                    </EuiHealth>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" textAlign="center">
                      <strong>Checks Failed</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued" textAlign="center">
                      Security control disabled or misconfigured
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <EuiHealth color="subdued">
                      <strong style={{ fontSize: '24px', color: '#69707D' }}>
                        {summary.unknown.toLocaleString()}
                      </strong>
                    </EuiHealth>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" textAlign="center">
                      <strong>Checks Unknown</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued" textAlign="center">
                      No data collected from osquery
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      {/* Section C: Failed Checks Breakdown */}
      {summary.failedChecks.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Failed Checks Breakdown</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={summary.failedChecks}
              columns={failedChecksColumns}
              tableLayout="auto"
            />
          </EuiPanel>
        </EuiFlexItem>
      )}
      {/* Section D: Asset Posture Scores */}
      {summary.assetsWithScores.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Asset Posture Scores</h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>Individual posture scores for each endpoint. Lower scores indicate higher risk.</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={summary.assetsWithScores}
              columns={assetScoresColumns}
              tableLayout="auto"
            />
          </EuiPanel>
        </EuiFlexItem>
      )}
      {/* Section E: Security Findings */}
      {summary.securityFindings.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Security Findings</h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>Active security threats and anomalies detected across your endpoint fleet.</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={summary.securityFindings}
              columns={securityFindingsColumns}
              tableLayout="auto"
            />
          </EuiPanel>
        </EuiFlexItem>
      )}
      {/* Section D: Assets Requiring Attention */}
      {summary.assetsWithIssues.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Assets Requiring Attention</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={summary.assetsWithIssues}
              columns={assetsWithIssuesColumns}
              tableLayout="auto"
            />
          </EuiPanel>
        </EuiFlexItem>
      )}
      {/* Section E: Assets with Missing Data */}
      {summary.assetsWithMissingData.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder color="warning">
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="questionInCircle" color="warning" size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>Assets with Missing Data ({summary.assetsWithMissingData.length})</h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>
                These assets are missing posture data. Add the suggested osquery queries to collect
                this information.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={summary.assetsWithMissingData}
              columns={[
                {
                  field: 'entityName',
                  name: 'Asset',
                  render: (name: string, asset: AssetMissingData) => (
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>{getPlatformIcon(asset.platform)}</EuiFlexItem>
                      <EuiFlexItem>
                        <strong>{name}</strong>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                },
                {
                  field: 'platform',
                  name: 'Platform',
                  width: '100px',
                  render: (platform: string) => getPlatformLabel(platform),
                },
                {
                  field: 'missingChecks',
                  name: 'Missing Checks',
                  render: (checks: string[]) => (
                    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                      {checks.map((check, idx) => (
                        <EuiFlexItem grow={false} key={idx}>
                          <EuiBadge color="warning">{check}</EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  ),
                },
                {
                  field: 'suggestedQueries',
                  name: 'Suggested Osquery Tables',
                  render: (queries: Array<{ name: string; description: string }>) => (
                    <EuiFlexGroup direction="column" gutterSize="xs">
                      {queries.map((query, idx) => (
                        <EuiFlexItem key={idx}>
                          <EuiToolTip content={query.description} position="top">
                            <EuiCode>{query.name}</EuiCode>
                          </EuiToolTip>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  ),
                },
              ]}
              tableLayout="auto"
            />
          </EuiPanel>
        </EuiFlexItem>
      )}
      {/* Empty state when all checks pass */}
      {summary.failedChecks.length === 0 &&
        summary.securityFindings.length === 0 &&
        summary.assetsWithIssues.length === 0 && (
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiEmptyPrompt
                iconType="checkInCircleFilled"
                iconColor="success"
                title={<h2>All Security Checks Passed</h2>}
                body={<p>All endpoints are in good security posture with no issues detected.</p>}
              />
            </EuiPanel>
          </EuiFlexItem>
        )}
      {findingsFlyoutConfig && (
        <SecurityFindingsDetailFlyout
          hostId={findingsFlyoutConfig.hostId}
          hostName={findingsFlyoutConfig.hostName}
          findingType={findingsFlyoutConfig.findingType}
          summaryCount={findingsFlyoutConfig.summaryCount}
          onClose={() => setFindingsFlyoutConfig(null)}
        />
      )}
    </EuiFlexGroup>
  );
});

SecurityPostureContent.displayName = 'SecurityPostureContent';

// Table Component
const EndpointAssetsInventoryTable: React.FC<{
  assets: EndpointAssetRecord[];
  loading: boolean;
  onAssetClick: (asset: EndpointAssetRecord) => void;
}> = ({ assets, loading, onAssetClick }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<keyof EndpointAssetRecord>('lastSeen');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const columns: Array<EuiBasicTableColumn<EndpointAssetRecord>> = useMemo(
    () => [
      {
        field: 'name',
        name: 'Name',
        sortable: true,
        render: (name: string, asset: EndpointAssetRecord) => (
          <EuiLink onClick={() => onAssetClick(asset)}>
            <strong>{name}</strong>
          </EuiLink>
        ),
      },
      {
        field: 'platform',
        name: 'Platform',
        sortable: true,
        width: '140px',
        render: (platform: string) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getPlatformIcon(platform)} {getPlatformLabel(platform)}
          </span>
        ),
      },
      {
        field: 'osName',
        name: 'OS',
        sortable: true,
        width: '180px',
        render: (osName: string, asset: EndpointAssetRecord) =>
          `${osName}${asset.osVersion ? ` ${asset.osVersion}` : ''}`,
      },
      {
        field: 'hostname',
        name: 'Hostname',
        sortable: true,
        width: '200px',
      },
      {
        field: 'agentName',
        name: 'Agent',
        sortable: true,
        width: '200px',
        render: (agentName: string) => agentName || '-',
      },
      {
        field: 'source',
        name: 'Source',
        sortable: true,
        width: '120px',
        render: (source: string) => (
          <EuiBadge color="hollow">
            {source?.includes('osquery') ? 'Osquery' : source || 'Unknown'}
          </EuiBadge>
        ),
      },
      {
        field: 'lastSeen',
        name: 'Last Seen',
        sortable: true,
        width: '140px',
        render: (date: string) => formatLastSeen(date),
      },
    ],
    [onAssetClick]
  );

  const onTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<EndpointAssetRecord>) => {
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
      if (sort) {
        setSortField(sort.field as keyof EndpointAssetRecord);
        setSortDirection(sort.direction);
      }
    },
    []
  );

  const displayedAssets = useMemo(() => {
    const sorted = [...assets].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [assets, sortField, sortDirection, pageIndex, pageSize]);

  const getRowProps = useCallback(
    (asset: EndpointAssetRecord) => ({
      'data-test-subj': `asset-row-${asset.id}`,
      onClick: () => onAssetClick(asset),
      style: { cursor: 'pointer' },
    }),
    [onAssetClick]
  );

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (assets.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="compute"
        title={<h2>No Endpoint Assets Found</h2>}
        body={
          <p>
            Endpoint assets will appear here once osquery data is collected and processed by the
            Entity Store. Make sure the transform is running and the Entity Store generic engine is
            enabled.
          </p>
        }
      />
    );
  }

  return (
    <EuiBasicTable
      items={displayedAssets}
      columns={columns}
      pagination={{
        pageIndex,
        pageSize,
        totalItemCount: assets.length,
        pageSizeOptions: [10, 25, 50, 100],
      }}
      sorting={{
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      }}
      onChange={onTableChange}
      rowProps={getRowProps}
      data-test-subj="endpointAssetsInventoryTable"
      rowHeader="name"
    />
  );
};

// Main Page Component
const EndpointAssetsPageComponent: React.FC = () => {
  const [selectedTab, setSelectedTab] = React.useState<TabId>('inventory');
  const [selectedAsset, setSelectedAsset] = useState<EndpointAssetRecord | null>(null);
  const { sourcererDataView: dataView, loading: sourcererLoading } = useSourcererDataView();

  const { assets, loading, error, refresh, summary } = useEndpointAssetsFromEntityStore();
  const { summary: privilegesSummary } = usePrivileges();

  const handleAssetClick = useCallback((asset: EndpointAssetRecord) => {
    setSelectedAsset(asset);
  }, []);

  const handleFlyoutClose = useCallback(() => {
    setSelectedAsset(null);
  }, []);

  const tabs: Array<{ id: TabId; name: string; content: React.ReactNode }> = [
    {
      id: 'inventory',
      name: TAB_INVENTORY,
      content: (
        <EndpointAssetsInventoryTable
          assets={assets}
          loading={loading}
          onAssetClick={handleAssetClick}
        />
      ),
    },
    {
      id: 'posture',
      name: TAB_POSTURE,
      content: <SecurityPostureContent />,
    },
    {
      id: 'privileges',
      name: TAB_PRIVILEGES,
      content: <PrivilegesContent />,
    },
    {
      id: 'drift',
      name: TAB_DRIFT,
      content: (
        <EuiEmptyPrompt
          iconType="timeline"
          title={<h2>Drift Detection - Coming Soon</h2>}
          body={<p>Track configuration changes across your endpoint fleet.</p>}
        />
      ),
    },
  ];

  const selectedTabContent = tabs.find((tab) => tab.id === selectedTab)?.content;

  if (sourcererLoading) {
    return (
      <SecuritySolutionPageWrapper>
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 400 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" data-test-subj="endpointAssetsLoading" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
    );
  }

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
      </FiltersGlobal>

      <SecuritySolutionPageWrapper data-test-subj="endpointAssetsPage">
        <HeaderPage
          title={PAGE_TITLE}
          subtitle={PAGE_SUBTITLE}
          data-test-subj="endpointAssetsPageTitle"
        />

        <EuiFlexGroup direction="column">
          {/* Summary Header */}
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiFlexGroup alignItems="center" gutterSize="xl">
                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={summary?.total?.toLocaleString() ?? '--'}
                    description="Total Assets"
                    titleSize="l"
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={summary?.active24h?.toLocaleString() ?? '--'}
                    description="Active (24h)"
                    titleSize="l"
                    titleColor="success"
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiStat
                    title="--"
                    description="Critical Posture"
                    titleSize="l"
                    titleColor="danger"
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={privilegesSummary?.assetsWithElevatedRisk?.toLocaleString() ?? '--'}
                    description="Elevated Privileges"
                    titleSize="l"
                    titleColor={privilegesSummary?.assetsWithElevatedRisk ? 'warning' : 'default'}
                  />
                </EuiFlexItem>

                <EuiFlexItem grow />

                <EuiFlexItem grow={false}>
                  <EuiButton onClick={refresh} iconType="refresh" disabled={loading}>
                    {loading ? <EuiLoadingSpinner size="m" /> : 'Refresh'}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          <EuiSpacer size="l" />

          {/* Tab Navigation */}
          <EuiFlexItem>
            <EuiTabs>
              {tabs.map((tab) => (
                <EuiTab
                  key={tab.id}
                  isSelected={selectedTab === tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
          </EuiFlexItem>

          <EuiSpacer size="l" />

          {/* Tab Content */}
          <EuiFlexItem>
            {error ? (
              <EuiEmptyPrompt
                iconType="alert"
                color="danger"
                title={<h2>Error Loading Assets</h2>}
                body={<p>{error.message}</p>}
                actions={
                  <EuiButton onClick={refresh} iconType="refresh">
                    Retry
                  </EuiButton>
                }
              />
            ) : (
              selectedTabContent
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      {/* Asset Details Flyout */}
      {selectedAsset && <AssetDetailsFlyout asset={selectedAsset} onClose={handleFlyoutClose} />}

      <SpyRoute pageName={SecurityPageName.entityAnalyticsEndpointAssets} />
    </>
  );
};

export const EntityAnalyticsEndpointAssetsPage = React.memo(EndpointAssetsPageComponent);
EntityAnalyticsEndpointAssetsPage.displayName = 'EntityAnalyticsEndpointAssetsPage';
