/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
import { resetSLOResponseSchema } from '@kbn/slo-schema';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SLO_MODEL_VERSION,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  SUMMARY_TEMP_INDEX_NAME,
  getSLOPipelineId,
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
} from '../../common/constants';
import { getSLIPipelineTemplate } from '../assets/ingest_templates/sli_pipeline_template';
import { getSummaryPipelineTemplate } from '../assets/ingest_templates/summary_pipeline_template';
import { retryTransientEsErrors } from '../utils/retry';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';
import { assertExpectedIndicatorSourceIndexPrivileges } from './utils/assert_expected_indicator_source_index_privileges';

export class ResetSLO {
  constructor(
    private esClient: ElasticsearchClient,
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLORepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath
  ) {}

  public async execute(sloId: string) {
    const slo = await this.repository.findById(sloId);

    await assertExpectedIndicatorSourceIndexPrivileges(slo, this.esClient);

    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    await this.summaryTransformManager.stop(summaryTransformId);
    await this.summaryTransformManager.uninstall(summaryTransformId);

    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    await this.transformManager.stop(rollupTransformId);
    await this.transformManager.uninstall(rollupTransformId);

    await Promise.all([this.deleteRollupData(slo.id), this.deleteSummaryData(slo.id)]);

    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(
            getSLIPipelineTemplate(slo)
          ),
        { logger: this.logger }
      );

      await this.transformManager.install(slo);
      await this.transformManager.start(rollupTransformId);

      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(
            getSummaryPipelineTemplate(slo, this.spaceId, this.basePath)
          ),
        { logger: this.logger }
      );

      await this.summaryTransformManager.install(slo);
      await this.summaryTransformManager.start(summaryTransformId);

      await retryTransientEsErrors(
        () =>
          this.esClient.index({
            index: SUMMARY_TEMP_INDEX_NAME,
            id: `slo-${slo.id}`,
            document: createTempSummaryDocument(slo, this.spaceId, this.basePath),
            refresh: true,
          }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(
        `Cannot reset the SLO [id: ${slo.id}, revision: ${slo.revision}]. Rolling back. ${err}`
      );

      await this.summaryTransformManager.stop(summaryTransformId);
      await this.summaryTransformManager.uninstall(summaryTransformId);
      await this.transformManager.stop(rollupTransformId);
      await this.transformManager.uninstall(rollupTransformId);
      await this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
        { id: getSLOSummaryPipelineId(slo.id, slo.revision) },
        { ignore: [404] }
      );

      await this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
        { id: getSLOPipelineId(slo.id, slo.revision) },
        { ignore: [404] }
      );

      throw err;
    }

    const updatedSlo = await this.repository.update({
      ...slo,
      version: SLO_MODEL_VERSION,
      updatedAt: new Date(),
    });

    return resetSLOResponseSchema.encode(updatedSlo);
  }

  /**
   * Deleting all SLI rollup data matching the sloId. All revision will be deleted in case of
   * residual documents.
   *
   * @param sloId
   */
  private async deleteRollupData(sloId: string): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      refresh: true,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': sloId } }],
        },
      },
    });
  }

  /**
   * Deleting the summary documents matching the sloId. All revision will be deleted in case of
   * residual documents.
   *
   * @param sloId
   */
  private async deleteSummaryData(sloId: string): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      refresh: true,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': sloId } }],
        },
      },
    });
  }
}
