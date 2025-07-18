/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartType, LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import type {
  LensConfigWithId,
  MetricsUIAggregation,
  SnapshotMetricType,
  TSVBMetricModelCreator,
} from '../../types';

export type SchemaTypes = 'ecs' | 'semconv';

export type LensSchemaVariant = Omit<LensBaseLayer, 'value'> & {
  value: Record<SchemaTypes, LensBaseLayer['value']>;
};
export type LensFormulaConfig = LensBaseLayer | LensSchemaVariant;
export type AggregationSchemaVariant = Record<SchemaTypes, MetricsUIAggregation>;
export type AggregationConfig = MetricsUIAggregation | AggregationSchemaVariant;
export type RawMetricEntry = LensFormulaConfig | AggregationConfig;

export type SchemaWrappedEntry<T> = T extends AggregationConfig
  ? AggregationSchemaVariant
  : T extends LensBaseLayer
  ? LensSchemaVariant
  : never;

export type MetricConfigEntry<T extends RawMetricEntry = RawMetricEntry> =
  | MetricsUIAggregation
  | LensBaseLayer
  | SchemaWrappedEntry<T>;

export type MetricConfigMap<T extends RawMetricEntry = RawMetricEntry> = Record<
  string,
  MetricConfigEntry<T>
>;

export type UnwrapMetricConfig<T> = T extends LensSchemaVariant
  ? LensBaseLayer
  : T extends AggregationSchemaVariant
  ? MetricsUIAggregation
  : T;

export type ResolvedMetricMap<T extends MetricConfigMap> = {
  [K in keyof T]: UnwrapMetricConfig<T[K]>;
};

export interface BaseMetricsCatalog<
  TConfig extends MetricConfigMap = MetricConfigMap,
  TResolved extends ResolvedMetricMap<TConfig> = ResolvedMetricMap<TConfig>
> {
  get: <K extends keyof TResolved>(key: K) => TResolved[K];
  getAll(): TResolved;
}

export type MetricsAggregationsCatalog = BaseMetricsCatalog<
  Record<string, AggregationConfig>,
  ResolvedMetricMap<Record<string, AggregationConfig>>
>;

export type MetricsFormulasCatalog = BaseMetricsCatalog<
  Record<string, LensFormulaConfig>,
  ResolvedMetricMap<Record<string, LensFormulaConfig>>
>;

export type LensMetricChartConfig = Record<
  string,
  {
    [key in ChartType]?: Partial<Record<string, LensConfigWithId>>;
  }
>;

export type LensMetricFormulaConfig = LensBaseLayer | LensSchemaVariant;

export interface BaseInventoryMetricsConfig<TCatalog extends MetricConfigMap> {
  tsvb?: Record<string, TSVBMetricModelCreator>;
  defaultSnapshot: SnapshotMetricType;
  defaultTimeRangeInSeconds: number;
  getAggregations: (args?: {
    schema?: SchemaTypes;
  }) => Promise<BaseMetricsCatalog<TCatalog, ResolvedMetricMap<TCatalog>>>;
}

export interface InventoryMetricsConfigWithLens<
  TAggeggations extends MetricConfigMap<AggregationConfig>,
  TFormulas extends MetricConfigMap<LensFormulaConfig>,
  TCharts extends LensMetricChartConfig
> extends BaseInventoryMetricsConfig<TAggeggations> {
  getFormulas: (args?: {
    schema?: SchemaTypes;
  }) => Promise<BaseMetricsCatalog<TFormulas, ResolvedMetricMap<TFormulas>>>;
  getCharts: () => Promise<TCharts>;
}

export type InventoryMetricsConfig<
  TAggeggations extends MetricConfigMap<AggregationConfig> = MetricConfigMap<AggregationConfig>,
  TFormulas extends MetricConfigMap<LensFormulaConfig> | undefined = undefined,
  TCharts extends LensMetricChartConfig | undefined = undefined
> = TFormulas extends undefined
  ? BaseInventoryMetricsConfig<TAggeggations>
  : TCharts extends undefined
  ? BaseInventoryMetricsConfig<TAggeggations>
  : InventoryMetricsConfigWithLens<TAggeggations, NonNullable<TFormulas>, NonNullable<TCharts>>;
