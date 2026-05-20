import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SLODefinition } from '../domain/models';
import type { SummaryTransformGenerator } from './summary_transform_generator/summary_transform_generator';
import type { TransformManager } from './transform_manager';
type TransformId = string;
export declare class DefaultSummaryTransformManager implements TransformManager {
    private generator;
    private scopedClusterClient;
    private logger;
    private abortController;
    constructor(generator: SummaryTransformGenerator, scopedClusterClient: IScopedClusterClient, logger: Logger, abortController?: AbortController);
    install(slo: SLODefinition): Promise<TransformId>;
    inspect(slo: SLODefinition): Promise<TransformPutTransformRequest>;
    preview(transformId: string): Promise<void>;
    start(transformId: TransformId): Promise<void>;
    stop(transformId: TransformId): Promise<void>;
    uninstall(transformId: TransformId): Promise<void>;
    getVersion(transformId: TransformId): Promise<number | undefined>;
}
export {};
