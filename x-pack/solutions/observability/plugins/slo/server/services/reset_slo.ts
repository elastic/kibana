/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
import { resetSLOResponseSchema } from '@kbn/slo-schema';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SLO_MODEL_VERSION,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  SUMMARY_TEMP_INDEX_NAME,
  getSLOSummaryTransformId,
  getSLOTransformId,
  getWildcardPipelineId,
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

    await assertExpectedIndicatorSourceIndexPrivileges(slo, this.scopedClusterClient.asCurrentUser);

    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    await this.summaryTransformManager.uninstall(summaryTransformId);

    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
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
          this.scopedClusterClient.asCurrentUser.index({
            index: SUMMARY_TEMP_INDEX_NAME,
            id: `slo-${slo.id}`,
            document: createTempSummaryDocument(slo, this.spaceId, this.basePath),
            refresh: true,
          }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.debug(
        `Cannot reset the SLO [id: ${slo.id}, revision: ${slo.revision}]. Rolling back. ${err}`
      );

      await this.summaryTransformManager.uninstall(summaryTransformId);
      await this.transformManager.uninstall(rollupTransformId);
      await this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
        { id: getWildcardPipelineId(slo.id, slo.revision) },
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
    await this.scopedClusterClient.asCurrentUser.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      refresh: true,
      conflicts: 'proceed',
      slices: 'auto',
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
    await this.scopedClusterClient.asCurrentUser.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      refresh: true,
      conflicts: 'proceed',
      slices: 'auto',
      query: {
        bool: {
          filter: [{ term: { 'slo.id': sloId } }],
        },
      },
    });
  }
}
