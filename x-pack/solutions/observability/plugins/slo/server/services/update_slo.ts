/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
import { UpdateSLOParams, UpdateSLOResponse, updateSLOResponseSchema } from '@kbn/slo-schema';
import { asyncForEach } from '@kbn/std';
import { isEqual, pick } from 'lodash';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SLO_RESOURCES_VERSION,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  SUMMARY_TEMP_INDEX_NAME,
  getSLOPipelineId,
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
} from '../../common/constants';
import { getSLIPipelineTemplate } from '../assets/ingest_templates/sli_pipeline_template';
import { getSummaryPipelineTemplate } from '../assets/ingest_templates/summary_pipeline_template';
import { SLODefinition } from '../domain/models';
import { validateSLO } from '../domain/services';
import { SecurityException } from '../errors';
import { retryTransientEsErrors } from '../utils/retry';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';
import { assertExpectedIndicatorSourceIndexPrivileges } from './utils/assert_expected_indicator_source_index_privileges';

export class UpdateSLO {
  constructor(
    private repository: SLORepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private esClient: ElasticsearchClient,
    private scopedClusterClient: IScopedClusterClient,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath,
    private userId: string
  ) {}

  public async execute(sloId: string, params: UpdateSLOParams): Promise<UpdateSLOResponse> {
    const originalSlo = await this.repository.findById(sloId);
    let updatedSlo: SLODefinition = Object.assign({}, originalSlo, {
      ...params,
      groupBy: !!params.groupBy ? params.groupBy : originalSlo.groupBy,
      settings: Object.assign({}, originalSlo.settings, params.settings),
    });

    if (isEqual(originalSlo, updatedSlo)) {
      return this.toResponse(originalSlo);
    }

    const requireRevisionBump = await this.isRevisionBumpRequired(originalSlo, updatedSlo);

    updatedSlo = Object.assign(updatedSlo, {
      updatedAt: new Date(),
      updatedBy: this.userId,
      revision: requireRevisionBump ? originalSlo.revision + 1 : originalSlo.revision,
    });

    validateSLO(updatedSlo);

    await assertExpectedIndicatorSourceIndexPrivileges(updatedSlo, this.esClient);

    const rollbackOperations = [];
    await this.repository.update(updatedSlo);
    rollbackOperations.push(() => this.repository.update(originalSlo));

    if (!requireRevisionBump) {
      // we only have to update the summary pipeline to include the non-breaking changes (name, desc, tags, ...) in the summary index
      try {
        await retryTransientEsErrors(
          () =>
            this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(
              getSummaryPipelineTemplate(updatedSlo, this.spaceId, this.basePath)
            ),
          { logger: this.logger }
        );
      } catch (err) {
        this.logger.error(
          `Cannot update the SLO summary pipeline [id: ${updatedSlo.id}, revision: ${updatedSlo.revision}]. ${err}`
        );

        await asyncForEach(rollbackOperations.reverse(), async (operation) => {
          try {
            await operation();
          } catch (rollbackErr) {
            this.logger.error(`Rollback operation failed. ${rollbackErr}`);
          }
        });

        if (err.meta?.body?.error?.type === 'security_exception') {
          throw new SecurityException(err.meta.body.error.reason);
        }

        throw err;
      }

      return this.toResponse(updatedSlo);
    }

    const updatedRollupTransformId = getSLOTransformId(updatedSlo.id, updatedSlo.revision);
    const updatedSummaryTransformId = getSLOSummaryTransformId(updatedSlo.id, updatedSlo.revision);

    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(
            getSLIPipelineTemplate(updatedSlo)
          ),
        { logger: this.logger }
      );
      rollbackOperations.push(() =>
        this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
          { id: getSLOPipelineId(updatedSlo.id, updatedSlo.revision) },
          { ignore: [404] }
        )
      );

      await this.transformManager.install(updatedSlo);
      rollbackOperations.push(() => this.transformManager.uninstall(updatedRollupTransformId));

      await this.transformManager.start(updatedRollupTransformId);
      rollbackOperations.push(() => this.transformManager.stop(updatedRollupTransformId));

      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(
            getSummaryPipelineTemplate(updatedSlo, this.spaceId, this.basePath)
          ),
        { logger: this.logger }
      );
      rollbackOperations.push(() =>
        this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
          { id: getSLOSummaryPipelineId(updatedSlo.id, updatedSlo.revision) },
          { ignore: [404] }
        )
      );

      await this.summaryTransformManager.install(updatedSlo);
      rollbackOperations.push(() =>
        this.summaryTransformManager.uninstall(updatedSummaryTransformId)
      );

      await this.summaryTransformManager.start(updatedSummaryTransformId);
      rollbackOperations.push(() => this.summaryTransformManager.stop(updatedSummaryTransformId));

      await retryTransientEsErrors(
        () =>
          this.esClient.index({
            index: SUMMARY_TEMP_INDEX_NAME,
            id: `slo-${updatedSlo.id}`,
            document: createTempSummaryDocument(updatedSlo, this.spaceId, this.basePath),
            refresh: true,
          }),
        { logger: this.logger }
      );
    } catch (err) {
      this.logger.error(
        `Cannot update the SLO [id: ${updatedSlo.id}, revision: ${updatedSlo.revision}]. Rolling back. ${err}`
      );

      await asyncForEach(rollbackOperations.reverse(), async (operation) => {
        try {
          await operation();
        } catch (rollbackErr) {
          this.logger.error(`Rollback operation failed. ${rollbackErr}`);
        }
      });

      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
    }

    await this.deleteOriginalSLO(originalSlo);

    return this.toResponse(updatedSlo);
  }

  private async isRevisionBumpRequired(originalSlo: SLODefinition, updatedSlo: SLODefinition) {
    const fields = [
      'indicator',
      'groupBy',
      'timeWindow',
      'objective',
      'budgetingMethod',
      'settings',
    ];
    const hasBreakingChanges = !isEqual(pick(originalSlo, fields), pick(updatedSlo, fields));
    const currentResourcesVersion = await this.summaryTransformManager.getVersion(
      getSLOSummaryTransformId(originalSlo.id, originalSlo.revision)
    );

    const hasOutdatedVersion =
      currentResourcesVersion === undefined || currentResourcesVersion < SLO_RESOURCES_VERSION;

    return hasBreakingChanges || hasOutdatedVersion;
  }

  private async deleteOriginalSLO(originalSlo: SLODefinition) {
    try {
      const originalRollupTransformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
      await this.transformManager.stop(originalRollupTransformId);
      await this.transformManager.uninstall(originalRollupTransformId);

      const originalSummaryTransformId = getSLOSummaryTransformId(
        originalSlo.id,
        originalSlo.revision
      );
      await this.summaryTransformManager.stop(originalSummaryTransformId);
      await this.summaryTransformManager.uninstall(originalSummaryTransformId);

      await this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
        { id: getSLOSummaryPipelineId(originalSlo.id, originalSlo.revision) },
        { ignore: [404] }
      );

      await this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
        { id: getSLOPipelineId(originalSlo.id, originalSlo.revision) },
        { ignore: [404] }
      );
    } catch (err) {
      // Any errors here should not prevent moving forward.
      // Worst case we keep rolling up data for the previous revision number.
    }

    await this.deleteRollupData(originalSlo.id, originalSlo.revision);
    await this.deleteSummaryData(originalSlo.id, originalSlo.revision);
  }

  private async deleteRollupData(sloId: string, sloRevision: number): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      wait_for_completion: false,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': sloId } }, { term: { 'slo.revision': sloRevision } }],
        },
      },
    });
  }

  private async deleteSummaryData(sloId: string, sloRevision: number): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      refresh: true,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': sloId } }, { term: { 'slo.revision': sloRevision } }],
        },
      },
    });
  }

  private toResponse(slo: SLODefinition): UpdateSLOResponse {
    return updateSLOResponseSchema.encode(slo);
  }
}
