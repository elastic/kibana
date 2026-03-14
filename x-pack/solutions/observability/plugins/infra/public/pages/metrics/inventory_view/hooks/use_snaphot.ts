/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import type {
  InfraTimerangeInput,
  SnapshotRequest,
} from '../../../../../common/http_api/snapshot_api';
import { SnapshotNodeResponseRT } from '../../../../../common/http_api/snapshot_api';

export interface UseSnapshotRequest extends Omit<SnapshotRequest, 'timerange' | 'schema'> {
  currentTime?: number;
  from?: number;
  to?: number;
  timerange?: InfraTimerangeInput;
  schema?: DataSchemaFormat | null;
}

export function useSnapshot(
  props: UseSnapshotRequest,
  { sendRequestImmediately = true }: { sendRequestImmediately?: boolean } = {}
) {
  const payload = useMemo(() => JSON.stringify(buildPayload(props)), [props]);

  const { data, status, error, refetch } = useFetcher(
    async (callApi) => {
      const response = await callApi('/api/metrics/snapshot', {
        method: 'POST',
        body: payload,
      });

      return decodeOrThrow(SnapshotNodeResponseRT)(response);
    },
    [payload],
    {
      autoFetch: sendRequestImmediately,
    }
  );

  return {
    error: (error && error.message) || null,
    loading: isPending(status),
    nodes: data?.nodes || [],
    interval: data?.interval || '60s',
    reload: refetch,
  };
}

const DEFAULT_LOOKBACK_MS = 15 * 60 * 1000;

const buildPayload = (args: UseSnapshotRequest): SnapshotRequest => {
  const {
    accountId = '',
    currentTime,
    from,
    to,
    dropPartialBuckets = true,
    kuery,
    groupBy = null,
    includeTimeseries,
    metrics,
    nodeType,
    overrideCompositeSize,
    region = '',
    sourceId,
    timerange,
    schema,
  } = args;

  const resolvedTo = to ?? currentTime ?? Date.now();
  const resolvedFrom = from ?? resolvedTo - DEFAULT_LOOKBACK_MS;

  return {
    accountId,
    dropPartialBuckets,
    kuery,
    groupBy,
    includeTimeseries,
    metrics,
    nodeType,
    sourceId,
    overrideCompositeSize,
    region,
    schema: schema ?? 'ecs',
    timerange: timerange ?? {
      interval: '1m',
      to: resolvedTo,
      from: resolvedFrom,
      lookbackSize: 5,
    },
  };
};
