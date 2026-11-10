/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import type { IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
import { addTransactionLabels } from '@kbn/apm-utils';
import type { UpdateSLOParams, UpdateSLOResponse } from '@kbn/slo-schema';
import { updateSLOResponseSchema } from '@kbn/slo-schema';
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
import type { SLODefinition } from '../domain/models';
import { validateSLO } from '../domain/services';
import { SecurityException } from '../errors';
import type { SloTelemetryReporter } from '../lib/telemetry';
import {
  SLO_UPDATED_EBT_EVENT_TYPE,
  getChangedFields,
  toSloDefinitionEbtData,
} from '../lib/telemetry';
import { allSettledOrThrow } from '../utils/all_settled_or_throw';
import { REQUEST_RETRY_OPTIONS, retryTransientEsErrors } from '../utils/retry';
import type { RollbackOperation } from '../utils/run_rollback';
import { ROLLBACK_DEADLINE_MS, runRollback } from '../utils/run_rollback';
import { REQUEST_DEADLINE_MS, withDeadline, withTimeoutSignal } from '../utils/with_deadline';
import type { SLODefinitionRepository } from './slo_definition_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import type { TransformManager } from './transform_manager';
import { assertExpectedIndicatorSourceIndexPrivileges } from './utils/assert_expected_indicator_source_index_privileges';
import { getSloApmLabels } from './utils';

export class UpdateSLO {
  constructor(
    private repository: SLODefinitionRepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private scopedClusterClient: IScopedClusterClient,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath,
    private userId: string,
    private telemetry: SloTelemetryReporter
  ) {}

  public async execute(sloId: string, params: UpdateSLOParams): Promise<UpdateSLOResponse> {
    return withDeadline(REQUEST_DEADLINE_MS, (signal) => this.update(sloId, params, signal));
  }

  private async update(
    sloId: string,
    params: UpdateSLOParams,
    signal: AbortSignal
  ): Promise<UpdateSLOResponse> {
    const originalSlo = await this.repository.findById(sloId);
    let updatedSlo: SLODefinition = Object.assign({}, originalSlo, {
      ...params,
      groupBy: !!params.groupBy ? params.groupBy : originalSlo.groupBy,
      settings: Object.assign({}, originalSlo.settings, params.settings),
    });
    addTransactionLabels(getSloApmLabels(updatedSlo));

    if (isEqual(originalSlo, updatedSlo)) {
      return this.toResponse(originalSlo);
    }

    const requireRevisionBump = await this.isRevisionBumpRequired(originalSlo, updatedSlo, signal);

    updatedSlo = Object.assign(updatedSlo, {
      updatedAt: new Date(),
      updatedBy: this.userId,
      revision: requireRevisionBump ? originalSlo.revision + 1 : originalSlo.revision,
    });

    validateSLO(updatedSlo);

    await assertExpectedIndicatorSourceIndexPrivileges(
      updatedSlo,
      this.scopedClusterClient.asCurrentUser,
      { signal }
    );

    const rollbackOperations: RollbackOperation[] = [];

    await this.repository.update(updatedSlo);
    const restoreOriginalSLO = () => this.repository.update(originalSlo);

    if (!requireRevisionBump) {
      // we only have to update the rollup and summary pipelines to include the non-breaking changes (name, desc, tags, ...) in the summary index
      try {
        // same revision: the pipeline is live, so restore the original one instead of deleting it
        rollbackOperations.push((rollbackSignal) =>
          this.createPipeline(getSLIPipelineTemplate(originalSlo, this.spaceId), rollbackSignal)
        );
        await this.createPipeline(getSLIPipelineTemplate(updatedSlo, this.spaceId), signal);

        await this.createPipeline(
          getSummaryPipelineTemplate(updatedSlo, this.spaceId, this.basePath),
          signal
        );
      } catch (err) {
        this.logger.warn('Cannot update the SLO summary pipeline. Rolling back.', {
          service: { name: 'update_slo' },
          labels: {
            slo_id: updatedSlo.id,
            indicator_type: updatedSlo.indicator.type,
            error_type: 'update_failed',
          },
          error: err,
        });

        await runRollback({
          operations: rollbackOperations,
          finalOperation: restoreOriginalSLO,
          onError: (rollbackErr) => this.logRollbackFailure(updatedSlo, rollbackErr),
        });

        if (err.meta?.body?.error?.type === 'security_exception') {
          throw new SecurityException(err.meta.body.error.reason);
        }

        throw err;
      }

      this.reportUpdated(originalSlo, updatedSlo);

      return this.toResponse(updatedSlo);
    }

    const updatedRollupTransformId = getSLOTransformId(updatedSlo.id, updatedSlo.revision);
    const updatedSummaryTransformId = getSLOSummaryTransformId(updatedSlo.id, updatedSlo.revision);

    try {
      const sloPipelinePromise = this.createPipeline(
        getSLIPipelineTemplate(updatedSlo, this.spaceId),
        signal
      );
      rollbackOperations.push((rollbackSignal) =>
        this.deletePipeline(getSLOPipelineId(updatedSlo.id, updatedSlo.revision), rollbackSignal)
      );

      const rollupTransformPromise = this.transformManager.install(updatedSlo, { signal });
      rollbackOperations.push((rollbackSignal) =>
        this.transformManager.uninstall(updatedRollupTransformId, { signal: rollbackSignal })
      );

      const summaryPipelinePromise = this.createPipeline(
        getSummaryPipelineTemplate(updatedSlo, this.spaceId, this.basePath),
        signal
      );
      rollbackOperations.push((rollbackSignal) =>
        this.deletePipeline(
          getSLOSummaryPipelineId(updatedSlo.id, updatedSlo.revision),
          rollbackSignal
        )
      );

      const summaryTransformPromise = this.summaryTransformManager.install(updatedSlo, {
        signal,
      });
      rollbackOperations.push((rollbackSignal) =>
        this.summaryTransformManager.uninstall(updatedSummaryTransformId, {
          signal: rollbackSignal,
        })
      );

      const tempDocPromise = this.createTempSummaryDocument(updatedSlo, signal);
      rollbackOperations.push((rollbackSignal) =>
        this.deleteTempSummaryDocument(updatedSlo, rollbackSignal)
      );

      await allSettledOrThrow([
        sloPipelinePromise,
        rollupTransformPromise,
        summaryPipelinePromise,
        summaryTransformPromise,
        tempDocPromise,
      ]);

      // transforms can only be started after the pipelines are created
      await allSettledOrThrow([
        this.transformManager.start(updatedRollupTransformId, { signal }),
        this.summaryTransformManager.start(updatedSummaryTransformId, { signal }),
      ]);
    } catch (err) {
      this.logger.warn('Cannot update the SLO. Rolling back.', {
        service: { name: 'update_slo' },
        labels: {
          slo_id: updatedSlo.id,
          indicator_type: updatedSlo.indicator.type,
          error_type: 'update_failed',
        },
        error: err,
      });

      await runRollback({
        operations: rollbackOperations,
        finalOperation: restoreOriginalSLO,
        onError: (rollbackErr) => this.logRollbackFailure(updatedSlo, rollbackErr),
      });

      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
    }

    // the cleanup gets its own budget so a slow install does not leave the previous revision running
    await withTimeoutSignal(ROLLBACK_DEADLINE_MS, (cleanupSignal) =>
      this.deleteOriginalSLO(originalSlo, cleanupSignal)
    );

    this.reportUpdated(originalSlo, updatedSlo);

    return this.toResponse(updatedSlo);
  }

  private reportUpdated(originalSlo: SLODefinition, updatedSlo: SLODefinition) {
    this.telemetry.report(SLO_UPDATED_EBT_EVENT_TYPE, () => ({
      ...toSloDefinitionEbtData(updatedSlo),
      revision_bumped: updatedSlo.revision !== originalSlo.revision,
      changed_fields: getChangedFields(originalSlo, updatedSlo),
    }));
  }

  private async isRevisionBumpRequired(
    originalSlo: SLODefinition,
    updatedSlo: SLODefinition,
    signal: AbortSignal
  ) {
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
      getSLOSummaryTransformId(originalSlo.id, originalSlo.revision),
      { signal }
    );

    const hasOutdatedVersion =
      currentResourcesVersion === undefined || currentResourcesVersion < SLO_RESOURCES_VERSION;

    return hasBreakingChanges || hasOutdatedVersion;
  }

  private async deleteOriginalSLO(slo: SLODefinition, signal: AbortSignal) {
    try {
      await Promise.all([
        this.transformManager.uninstall(getSLOTransformId(slo.id, slo.revision), { signal }),
        this.summaryTransformManager.uninstall(getSLOSummaryTransformId(slo.id, slo.revision), {
          signal,
        }),
        this.deletePipeline(getWildcardPipelineId(slo.id, slo.revision), signal),
      ]);

      await Promise.all([this.deleteRollupData(slo, signal), this.deleteSummaryData(slo, signal)]);
    } catch (err) {
      this.logger.warn(
        'Failed to clean up resources for previous SLO revision. Old resources may continue producing data.',
        {
          service: { name: 'update_slo' },
          labels: {
            slo_id: slo.id,
            indicator_type: slo.indicator.type,
            error_type: 'cleanup_failed',
          },
          error: err,
        }
      );
    }
  }

  private async deleteRollupData(slo: SLODefinition, signal: AbortSignal): Promise<void> {
    await this.scopedClusterClient.asCurrentUser.deleteByQuery(
      {
        index: SLI_DESTINATION_INDEX_PATTERN,
        wait_for_completion: false,
        conflicts: 'proceed',
        slices: 'auto',
        query: {
          bool: {
            filter: [{ term: { 'slo.id': slo.id } }, { term: { 'slo.revision': slo.revision } }],
          },
        },
      },
      { signal }
    );
  }

  private async deleteSummaryData(slo: SLODefinition, signal: AbortSignal): Promise<void> {
    await this.scopedClusterClient.asCurrentUser.deleteByQuery(
      {
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
      },
      { signal }
    );
  }

  private async deletePipeline(id: string, signal: AbortSignal) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
          { id },
          { ignore: [404], signal }
        ),
      { logger: this.logger, retryOptions: REQUEST_RETRY_OPTIONS, signal }
    );
  }

  private async createPipeline(params: IngestPutPipelineRequest, signal: AbortSignal) {
    return retryTransientEsErrors(
      () => this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(params, { signal }),
      { logger: this.logger, retryOptions: REQUEST_RETRY_OPTIONS, signal }
    );
  }

  async createTempSummaryDocument(slo: SLODefinition, signal: AbortSignal) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asCurrentUser.index(
          {
            index: SUMMARY_TEMP_INDEX_NAME,
            id: `slo-${slo.id}`,
            document: createTempSummaryDocument(slo, this.spaceId, this.basePath),
            refresh: true,
          },
          { signal }
        ),
      { logger: this.logger, retryOptions: REQUEST_RETRY_OPTIONS, signal }
    );
  }

  private async deleteTempSummaryDocument(slo: SLODefinition, signal: AbortSignal) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asCurrentUser.delete(
          {
            index: SUMMARY_TEMP_INDEX_NAME,
            id: `slo-${slo.id}`,
            refresh: true,
          },
          { ignore: [404], signal }
        ),
      { logger: this.logger, retryOptions: REQUEST_RETRY_OPTIONS, signal }
    );
  }

  private logRollbackFailure(slo: SLODefinition, error: Error) {
    this.logger.warn('Rollback operation failed.', {
      service: { name: 'update_slo' },
      labels: {
        slo_id: slo.id,
        indicator_type: slo.indicator.type,
        error_type: 'rollback_failed',
      },
      error,
    });
  }

  private toResponse(slo: SLODefinition): UpdateSLOResponse {
    return updateSLOResponseSchema.encode(slo);
  }
}
