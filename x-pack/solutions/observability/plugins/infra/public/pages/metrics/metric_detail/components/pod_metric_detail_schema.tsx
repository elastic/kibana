/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { K8S_POD_UID, KUBERNETES_POD_UID } from '@kbn/metrics-data-access-plugin/common';
import {
  TimeRangeMetadataProvider,
  useTimeRangeMetadataContext,
} from '../../../../hooks/use_time_range_metadata';
import { isPending } from '../../../../hooks/use_fetcher';
import { useIsPodSchemaSelectorEnabled } from '../../../../hooks/use_is_pod_schema_selector_enabled';
import { useAssetDetailsUrlState } from '../../../../components/asset_details/hooks/use_asset_details_url_state';
import { MetricDetailPage } from '../metric_detail_page';
import { useMetricsTimeContext } from '../hooks/use_metrics_time';
import { DetailSchemaProvider } from '../lib/detail_schema_context';
import { resolveDetailSchema } from '../lib/resolve_detail_schema';

const escapeKueryValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Resolves the pod schema and holds metadata/metric requests until detection
 * finishes, so the page does not paint Elastic Common Schema charts and then
 * replace them.
 */
const ResolvedPodDetailSchema = ({ nodeId }: { nodeId: string }) => {
  const { data: timeRangeMetadata, status } = useTimeRangeMetadataContext();
  const [urlState] = useAssetDetailsUrlState();
  const isPodSchemaSelectorEnabled = useIsPodSchemaSelectorEnabled();

  const schema = resolveDetailSchema({
    urlSchema: urlState?.preferredSchema,
    timeRangeMetadata,
    nodeType: 'pod',
    isPodSchemaSelectorEnabled,
  });

  const value = useMemo(
    () => ({
      schema,
      pending: isPending(status),
    }),
    [schema, status]
  );

  return (
    <DetailSchemaProvider value={value}>
      <MetricDetailPage key={nodeId} />
    </DetailSchemaProvider>
  );
};

export const PodMetricDetailSchema = ({ nodeId }: { nodeId: string }) => {
  const isPodSchemaSelectorEnabled = useIsPodSchemaSelectorEnabled();
  const { parsedTimeRange } = useMetricsTimeContext();

  const { start, end, kuery } = useMemo(() => {
    const escapedId = escapeKueryValue(nodeId);
    return {
      start: new Date(parsedTimeRange.from).toISOString(),
      end: new Date(parsedTimeRange.to).toISOString(),
      kuery: `${KUBERNETES_POD_UID}:"${escapedId}" or ${K8S_POD_UID}:"${escapedId}"`,
    };
  }, [nodeId, parsedTimeRange.from, parsedTimeRange.to]);

  if (!isPodSchemaSelectorEnabled) {
    return <MetricDetailPage />;
  }

  return (
    <TimeRangeMetadataProvider dataSource="pod" start={start} end={end} kuery={kuery}>
      <ResolvedPodDetailSchema nodeId={nodeId} />
    </TimeRangeMetadataProvider>
  );
};
