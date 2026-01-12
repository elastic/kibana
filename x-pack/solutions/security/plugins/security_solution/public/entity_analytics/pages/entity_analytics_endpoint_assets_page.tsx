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

const TAB_DRIFT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.tabDrift',
  { defaultMessage: 'Drift' }
);

// Constants
const ENTITY_STORE_INDEX = 'entities-generic-latest';
const TRANSFORM_OUTPUT_INDEX = 'endpoint-assets-osquery-*';
const ENDPOINT_ASSETS_SOURCE_FILTER = 'endpoint-assets-osquery-*';
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
const getPlatformIcon = (platform: string): React.ReactNode => {
  switch (platform?.toLowerCase()) {
    case 'windows':
      return <EuiIcon type="logoWindows" size="m" />;
    case 'darwin':
    case 'macos':
      return <EuiIcon type="logoApple" size="m" />;
    case 'linux':
    case 'ubuntu':
    case 'rhel':
    case 'centos':
    case 'debian':
      return <EuiIcon type="logoLinux" size="m" />;
    default:
      return <EuiIcon type="compute" size="m" />;
  }
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
      result.push({ key: fullKey, value: JSON.stringify(value) });
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
      index: ENTITY_STORE_INDEX,
      size: 500,
      sort: [{ '@timestamp': 'desc' }],
      query: {
        bool: {
          filter: [
            {
              wildcard: {
                'entity.source': {
                  value: ENDPOINT_ASSETS_SOURCE_FILTER,
                },
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

    const assets: EndpointAssetRecord[] = hits.map((hit) => {
      const source = hit._source!;
      return {
        id: source.entity.id,
        name: source.entity.name || source.host?.hostname || source.host?.name || 'Unknown',
        hostname: source.host?.hostname || source.host?.name || '',
        platform: source.host?.os?.platform || 'unknown',
        osName: source.host?.os?.name || 'Unknown',
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
      index: TRANSFORM_OUTPUT_INDEX,
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

/**
 * Extract a nested value from transform output using dot notation path
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
      hostname: getNestedValue(details, 'host.hostname') !== '-'
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
                        <EuiFlexItem grow={false}>{getPlatformIcon(summaryData.platform)}</EuiFlexItem>
                        <EuiFlexItem>{getPlatformLabel(summaryData.platform)}</EuiFlexItem>
                      </EuiFlexGroup>
                    ),
                  },
                  {
                    title: 'OS',
                    description: `${summaryData.osName}${summaryData.osVersion && summaryData.osVersion !== '-' ? ` ${summaryData.osVersion}` : ''}`,
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
      content: (
        <EuiEmptyPrompt
          iconType="securityApp"
          title={<h2>Security Posture Dashboard - Coming Soon</h2>}
          body={<p>View disk encryption status, firewall configuration, secure boot, and more.</p>}
        />
      ),
    },
    {
      id: 'privileges',
      name: TAB_PRIVILEGES,
      content: (
        <EuiEmptyPrompt
          iconType="user"
          title={<h2>Privilege Analysis - Coming Soon</h2>}
          body={<p>Identify endpoints with elevated privileges and local admin accounts.</p>}
        />
      ),
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
                    title="--"
                    description="Elevated Privileges"
                    titleSize="l"
                    titleColor="warning"
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
