import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { IBasePath, IScopedClusterClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';
export declare class CreateSLO {
    private scopedClusterClient;
    private repository;
    private internalSOClient;
    private transformManager;
    private summaryTransformManager;
    private logger;
    private spaceId;
    private basePath;
    private username;
    constructor(scopedClusterClient: IScopedClusterClient, repository: SLODefinitionRepository, internalSOClient: SavedObjectsClientContract, transformManager: TransformManager, summaryTransformManager: TransformManager, logger: Logger, spaceId: string, basePath: IBasePath, username: string);
    execute(params: CreateSLOParams): Promise<CreateSLOResponse>;
    private assertSLOInexistant;
    private createTempSummaryDocument;
    private deleteTempSummaryDocument;
    private createPipeline;
    private deletePipeline;
    inspect(params: CreateSLOParams): Promise<{
        slo: CreateSLOParams;
        rollUpPipeline: Record<string, any>;
        summaryPipeline: Record<string, any>;
        rollUpTransform: TransformPutTransformRequest;
        summaryTransform: TransformPutTransformRequest;
        temporaryDoc: Record<string, any>;
        rollUpTransformCompositeQuery: string;
        summaryTransformCompositeQuery: string;
    }>;
    private toSLO;
    private toResponse;
}
