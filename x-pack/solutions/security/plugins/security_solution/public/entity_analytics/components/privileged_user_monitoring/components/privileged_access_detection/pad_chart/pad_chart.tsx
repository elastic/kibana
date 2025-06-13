/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { PrivilegedAccessDetectionSeverityFilter } from './pad_chart_severity_filter';
import { useGlobalTime } from '../../../../../../common/containers/use_global_time';
import { usePrivilegedAccessDetectionAnomaliesQuery } from './pad_query';
import { useAnomalyBands } from './pad_anomaly_bands';
import { UserNameList } from './pad_user_name_list';
import { PrivilegedAccessDetectionHeatmap } from './pad_heatmap';

/**
 * This function computes the appropriate interval (length of time, in hours) of each bucket of the heatmap in a given timerange.
 * At most, we will compute 30 buckets, and the interval will be evenly distributed across those 30.
 * However, the lowest possible interval that will return is 3 (which equates to 3 hours), which means it is possible
 * for fewer buckets than 30.
 *
 * @return a number representing the number of hours per interval.
 */
export const useIntervalForHeatmap = () => {
  const { from, to } = useGlobalTime();

  const millisecondsToHours = (millis: number) => {
    return Number((millis / (1000 * 60 * 60)).toFixed(0));
  };

  const maximumNumberOfBuckets = 30;
  const minimumNumberOfBucketInterval = 3;
  const hoursInRange = millisecondsToHours(new Date(to).getTime() - new Date(from).getTime());
  const bucketInterval = Number((hoursInRange / maximumNumberOfBuckets).toFixed(0));
  return bucketInterval < minimumNumberOfBucketInterval
    ? minimumNumberOfBucketInterval
    : bucketInterval;
};

export interface PrivilegedAccessDetectionChartProps {
  jobIds: string[];
  spaceId: string;
}

export const padChartStyling = {
  heightOfNoResults: 300,
  heightOfXAxisLegend: 28,
  heightOfTopLegend: 32,
  heightOfEachCell: 40,
  heightOfUserNamesList: (userNames: string[]) =>
    userNames.length > 0
      ? userNames.length * padChartStyling.heightOfEachCell
      : padChartStyling.heightOfNoResults,
  heightOfHeatmap: (userNames: string[]) =>
    userNames.length > 0
      ? userNames.length * padChartStyling.heightOfEachCell + padChartStyling.heightOfXAxisLegend
      : padChartStyling.heightOfNoResults,
};

export const PrivilegedAccessDetectionChart: React.FC<PrivilegedAccessDetectionChartProps> = ({
  jobIds,
  spaceId,
}) => {
  const { bands, toggleHiddenBand } = useAnomalyBands();

  const { records, isLoading, isError } = usePrivilegedAccessDetectionAnomaliesQuery({
    jobIds,
    anomalyBands: bands,
    spaceId,
  });

  /**
   * The unique list of userNames. Because the ordering is based on the order of the records, this list is always sorted properly
   */
  const uniqueUserNames = [...new Set(records.map((each) => each['user.name']))];

  return (
    <>
      <PrivilegedAccessDetectionSeverityFilter
        anomalyBands={bands}
        toggleHiddenBand={toggleHiddenBand}
      />
      <EuiFlexGroup>
        <UserNameList userNames={uniqueUserNames} />
        <PrivilegedAccessDetectionHeatmap
          anomalyBands={bands}
          records={records}
          userNames={uniqueUserNames}
          isLoading={isLoading}
          isError={isError}
        />
      </EuiFlexGroup>
    </>
  );
};
