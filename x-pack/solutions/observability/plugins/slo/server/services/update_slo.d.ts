import type { IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
import type { UpdateSLOParams, UpdateSLOResponse } from '@kbn/slo-schema';
import type { SLODefinition } from '../domain/models';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';
export declare class UpdateSLO {
    private repository;
    private transformManager;
    private summaryTransformManager;
    private scopedClusterClient;
    private logger;
    private spaceId;
    private basePath;
    private userId;
    constructor(repository: SLODefinitionRepository, transformManager: TransformManager, summaryTransformManager: TransformManager, scopedClusterClient: IScopedClusterClient, logger: Logger, spaceId: string, basePath: IBasePath, userId: string);
    execute(sloId: string, params: UpdateSLOParams): Promise<UpdateSLOResponse>;
    private isRevisionBumpRequired;
    private deleteOriginalSLO;
    private deleteRollupData;
    private deleteSummaryData;
    private deletePipeline;
    private createPipeline;
    createTempSummaryDocument(slo: SLODefinition): Promise<import("@elastic/elasticsearch/lib/api/types").WriteResponseBase>;
    private deleteTempSummaryDocument;
    private toResponse;
}
