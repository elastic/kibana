/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { AnomalySeverityFilter } from './anomaly_severity_filter';
import { useRecentAnomaliesQuery } from './hooks/recent_anomalies_query_hooks';
import type { ViewByMode } from './hooks/recent_anomalies_esql_source_query_hooks';
import { useAnomalyBands } from './anomaly_bands';
import { EntityNameList } from './entity_name_list';
import { AnomalyHeatmap } from './anomaly_heatmap';
import { getAnomalyChartStyling } from './anomaly_chart_styling';
import { useQueryInspector } from '../../../common/components/page/manage_query';

const RECENT_ANOMALIES_QUERY_ID = 'recent-anomalies-query';
const RECENT_ANOMALIES_CONTEXT_ID = 'RecentAnomalies-table';

const VIEW_BY_OPTIONS = [
  { value: 'entity' as const, text: 'Entity' },
  { value: 'jobId' as const, text: 'Job ID' },
];

const LabelList: React.FC<{ labels: string[]; compressed?: boolean }> = ({
  labels,
  compressed = false,
}) => {
  const styling = getAnomalyChartStyling(compressed);
  return (
    <EuiFlexItem
      css={css`
        margin-top: ${styling.heightOfTopLegend}px;
        height: ${styling.heightOfEntityNamesList(labels.length)}px;
      `}
      grow={false}
    >
      <EuiFlexGroup gutterSize={'none'} direction={'column'} justifyContent={'center'}>
        {labels.map((label) => (
          <EuiFlexItem
            key={label}
            css={css`
              justify-content: center;
              height: ${styling.heightOfEachCell}px;
            `}
            grow={false}
          >
            <EuiText textAlign={'right'} size="s">
              {label}
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

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
      <EuiFlexGroup gutterSize="m" alignItems="center">
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
        <AnomalySeverityFilter anomalyBands={bands} toggleHiddenBand={toggleHiddenBand} />
      </EuiFlexGroup>
      <EuiFlexGroup>
        {viewBy === 'entity' && entityMetadata ? (
          <EntityNameList
            entities={entityMetadata}
            contextId={RECENT_ANOMALIES_CONTEXT_ID}
            compressed
          />
        ) : (
          <LabelList labels={rowLabels} compressed />
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
        />
      </EuiFlexGroup>
    </>
  );
};
