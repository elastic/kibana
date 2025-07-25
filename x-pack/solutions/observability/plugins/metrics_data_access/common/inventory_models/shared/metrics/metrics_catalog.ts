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
  UnwrapRawConfig,
  MetricConfigEntry,
  MetricConfigMap,
  ResolvedMetricMap,
  SchemaTypes,
  SchemaWrappedEntry,
} from './types';

export class MetricsCatalog<TConfig extends MetricConfigMap>
  implements BaseMetricsCatalog<TConfig>
{
  private readonly catalog: ResolvedMetricMap<TConfig>;

  constructor(configCatalog: TConfig, private readonly schema: SchemaTypes = 'ecs') {
    this.catalog = this.resolveSchemaMetrics(configCatalog);
  }
  get<K extends keyof ResolvedMetricMap<TConfig>>(key: K): ResolvedMetricMap<TConfig>[K];
  get(key: string): UnwrapRawConfig<TConfig, keyof TConfig> | undefined;
  get(key: string): UnwrapRawConfig<TConfig, keyof TConfig> | undefined {
    return this.catalog[key as keyof ResolvedMetricMap<TConfig>] as any;
  }

  getAll() {
    return this.catalog;
  }

  private resolveSchemaMetrics(configCatalog: TConfig): ResolvedMetricMap<TConfig> {
    if (this.schema !== 'ecs' && this.schema !== 'semconv') {
      throw new Error(`Unsupported schema: ${this.schema}`);
    }

    const catalog = Object.entries(configCatalog).reduce((acc, [key, config]) => {
      const typedKey = key as keyof TConfig;

      if (this.isAggregationWithSchemaVariation(config)) {
        acc[typedKey] = config[this.schema] as any;
      } else if (this.isFormulaWithSchemaVariation(config)) {
        acc[typedKey] = {
          ...config,
          value: config.value[this.schema],
        } as any;
      } else if (this.schema === 'ecs') {
        acc[typedKey] = config as any;
      }

      return acc;
    }, {} as ResolvedMetricMap<TConfig>);

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
