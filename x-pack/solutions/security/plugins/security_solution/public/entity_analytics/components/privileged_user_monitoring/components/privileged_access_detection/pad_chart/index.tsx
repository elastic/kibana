/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useGlobalTime } from '../../../../../../common/containers/use_global_time';
import {
  AnomalySeverityFilter,
  AnomalyHeatmap,
  useAnomalyBands,
} from '../../../../recent_anomalies';
import { usePrivilegedAccessDetectionAnomaliesQuery } from './hooks/pad_query_hooks';
import { UserNameList } from './pad_user_name_list';
import { useQueryInspector } from '../../../../../../common/components/page/manage_query';
import { PRIVILEGED_ACCESS_DETECTIONS_QUERY_ID } from '..';
import { PrivilegedAccessDetectionHeatmapNoResults } from './pad_heatmap_no_results';

export interface PrivilegedAccessDetectionChartProps {
  jobIds: string[];
  spaceId: string;
}

export const PrivilegedAccessDetectionChart: React.FC<PrivilegedAccessDetectionChartProps> = ({
  jobIds,
  spaceId,
}) => {
  const { deleteQuery, setQuery } = useGlobalTime();

  const { bands, toggleHiddenBand } = useAnomalyBands();

  const { data, isLoading, isError, inspect, refetch } = usePrivilegedAccessDetectionAnomaliesQuery(
    {
      jobIds,
      anomalyBands: bands,
      spaceId,
    }
  );

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId: PRIVILEGED_ACCESS_DETECTIONS_QUERY_ID,
    loading: isLoading,
  });

  return (
    <>
      <AnomalySeverityFilter anomalyBands={bands} toggleHiddenBand={toggleHiddenBand} />
      <EuiFlexGroup>
        <UserNameList userNames={data?.userNames ?? []} />
        <AnomalyHeatmap
          anomalyBands={bands}
          records={data?.anomalyRecords ?? []}
          entityNames={data?.userNames ?? []}
          entityAccessor="user.name"
          heatmapId="privileged-access-detection-heatmap-chart"
          isLoading={isLoading}
          isError={isError}
          noResultsComponent={<PrivilegedAccessDetectionHeatmapNoResults />}
        />
      </EuiFlexGroup>
    </>
  );
};
