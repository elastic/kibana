/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { PrivilegedAccessDetectionSeverityFilter } from './pad_chart_severity_filter';
import { usePrivilegedAccessDetectionAnomaliesQuery } from './hooks/pad_query_hooks';
import { useAnomalyBands } from './pad_anomaly_bands';
import { UserNameList } from './pad_user_name_list';
import { PrivilegedAccessDetectionHeatmap } from './pad_heatmap';

export interface PrivilegedAccessDetectionChartProps {
  jobIds: string[];
  spaceId: string;
}

export const PrivilegedAccessDetectionChart: React.FC<PrivilegedAccessDetectionChartProps> = ({
  jobIds,
  spaceId,
}) => {
  const { bands, toggleHiddenBand } = useAnomalyBands();

  const { data, isLoading, isError } = usePrivilegedAccessDetectionAnomaliesQuery({
    jobIds,
    anomalyBands: bands,
    spaceId,
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
