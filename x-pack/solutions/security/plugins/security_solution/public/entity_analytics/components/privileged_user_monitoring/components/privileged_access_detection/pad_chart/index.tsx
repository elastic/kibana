/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useGlobalTime } from '../../../../../../common/containers/use_global_time';
import { PrivilegedAccessDetectionSeverityFilter } from './pad_chart_severity_filter';
import { usePrivilegedAccessDetectionAnomaliesQuery } from './hooks/pad_query_hooks';
import { useAnomalyBands } from './pad_anomaly_bands';
import { UserNameList } from './pad_user_name_list';
import { PrivilegedAccessDetectionHeatmap } from './pad_heatmap';
import { useQueryInspector } from '../../../../../../common/components/page/manage_query';
import { PRIVILEGED_ACCESS_DETECTIONS_QUERY_ID } from '..';

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
      <PrivilegedAccessDetectionSeverityFilter
        anomalyBands={bands}
        toggleHiddenBand={toggleHiddenBand}
      />
      <EuiFlexGroup>
        <UserNameList userNames={data?.userNames ?? []} />
        <PrivilegedAccessDetectionHeatmap
          anomalyBands={bands}
          records={data?.anomalyRecords ?? []}
          userNames={data?.userNames ?? []}
          isLoading={isLoading}
          isError={isError}
        />
      </EuiFlexGroup>
    </>
  );
};
