/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InventoryItemType,
  InventoryTsvbType,
  DataSchemaFormat,
} from '@kbn/metrics-data-access-plugin/common';
import type { BehaviorSubject } from 'rxjs';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { InfraMetadataRT } from '../../../../common/http_api/metadata_api';
import { getFilteredMetrics } from '../../../pages/metrics/metric_detail/lib/get_filtered_metrics';

interface UseMetadataProps {
  entityId: string;
  entityType: InventoryItemType;
  requiredTsvb?: InventoryTsvbType[];
  sourceId: string;
  timeRange: {
    from: number;
    to: number;
  };
  schema?: DataSchemaFormat;
  /** When false, wait for schema detection before posting metadata. */
  enabled?: boolean;
  request$?: BehaviorSubject<(() => Promise<unknown>) | undefined>;
}
export function useMetadata({
  entityId,
  entityType,
  sourceId,
  timeRange,
  requiredTsvb = [],
  schema,
  enabled = true,
  request$,
}: UseMetadataProps) {
  const { data, status, error, refetch } = useFetcher(
    (callApi) => {
      // Synchronous `undefined` tells useFetcher not to start a request.
      // `enabled` is also a dependency so detection finishing (schema still
      // omitted) recreates this callback and the fetch actually runs.
      if (!enabled) {
        return undefined;
      }

      return (async () => {
        const response = await callApi('/api/infra/metadata', {
          method: 'POST',
          body: JSON.stringify({
            nodeId: entityId,
            nodeType: entityType,
            sourceId,
            timeRange,
            ...(schema === 'semconv' ? { schema } : {}),
          }),
        });
        return decodeOrThrow(InfraMetadataRT)(response);
      })();
    },
    [enabled, entityId, entityType, schema, sourceId, timeRange],
    {
      requestObservable$: request$,
      autoFetch: enabled,
    }
  );

  return {
    name: (data && data.name) || '',
    filteredRequiredMetrics:
      data && requiredTsvb.length > 0
        ? getFilteredMetrics(requiredTsvb, data.features, schema)
        : [],
    error: (error && error.message) || null,
    loading: isPending(status),
    metadata: data,
    cloudId: data?.info?.cloud?.instance?.id || '',
    reload: refetch,
  };
}
