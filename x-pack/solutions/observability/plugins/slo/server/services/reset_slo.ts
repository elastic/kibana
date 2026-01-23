/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import type { IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';
import type { ResetSLOResponse } from '@kbn/slo-schema';
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
  getWildcardPipelineId,
} from '../../common/constants';
import { getSLIPipelineTemplate } from '../assets/ingest_templates/sli_pipeline_template';
import { getSummaryPipelineTemplate } from '../assets/ingest_templates/summary_pipeline_template';
import type { SLODefinition } from '../domain/models';
import { SecurityException } from '../errors';
import { retryTransientEsErrors } from '../utils/retry';
import type { SLODefinitionRepository } from './slo_definition_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import type { TransformManager } from './transform_manager';
import { assertExpectedIndicatorSourceIndexPrivileges } from './utils/assert_expected_indicator_source_index_privileges';

export class ResetSLO {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLODefinitionRepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath
  ) {}

  public async execute(sloId: string): Promise<ResetSLOResponse> {
    const originalSlo = await this.repository.findById(sloId);
    await assertExpectedIndicatorSourceIndexPrivileges(
      originalSlo,
      this.scopedClusterClient.asCurrentUser
    );

    await this.deleteOriginalSLO(originalSlo);

    const resetedSlo: SLODefinition = {
      ...originalSlo,
      revision: originalSlo.revision + 1,
      version: SLO_MODEL_VERSION,
      updatedAt: new Date(),
    };

    await this.installResetedSLO(resetedSlo);

    await this.repository.update(resetedSlo);

    return resetSLOResponseSchema.encode(resetedSlo);
  }

  private async deleteOriginalSLO(slo: SLODefinition) {
    try {
      await Promise.all([
        this.transformManager.uninstall(getSLOTransformId(slo.id, slo.revision)),
        this.summaryTransformManager.uninstall(getSLOSummaryTransformId(slo.id, slo.revision)),
        this.deletePipeline(getWildcardPipelineId(slo.id, slo.revision)),
      ]);

      // Delete after we uninstalled the transforms
      await Promise.all([this.deleteRollupData(slo), this.deleteSummaryData(slo)]);
    } catch (err) {
      // Any errors here should not prevent moving forward.
      // Worst case we keep rolling up data for the orignal SLO
      this.logger.debug(
        `Deletion of the original SLO resources failed while resetting it: ${err}.`
      );
    }
  }

  private async deleteRollupData(slo: SLODefinition): Promise<void> {
    await this.scopedClusterClient.asCurrentUser.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      wait_for_completion: false,
      conflicts: 'proceed',
      slices: 'auto',
      query: {
        bool: {
          filter: [{ term: { 'slo.id': slo.id } }, { term: { 'slo.revision': slo.revision } }],
        },
      },
    });
  }

  private async deleteSummaryData(slo: SLODefinition): Promise<void> {
    await this.scopedClusterClient.asCurrentUser.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      refresh: true,
      wait_for_completion: false,
      conflicts: 'proceed',
      slices: 'auto',
      query: {
        bool: {
          filter: [{ term: { 'slo.id': slo.id } }, { term: { 'slo.revision': slo.revision } }],
        },
      },
    });
  }

  private async deletePipeline(id: string) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
          { id },
          { ignore: [404] }
        ),
      { logger: this.logger }
    );
  }

  private async installResetedSLO(slo: SLODefinition) {
    const rollbackOperations = [];

    const { id, revision } = slo;
    const rollupTransformId = getSLOTransformId(id, revision);
    const summaryTransformId = getSLOSummaryTransformId(id, revision);
    try {
      const sloPipelinePromise = this.createPipeline(getSLIPipelineTemplate(slo, this.spaceId));
      rollbackOperations.push(() => this.deletePipeline(getSLOPipelineId(id, revision)));

      const rollupTransformPromise = this.transformManager.install(slo);
      rollbackOperations.push(() => this.transformManager.uninstall(rollupTransformId));

      const summaryPipelinePromise = this.createPipeline(
        getSummaryPipelineTemplate(slo, this.spaceId, this.basePath)
      );
      rollbackOperations.push(() => this.deletePipeline(getSLOSummaryPipelineId(id, revision)));

      const summaryTransformPromise = this.summaryTransformManager.install(slo);
      rollbackOperations.push(() => this.summaryTransformManager.uninstall(summaryTransformId));

      const tempDocPromise = this.createTempSummaryDocument(slo);
      rollbackOperations.push(() => this.deleteTempSummaryDocument(slo));

      await Promise.all([
        sloPipelinePromise,
        rollupTransformPromise,
        summaryPipelinePromise,
        summaryTransformPromise,
        tempDocPromise,
      ]);

      // transforms can only be started after the pipelines are created
      await Promise.all([
        this.transformManager.start(rollupTransformId),
        this.summaryTransformManager.start(summaryTransformId),
      ]);
    } catch (err) {
      this.logger.debug(
        `Cannot reset the SLO [id: ${slo.id}, revision: ${slo.revision}]. Rolling back. ${err}`
      );

      await asyncForEach(rollbackOperations.reverse(), async (operation) => {
        try {
          await operation();
        } catch (rollbackErr) {
          this.logger.debug(`Rollback operation failed. ${rollbackErr}`);
        }
      });

      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
    }
  }

  private async createPipeline(params: IngestPutPipelineRequest) {
    return retryTransientEsErrors(
      () => this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(params),
      { logger: this.logger }
    );
  }

  async createTempSummaryDocument(slo: SLODefinition) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asCurrentUser.index({
          index: SUMMARY_TEMP_INDEX_NAME,
          id: `slo-${slo.id}`,
          document: createTempSummaryDocument(slo, this.spaceId, this.basePath),
          refresh: true,
        }),
      { logger: this.logger }
    );
  }

  async deleteTempSummaryDocument(slo: SLODefinition) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asCurrentUser.delete({
          index: SUMMARY_TEMP_INDEX_NAME,
          id: `slo-${slo.id}`,
          refresh: true,
        }),
      { logger: this.logger }
    );
  }
}
