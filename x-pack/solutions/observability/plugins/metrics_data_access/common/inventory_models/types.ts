/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import type { estypes } from '@elastic/elasticsearch';
import type { LensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import type {
  AggregationConfigMap,
  ChartsConfigMap,
  DataSchemaFormat,
  FormulasConfigMap,
  InventoryMetricsConfig,
} from './shared/metrics/types';
import type {
  HOST_METRICS_RECEIVER_OTEL,
  KUBELET_STATS_RECEIVER_OTEL,
  SYSTEM_INTEGRATION,
} from '../constants';

export { DataSchemaFormatEnum, type DataSchemaFormat } from './shared/metrics/types';
export const ItemTypeRT = rt.keyof({
  host: null,
  pod: null,
  container: null,
  awsEC2: null,
  awsS3: null,
  awsSQS: null,
  awsRDS: null,
});

export const InventoryVisTypeRT = rt.keyof({
  line: null,
  area: null,
  bar: null,
});

export type InventoryVisType = rt.TypeOf<typeof InventoryVisTypeRT>;

export const InventoryFormatterTypeRT = rt.keyof({
  abbreviatedNumber: null,
  bits: null,
  bytes: null,
  number: null,
  percent: null,
  highPrecision: null,
});
export type InventoryFormatterType = rt.TypeOf<typeof InventoryFormatterTypeRT>;
export type InventoryItemType = rt.TypeOf<typeof ItemTypeRT>;

export const InventoryTsvbTypeKeysRT = rt.keyof({
  podOverview: null,
  podCpuUsage: null,
  podMemoryUsage: null,
  podLogUsage: null,
  podNetworkTraffic: null,
  nginxHits: null,
  nginxRequestRate: null,
  nginxActiveConnections: null,
  nginxRequestsPerConnection: null,
  awsOverview: null,
  awsCpuUtilization: null,
  awsNetworkBytes: null,
  awsNetworkPackets: null,
  awsDiskioBytes: null,
  awsDiskioOps: null,
  awsEC2CpuUtilization: null,
  awsEC2NetworkTraffic: null,
  awsEC2DiskIOBytes: null,
  awsS3TotalRequests: null,
  awsS3NumberOfObjects: null,
  awsS3BucketSize: null,
  awsS3DownloadBytes: null,
  awsS3UploadBytes: null,
  awsRDSCpuTotal: null,
  awsRDSConnections: null,
  awsRDSQueriesExecuted: null,
  awsRDSActiveTransactions: null,
  awsRDSLatency: null,
  awsSQSMessagesVisible: null,
  awsSQSMessagesDelayed: null,
  awsSQSMessagesSent: null,
  awsSQSMessagesEmpty: null,
  awsSQSOldestMessage: null,
  custom: null,
});
export type InventoryTsvbType = rt.TypeOf<typeof InventoryTsvbTypeKeysRT>;

export const TSVBMetricTypeRT = rt.keyof({
  avg: null,
  max: null,
  min: null,
  calculation: null,
  cardinality: null,
  series_agg: null,
  positive_only: null,
  derivative: null,
  count: null,
  sum: null,
  cumulative_sum: null,
});

export type TSVBMetricType = rt.TypeOf<typeof TSVBMetricTypeRT>;

export const TSVBMetricModelCountRT = rt.type({
  id: rt.string,
  type: rt.literal('count'),
});

export const TSVBMetricModelBasicMetricRT = rt.intersection([
  rt.type({
    id: rt.string,
    type: TSVBMetricTypeRT,
  }),
  rt.partial({
    field: rt.string,
  }),
]);

export const TSVBMetricModelVariableRT = rt.type({
  field: rt.string,
  id: rt.string,
  name: rt.string,
});

export const TSVBMetricModelBucketScriptRT = rt.intersection([
  rt.type({
    id: rt.string,
    script: rt.string,
    type: rt.literal('calculation'),
    variables: rt.array(TSVBMetricModelVariableRT),
  }),
  rt.partial({
    gap_policy: rt.union([
      rt.literal('skip'),
      rt.literal('insert_zeros'),
      rt.literal('keep_values'),
    ]),
  }),
]);

export const TSVBMetricModelDerivativeRT = rt.type({
  id: rt.string,
  field: rt.string,
  unit: rt.string,
  type: rt.literal('derivative'),
});

export const TSVBMetricModelSeriesAggRT = rt.type({
  id: rt.string,
  function: rt.string,
  type: rt.literal('series_agg'),
});

export const TSVBPercentileItemRT = rt.type({
  id: rt.string,
  value: rt.number,
});

export const TSVBMetricModePercentileAggRT = rt.intersection([
  rt.type({
    id: rt.string,
    type: rt.literal('percentile'),
    percentiles: rt.array(TSVBPercentileItemRT),
  }),
  rt.partial({ field: rt.string }),
]);

export const TSVBMetricRT = rt.union([
  TSVBMetricModelCountRT,
  TSVBMetricModelBasicMetricRT,
  TSVBMetricModelBucketScriptRT,
  TSVBMetricModelDerivativeRT,
  TSVBMetricModePercentileAggRT,
  TSVBMetricModelSeriesAggRT,
]);
export type TSVBMetric = rt.TypeOf<typeof TSVBMetricRT>;

export const TSVBSeriesRT = rt.intersection([
  rt.type({
    id: rt.string,
    metrics: rt.array(TSVBMetricRT),
    split_mode: rt.string,
  }),
  rt.partial({
    terms_field: rt.string,
    terms_size: rt.number,
    terms_order_by: rt.string,
    filter: rt.type({
      query: rt.string,
      language: rt.keyof({
        lucene: null,
        kuery: null,
      }),
    }),
  }),
]);

export type TSVBSeries = rt.TypeOf<typeof TSVBSeriesRT>;

export const TSVBMetricModelRT = rt.intersection([
  rt.type({
    id: InventoryTsvbTypeKeysRT,
    requires: rt.array(rt.string),
    index_pattern: rt.union([rt.string, rt.array(rt.string)]),
    interval: rt.string,
    time_field: rt.string,
    type: rt.string,
    series: rt.array(TSVBSeriesRT),
  }),
  rt.partial({
    filter: rt.string,
    map_field_to: rt.string,
    id_type: rt.keyof({ cloud: null, node: null }),
    drop_last_bucket: rt.boolean,
  }),
]);

export type TSVBMetricModel = rt.TypeOf<typeof TSVBMetricModelRT>;

export type TSVBMetricModelCreator = (
  timeField: string,
  indexPattern: string | string[],
  interval: string
) => TSVBMetricModel;

export type MetricsUIAggregation = Record<string, estypes.AggregationsAggregate>;

export const SnapshotMetricTypeKeys = {
  count: null,
  cpuV2: null,
  cpu: null,
  diskLatency: null,
  diskSpaceUsage: null,
  load: null,
  memory: null,
  memoryFree: null,
  memoryTotal: null,
  normalizedLoad1m: null,
  tx: null,
  rx: null,
  txV2: null,
  rxV2: null,
  logRate: null,
  diskIOReadBytes: null,
  diskIOWriteBytes: null,
  s3TotalRequests: null,
  s3NumberOfObjects: null,
  s3BucketSize: null,
  s3DownloadBytes: null,
  s3UploadBytes: null,
  rdsConnections: null,
  rdsQueriesExecuted: null,
  rdsActiveTransactions: null,
  rdsLatency: null,
  sqsMessagesVisible: null,
  sqsMessagesDelayed: null,
  sqsMessagesSent: null,
  sqsMessagesEmpty: null,
  sqsOldestMessage: null,
  custom: null,
};
export const SnapshotMetricTypeRT = rt.keyof(SnapshotMetricTypeKeys);

export type SnapshotMetricType = rt.TypeOf<typeof SnapshotMetricTypeRT>;

type BeatsIntegrations = 'aws' | 'docker' | typeof SYSTEM_INTEGRATION | 'kubernetes';
type OtelReceivers = typeof HOST_METRICS_RECEIVER_OTEL | typeof KUBELET_STATS_RECEIVER_OTEL;
type Integrations =
  | {
      beats: BeatsIntegrations;
      otel: OtelReceivers;
    }
  | BeatsIntegrations;

export interface InventoryModel<
  TEntityType extends InventoryItemType,
  TAggregations extends AggregationConfigMap,
  TFormulas extends FormulasConfigMap | undefined = undefined,
  TCharts extends ChartsConfigMap | undefined = undefined
> {
  id: TEntityType;
  displayName: string;
  singularDisplayName: string;
  requiredIntegration: Integrations;
  fields: {
    id: string;
    name: string;
    os?: string;
    ip?: string;
    cloudProvider?: string;
  };
  crosslinkSupport: {
    details: boolean;
    logs: boolean;
    apm: boolean;
    uptime: boolean;
  };
  metrics: InventoryMetricsConfig<TAggregations, TFormulas, TCharts>;
  nodeFilter?: (args?: { schema?: DataSchemaFormat }) => estypes.QueryDslQueryContainer[];
}

export type LensConfigWithId = LensConfig & { id: string };
