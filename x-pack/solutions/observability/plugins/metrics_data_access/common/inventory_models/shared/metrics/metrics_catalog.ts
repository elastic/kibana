/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import type {
  AggregationConfig,
  BaseMetricsCatalog,
  MetricConfigEntry,
  MetricConfigMap,
  ResolvedMetricMap,
  SchemaWrappedEntry,
} from './types';

export class MetricsCatalog<
  TConfig extends MetricConfigMap,
  TResolved extends ResolvedMetricMap<TConfig> = ResolvedMetricMap<TConfig>
> implements BaseMetricsCatalog<TConfig, TResolved>
{
  private readonly catalog: TResolved;

  constructor(configCatalog: TConfig, private readonly schema: 'ecs' | 'semconv' = 'ecs') {
    this.catalog = this.resolveSchemaMetrics(configCatalog);
  }

  get<TKey extends keyof TResolved | string>(key: TKey): TResolved[TKey] {
    return this.catalog[key];
  }

  getAll() {
    return this.catalog;
  }

  private resolveSchemaMetrics(configCatalog: TConfig): TResolved {
    if (this.schema !== 'ecs' && this.schema !== 'semconv') {
      throw new Error(`Unsupported schema: ${this.schema}`);
    }

    const catalog = Object.entries(configCatalog).reduce((acc, [key, config]) => {
      if (this.isAggregationWithSchemaVariation(config)) {
        acc[key as keyof TConfig] = config[this.schema] as any;
      } else if (this.isFormulaWithSchemaVariation(config)) {
        acc[key as keyof TConfig] = {
          ...config,
          value: config.value[this.schema],
        } as any;
      } else {
        acc[key as keyof TConfig] = config as any;
      }

      return acc;
    }, {} as TResolved);

    return catalog;
  }

  private isFormulaWithSchemaVariation(
    obj: MetricConfigEntry<any>
  ): obj is SchemaWrappedEntry<LensBaseLayer> {
    return (
      'value' in obj &&
      typeof obj.value === 'object' &&
      'ecs' in obj.value &&
      'semconv' in obj.value
    );
  }

  private isAggregationWithSchemaVariation(
    obj: MetricConfigEntry<any>
  ): obj is SchemaWrappedEntry<AggregationConfig> {
    return 'ecs' in obj && 'semconv' in obj;
  }
}
