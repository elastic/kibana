/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { css } from '@emotion/react';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { AnomalySeverityFilter } from './anomaly_severity_filter';
import { useRecentAnomaliesQuery } from './hooks/recent_anomalies_query_hooks';
import type { ViewByMode } from './hooks/recent_anomalies_esql_source_query_hooks';
import { useAnomalyBands } from './anomaly_bands';
import { EntityNameList } from './entity_name_list';
import { JobIdList } from './job_id_list';
import { AnomalyHeatmap } from './anomaly_heatmap';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { RecentAnomaliesHeatmapNoResults } from './recent_anomalies_heatmap_no_results';

const RECENT_ANOMALIES_QUERY_ID = 'recent-anomalies-query';
const RECENT_ANOMALIES_CONTEXT_ID = 'RecentAnomalies-table';

/**
 * The Entity Analytics home page hides the global date picker. The Recent
 * Anomalies panel on that page is intentionally pinned to a fixed 30-day
 * window so it always shows recent ML activity regardless of the hidden
 * global time state.
 */
export const RECENT_ANOMALIES_TIME_RANGE = { from: 'now-30d', to: 'now' } as const;

const VIEW_BY_OPTIONS = [
  { value: 'entity' as const, text: 'Entity' },
  { value: 'jobId' as const, text: 'Job ID' },
];

interface RecentAnomaliesChartProps {
  watchlistId?: string;
  spaceId?: string;
}

export const RecentAnomaliesChart: React.FC<RecentAnomaliesChartProps> = ({
  watchlistId,
  spaceId,
}) => {
  const { deleteQuery, setQuery } = useGlobalTime();
  const [viewBy, setViewBy] = useState<ViewByMode>('entity');

  const { bands, toggleHiddenBand } = useAnomalyBands();

  const { data, entityMetadata, isLoading, isError, inspect, refetch } = useRecentAnomaliesQuery({
    anomalyBands: bands,
    viewBy,
    watchlistId,
    spaceId,
    timeRange: RECENT_ANOMALIES_TIME_RANGE,
  });

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId: RECENT_ANOMALIES_QUERY_ID,
    loading: isLoading,
  });

  const rowLabels = data?.rowLabels ?? [];
  const rowAccessor = viewBy === 'jobId' ? 'job_id' : 'entity_id';

  return (
    <>
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        responsive={false}
        wrap
        css={css`
          & > .euiFlexItem {
            flex-shrink: 0;
          }
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiSelect
            prepend="View by"
            aria-label="View by"
            options={VIEW_BY_OPTIONS}
            value={viewBy}
            onChange={(e) => setViewBy(e.target.value as ViewByMode)}
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AnomalySeverityFilter anomalyBands={bands} toggleHiddenBand={toggleHiddenBand} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        {viewBy === 'entity' && entityMetadata ? (
          <EntityNameList
            entities={entityMetadata}
            contextId={RECENT_ANOMALIES_CONTEXT_ID}
            compressed
          />
        ) : (
          <JobIdList jobIds={rowLabels} compressed />
        )}
        <AnomalyHeatmap
          anomalyBands={bands}
          records={data?.anomalyRecords ?? []}
          entityNames={rowLabels}
          entityAccessor={rowAccessor}
          heatmapId="recent-anomalies-heatmap"
          isLoading={isLoading}
          isError={isError}
          compressed
          noResultsComponent={<RecentAnomaliesHeatmapNoResults />}
        />
      </EuiFlexGroup>
    </>
  );
};
