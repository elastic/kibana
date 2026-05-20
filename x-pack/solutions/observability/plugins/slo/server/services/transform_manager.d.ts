import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { IndicatorTypes, SLODefinition } from '../domain/models';
import type { TransformGenerator } from './transform_generators';
type TransformId = string;
export interface TransformManager {
    install(slo: SLODefinition): Promise<TransformId>;
    inspect(slo: SLODefinition): Promise<TransformPutTransformRequest>;
    preview(transformId: TransformId): Promise<void>;
    start(transformId: TransformId): Promise<void>;
    stop(transformId: TransformId): Promise<void>;
    uninstall(transformId: TransformId): Promise<void>;
    getVersion(transformId: TransformId): Promise<number | undefined>;
}
export declare class DefaultTransformManager implements TransformManager {
    private generators;
    private scopedClusterClient;
    private logger;
    private abortController;
    constructor(generators: Record<IndicatorTypes, TransformGenerator>, scopedClusterClient: IScopedClusterClient, logger: Logger, abortController?: AbortController);
    install(slo: SLODefinition): Promise<TransformId>;
    inspect(slo: SLODefinition): Promise<TransformPutTransformRequest>;
    preview(transformId: string): Promise<void>;
    start(transformId: TransformId): Promise<void>;
    stop(transformId: TransformId): Promise<void>;
    uninstall(transformId: TransformId): Promise<void>;
    getVersion(transformId: TransformId): Promise<number | undefined>;
    private scheduleNowTransform;
}
export {};
