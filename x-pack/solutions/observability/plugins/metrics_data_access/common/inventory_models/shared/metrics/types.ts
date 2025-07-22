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

/* base types */
export type SchemaTypes = 'ecs' | 'semconv';
export type SchemaBasedFormulas = Omit<LensBaseLayer, 'value'> & {
  value: Record<SchemaTypes, LensBaseLayer['value']>;
};
export type SchemaBasedAggregations = Record<SchemaTypes, MetricsUIAggregation>;

export type FormulasConfig = LensBaseLayer | SchemaBasedFormulas;
export type AggregationConfig = MetricsUIAggregation | SchemaBasedAggregations;
export type RawMetricEntry = FormulasConfig | AggregationConfig;
export type MetricConfigMap<T extends RawMetricEntry = RawMetricEntry> = Record<
  string,
  MetricConfigEntry<T>
>;
export type AggregationConfigMap = MetricConfigMap<AggregationConfig>;
export type FormulasConfigMap = MetricConfigMap<FormulasConfig>;

/** helper types */
export type SchemaWrappedEntry<T> = T extends AggregationConfig
  ? SchemaBasedAggregations
  : T extends LensBaseLayer
  ? SchemaBasedFormulas
  : never;

export type MetricConfigEntry<T extends RawMetricEntry = RawMetricEntry> =
  | MetricsUIAggregation
  | LensBaseLayer
  | SchemaWrappedEntry<T>;

export type UnwrapMetricConfig<T> = T extends SchemaBasedFormulas
  ? LensBaseLayer
  : T extends SchemaBasedAggregations
  ? MetricsUIAggregation
  : T;

export type ResolvedMetricMap<T extends MetricConfigMap> = {
  [K in keyof T]: UnwrapMetricConfig<T[K]>;
};

/** catalog types */

export interface BaseMetricsCatalog<TConfigMap extends MetricConfigMap = MetricConfigMap> {
  get<K extends keyof ResolvedMetricMap<TConfigMap>>(key: K): ResolvedMetricMap<TConfigMap>[K];

  get(key: string): ResolvedMetricMap<TConfigMap>[keyof ResolvedMetricMap<TConfigMap>] | undefined;
  getAll(): ResolvedMetricMap<TConfigMap>;
}
export type AggregationsCatalog<TConfigMap extends AggregationConfigMap> =
  BaseMetricsCatalog<TConfigMap>;
export type FormulasCatalog<TConfigMap extends FormulasConfigMap> = BaseMetricsCatalog<TConfigMap>;

export type LensMetricChartConfig = Record<
  string,
  {
    [key in ChartType]?: Partial<Record<string, LensConfigWithId>>;
  }
>;

/** inventory types */

export interface BaseInventoryMetricsConfig<TAggregations extends AggregationConfigMap> {
  tsvb?: Record<string, TSVBMetricModelCreator>;
  defaultSnapshot: SnapshotMetricType;
  defaultTimeRangeInSeconds: number;
  getAggregations: (args?: { schema?: SchemaTypes }) => Promise<AggregationsCatalog<TAggregations>>;
}

export interface InventoryMetricsConfigWithLens<
  TAggregations extends AggregationConfigMap,
  TFormulas extends FormulasConfigMap,
  TCharts extends LensMetricChartConfig
> extends BaseInventoryMetricsConfig<TAggregations> {
  getFormulas: (args?: { schema?: SchemaTypes }) => Promise<FormulasCatalog<TFormulas>>;
  getCharts: () => Promise<TCharts>;
}

export type InventoryMetricsConfig<
  TAggregations extends AggregationConfigMap = AggregationConfigMap,
  TFormulas extends FormulasConfigMap | undefined = undefined,
  TCharts extends LensMetricChartConfig | undefined = undefined
> = TFormulas extends undefined
  ? BaseInventoryMetricsConfig<TAggregations>
  : TCharts extends undefined
  ? BaseInventoryMetricsConfig<TAggregations>
  : InventoryMetricsConfigWithLens<TAggregations, NonNullable<TFormulas>, NonNullable<TCharts>>;
