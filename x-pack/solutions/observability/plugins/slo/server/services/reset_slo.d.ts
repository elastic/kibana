import type { IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ResetSLOResponse } from '@kbn/slo-schema';
import type { SLODefinition } from '../domain/models';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';
export declare class ResetSLO {
    private scopedClusterClient;
    private repository;
    private transformManager;
    private summaryTransformManager;
    private logger;
    private spaceId;
    private basePath;
    constructor(scopedClusterClient: IScopedClusterClient, repository: SLODefinitionRepository, transformManager: TransformManager, summaryTransformManager: TransformManager, logger: Logger, spaceId: string, basePath: IBasePath);
    execute(sloId: string): Promise<ResetSLOResponse>;
    private deleteOriginalSLO;
    private deleteRollupData;
    private deleteSummaryData;
    private deletePipeline;
    private installResetedSLO;
    private createPipeline;
    createTempSummaryDocument(slo: SLODefinition): Promise<import("@elastic/elasticsearch/lib/api/types").WriteResponseBase>;
    deleteTempSummaryDocument(slo: SLODefinition): Promise<import("@elastic/elasticsearch/lib/api/types").WriteResponseBase>;
}
