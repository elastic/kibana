/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
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
  getWildcardPipelineId,
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

    await assertExpectedIndicatorSourceIndexPrivileges(
      updatedSlo,
      this.scopedClusterClient.asCurrentUser
    );

    const rollbackOperations = [];

    await this.repository.update(updatedSlo);
    rollbackOperations.push(() => this.repository.update(originalSlo));

    if (!requireRevisionBump) {
      // we only have to update the rollup and summary pipelines to include the non-breaking changes (name, desc, tags, ...) in the summary index
      try {
        await this.createPipeline(getSLIPipelineTemplate(updatedSlo, this.spaceId));
        rollbackOperations.push(() =>
          this.deletePipeline(getSLOPipelineId(updatedSlo.id, updatedSlo.revision))
        );

        await this.createPipeline(
          getSummaryPipelineTemplate(updatedSlo, this.spaceId, this.basePath)
        );
      } catch (err) {
        this.logger.debug(
          `Cannot update the SLO summary pipeline [id: ${updatedSlo.id}, revision: ${updatedSlo.revision}]. ${err}`
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

      return this.toResponse(updatedSlo);
    }

    const updatedRollupTransformId = getSLOTransformId(updatedSlo.id, updatedSlo.revision);
    const updatedSummaryTransformId = getSLOSummaryTransformId(updatedSlo.id, updatedSlo.revision);

    try {
      const sloPipelinePromise = this.createPipeline(
        getSLIPipelineTemplate(updatedSlo, this.spaceId)
      );
      rollbackOperations.push(() =>
        this.deletePipeline(getSLOPipelineId(updatedSlo.id, updatedSlo.revision))
      );

      const rollupTransformPromise = this.transformManager.install(updatedSlo);
      rollbackOperations.push(() => this.transformManager.uninstall(updatedRollupTransformId));

      const summaryPipelinePromise = this.createPipeline(
        getSummaryPipelineTemplate(updatedSlo, this.spaceId, this.basePath)
      );
      rollbackOperations.push(() =>
        this.deletePipeline(getSLOSummaryPipelineId(updatedSlo.id, updatedSlo.revision))
      );

      const summaryTransformPromise = this.summaryTransformManager.install(updatedSlo);
      rollbackOperations.push(() =>
        this.summaryTransformManager.uninstall(updatedSummaryTransformId)
      );

      const tempDocPromise = this.createTempSummaryDocument(updatedSlo);
      rollbackOperations.push(() => this.deleteTempSummaryDocument(updatedSlo));

      await Promise.all([
        sloPipelinePromise,
        rollupTransformPromise,
        summaryPipelinePromise,
        summaryTransformPromise,
        tempDocPromise,
      ]);

      // transforms can only be started after the pipelines are created
      await Promise.all([
        this.transformManager.start(updatedRollupTransformId),
        this.summaryTransformManager.start(updatedSummaryTransformId),
      ]);
    } catch (err) {
      this.logger.debug(
        `Cannot update the SLO [id: ${updatedSlo.id}, revision: ${updatedSlo.revision}]. Rolling back. ${err}`
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

  private async deleteOriginalSLO(slo: SLODefinition) {
    try {
      await Promise.all([
        this.transformManager.uninstall(getSLOTransformId(slo.id, slo.revision)),
        this.summaryTransformManager.uninstall(getSLOSummaryTransformId(slo.id, slo.revision)),
        this.deletePipeline(getWildcardPipelineId(slo.id, slo.revision)),
      ]);

      await Promise.all([this.deleteRollupData(slo), this.deleteSummaryData(slo)]);
    } catch (err) {
      // Any errors here should not prevent moving forward.
      // Worst case we keep rolling up data for the previous revision number.
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

  private async deleteTempSummaryDocument(slo: SLODefinition) {
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

  private toResponse(slo: SLODefinition): UpdateSLOResponse {
    return updateSLOResponseSchema.encode(slo);
  }
}
