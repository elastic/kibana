/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartType, LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import type {
  InventoryTsvbType,
  LensConfigWithId,
  MetricsUIAggregation,
  SnapshotMetricType,
  TSVBMetricModelCreator,
} from '../../types';

/* base types */
export enum DataSchemaFormatEnum {
  ECS = 'ecs',
  SEMCONV = 'semconv',
}

export type DataSchemaFormat = `${DataSchemaFormatEnum}`;

export type SchemaBasedFormula = Omit<LensBaseLayer, 'value'> & {
  value: Record<DataSchemaFormat, LensBaseLayer['value']>;
};
export type SchemaBasedAggregations = Record<DataSchemaFormat, MetricsUIAggregation>;

export type ChartsConfig = {
  [key in ChartType]?: Partial<Record<string, LensConfigWithId>>;
};
export type FormulasConfig = LensBaseLayer | SchemaBasedFormula;
export type AggregationConfig = MetricsUIAggregation | SchemaBasedAggregations;
export type RawConfig = FormulasConfig | AggregationConfig;

/** config maps */
export type MetricConfigMap<T extends RawConfig = RawConfig> = Record<string, MetricConfigEntry<T>>;
export type AggregationConfigMap = MetricConfigMap<AggregationConfig>;
export type FormulasConfigMap = MetricConfigMap<FormulasConfig>;
export type ChartsConfigMap = MetricConfigMap<ChartsConfig>;

/** helper types */
export type SchemaWrappedEntry<T> = T extends AggregationConfig
  ? SchemaBasedAggregations
  : T extends LensBaseLayer
  ? SchemaBasedFormula
  : never;

export type MetricConfigEntry<T extends RawConfig = RawConfig> =
  | MetricsUIAggregation
  | LensBaseLayer
  | SchemaWrappedEntry<T>;

export type UnwrapMetricConfig<T> = T extends SchemaBasedFormula
  ? LensBaseLayer
  : T extends SchemaBasedAggregations
  ? MetricsUIAggregation
  : T;

export type ResolvedMetricMap<T extends MetricConfigMap> = {
  [K in keyof T]: UnwrapMetricConfig<T[K]>;
};

export type UnwrapRawConfig<T extends MetricConfigMap, K extends keyof T> = UnwrapMetricConfig<
  T[K]
>;

/** catalog types */
export interface BaseMetricsCatalog<TConfigMap extends MetricConfigMap> {
  get schema(): DataSchemaFormat;
  get<K extends keyof ResolvedMetricMap<TConfigMap>>(
    key: K
  ): UnwrapRawConfig<TConfigMap, keyof TConfigMap>;
  get(key: string): UnwrapRawConfig<TConfigMap, keyof TConfigMap> | undefined;
  getAll(): ResolvedMetricMap<TConfigMap>;
}
export type AggregationsCatalog<TConfigMap extends AggregationConfigMap> =
  BaseMetricsCatalog<TConfigMap>;
export type FormulasCatalog<TConfigMap extends FormulasConfigMap> = BaseMetricsCatalog<TConfigMap>;

/** inventory types */
export interface BaseInventoryMetricsConfig<TAggregations extends AggregationConfigMap> {
  defaultSnapshot: keyof TAggregations;
  defaultTimeRangeInSeconds: number;
  legacyMetrics?: SnapshotMetricType[];

  getWaffleMapTooltipMetrics: (args?: { schema?: DataSchemaFormat }) => SnapshotMetricType[];
  getAggregations: (args?: {
    schema?: DataSchemaFormat;
  }) => Promise<AggregationsCatalog<TAggregations>>;
}

export interface InventoryTsvbMetrics {
  tsvb: Record<string, TSVBMetricModelCreator>;
  requiredTsvb: InventoryTsvbType[];
}
export interface InventoryMetricsConfigWithLens<
  TFormulas extends FormulasConfigMap,
  TCharts extends ChartsConfigMap
> {
  getFormulas: (args?: { schema?: DataSchemaFormat }) => Promise<FormulasCatalog<TFormulas>>;
  getCharts: (args?: { schema?: DataSchemaFormat }) => Promise<TCharts>;
}

export type InventoryMetricsConfig<
  TAggregations extends AggregationConfigMap = AggregationConfigMap,
  TFormulas extends FormulasConfigMap | undefined = undefined,
  TCharts extends ChartsConfigMap | undefined = undefined
> = BaseInventoryMetricsConfig<TAggregations> &
  (TFormulas extends undefined
    ? TCharts extends undefined
      ? InventoryTsvbMetrics
      : never
    : TCharts extends undefined
    ? never
    : InventoryMetricsConfigWithLens<NonNullable<TFormulas>, NonNullable<TCharts>>);
