import type { DataSchemaFormat } from './types';
import type { BaseMetricsCatalog, UnwrapRawConfig, MetricConfigMap, ResolvedMetricMap } from './types';
export declare class MetricsCatalog<TConfig extends MetricConfigMap> implements BaseMetricsCatalog<TConfig> {
    private readonly catalog;
    private readonly includeLegacyMetrics;
    private readonly legacyMetrics;
    private readonly _schema;
    constructor(configCatalog: TConfig, schema?: DataSchemaFormat, options?: {
        includeLegacyMetrics?: boolean;
        legacyMetrics?: Array<keyof TConfig>;
    });
    get schema(): DataSchemaFormat;
    get<K extends keyof ResolvedMetricMap<TConfig>>(key: K): ResolvedMetricMap<TConfig>[K];
    get(key: string): UnwrapRawConfig<TConfig, keyof TConfig> | undefined;
    getAll(): ResolvedMetricMap<TConfig>;
    private resolveSchemaMetrics;
    private isFormulaWithSchemaVariation;
    private isAggregationWithSchemaVariation;
}
