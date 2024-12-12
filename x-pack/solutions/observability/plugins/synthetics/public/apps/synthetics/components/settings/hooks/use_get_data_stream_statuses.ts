/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { DataStream } from '@kbn/index-management-plugin/common';
import { useContext } from 'react';
import { keyBy } from 'lodash';
import { getDslPolicies } from './api';
import { SyntheticsRefreshContext } from '../../../contexts';
import { formatBytes } from '../../step_details_page/hooks/use_object_metrics';
import { formatAge } from '../data_retention/common';
import { policyLabels } from '../data_retention/policy_labels';

export type DataStreamStatus = DataStream & {
  dataStreamName?: string;
  isEmpty?: boolean;
};

export interface DataStreamStatusResponse {
  dataStreamStatuses?: DataStreamStatus[];
  error?: Error;
  loading?: boolean;
}

/**
 * Query the Data Streams API for stats and info about the current data streams.
 *
 * Filters out non-synthetics streams and overlays additional useful fields for display.
 */
export function useGetDataStreamStatuses(): DataStreamStatusResponse {
  const { lastRefresh } = useContext(SyntheticsRefreshContext);
  const { data, error, loading } = useFetcher(getDslPolicies, [lastRefresh]);

  if (!Array.isArray(data) || !!error) return { dataStreamStatuses: undefined, error, loading };

  const dataStreamMap = keyBy(data, 'indexTemplateName');

  const dataStreamStatuses: DataStream[] = [];
  let totalBytes = 0;
  let summaryItem: DataStreamStatus | null = null;
  for (const { indexTemplate, label } of policyLabels) {
    const dataStream = dataStreamMap[indexTemplate];
    if (dataStream) {
      dataStreamStatuses.push(formatDataStreamInfo(dataStream));
      totalBytes += dataStream.storageSizeBytes ?? 0;
    } else {
      const missingStream = toMissingDataStream({ indexTemplate, label });
      dataStreamStatuses.push(missingStream);
      if (indexTemplate === 'synthetics') summaryItem = missingStream;
    }
  }

  if (summaryItem !== null) summaryItem.storageSize = formatBytes(totalBytes);

  dataStreamStatuses.sort(({ indexTemplateName: a }, { indexTemplateName: b }) =>
    a.localeCompare(b)
  );

  return {
    dataStreamStatuses,
    error,
    loading,
  };
}

/**
 * The table expects entries even when the data stream is missing, so we need to create a placeholder.
 */
function toMissingDataStream({
  label: name,
  indexTemplate: indexTemplateName,
}: {
  indexTemplate: string;
  label: string;
}): DataStreamStatus {
  return {
    isEmpty: true,
    name,
    indices: [],
    indexTemplateName,
    storageSize: formatBytes(0),
    storageSizeBytes: 0,
    lifecycle: {
      enabled: false,
      data_retention: indexTemplateName === 'synthetics' ? '--' : '',
    },
    timeStampField: { name: '@timestamp' },
    generation: 0,
    health: 'green',
    privileges: { delete_index: true, manage_data_stream_lifecycle: true },
    hidden: false,
    nextGenerationManagedBy: 'Data stream lifecycle',
    indexMode: 'standard',
  };
}

/**
 * Overlay inferred fields to match the table's expectations.
 */
function formatDataStreamInfo({
  name,
  lifecycle,
  indexTemplateName,
  storageSizeBytes,
  ...rest
}: DataStream): DataStreamStatus {
  const policyLabel = policyLabels.find(({ indexTemplate }) => indexTemplate === indexTemplateName);
  return {
    ...rest,
    name: policyLabel?.label ?? name,
    dataStreamName: name,
    indexTemplateName,
    storageSize: storageSizeBytes !== undefined ? formatBytes(storageSizeBytes) : '',
    storageSizeBytes,
    lifecycle: {
      ...lifecycle,
      data_retention:
        lifecycle?.data_retention !== undefined ? formatAge(String(lifecycle?.data_retention)) : '',
    },
  };
}
