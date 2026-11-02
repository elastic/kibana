/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { addTransactionLabels } from '@kbn/apm-utils';
import type { IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
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
import type { SloTelemetryReporter } from '../lib/telemetry';
import { SLO_RESET_EBT_EVENT_TYPE, toSloDefinitionEbtData } from '../lib/telemetry';
import { allSettledOrThrow } from '../utils/all_settled_or_throw';
import { REQUEST_RETRY_OPTIONS, retryTransientEsErrors } from '../utils/retry';
import type { RollbackOperation } from '../utils/run_rollback';
import { runRollback } from '../utils/run_rollback';
import { REQUEST_DEADLINE_MS, withDeadline } from '../utils/with_deadline';
import type { SLODefinitionRepository } from './slo_definition_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import type { TransformManager } from './transform_manager';
import { assertExpectedIndicatorSourceIndexPrivileges } from './utils/assert_expected_indicator_source_index_privileges';
import { getSloApmLabels } from './utils';

export class ResetSLO {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLODefinitionRepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath,
    private telemetry: SloTelemetryReporter
  ) {}

  public async execute(sloId: string): Promise<ResetSLOResponse> {
    return withDeadline(REQUEST_DEADLINE_MS, (signal) => this.reset(sloId, signal));
  }

  private async reset(sloId: string, signal: AbortSignal): Promise<ResetSLOResponse> {
    const originalSlo = await this.repository.findById(sloId);
    addTransactionLabels(getSloApmLabels(originalSlo));
    await assertExpectedIndicatorSourceIndexPrivileges(
      originalSlo,
      this.scopedClusterClient.asCurrentUser,
      { signal }
    );

    await this.deleteOriginalSLO(originalSlo, signal);

    const resetedSlo: SLODefinition = {
      ...originalSlo,
      revision: originalSlo.revision + 1,
      version: SLO_MODEL_VERSION,
      updatedAt: new Date(),
    };

    await this.installResetedSLO(resetedSlo, signal);

    await this.repository.update(resetedSlo);

    this.telemetry.report(SLO_RESET_EBT_EVENT_TYPE, () => toSloDefinitionEbtData(resetedSlo));

    return resetSLOResponseSchema.encode(resetedSlo);
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

      // Delete after we uninstalled the transforms
      await Promise.all([this.deleteRollupData(slo, signal), this.deleteSummaryData(slo, signal)]);
    } catch (err) {
      if (signal.aborted) {
        throw err;
      }

      // Any errors here should not prevent moving forward.
      // Worst case we keep rolling up data for the orignal SLO
      this.logger.warn('Deletion of the original SLO resources failed while resetting it.', {
        service: { name: 'reset_slo' },
        labels: {
          slo_id: slo.id,
          indicator_type: slo.indicator.type,
          error_type: 'cleanup_failed',
        },
        error: err,
      });
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

  private async installResetedSLO(slo: SLODefinition, signal: AbortSignal) {
    const rollbackOperations: RollbackOperation[] = [];

    const { id, revision } = slo;
    const rollupTransformId = getSLOTransformId(id, revision);
    const summaryTransformId = getSLOSummaryTransformId(id, revision);
    try {
      const sloPipelinePromise = this.createPipeline(
        getSLIPipelineTemplate(slo, this.spaceId),
        signal
      );
      rollbackOperations.push((rollbackSignal) =>
        this.deletePipeline(getSLOPipelineId(id, revision), rollbackSignal)
      );

      const rollupTransformPromise = this.transformManager.install(slo, { signal });
      rollbackOperations.push((rollbackSignal) =>
        this.transformManager.uninstall(rollupTransformId, { signal: rollbackSignal })
      );

      const summaryPipelinePromise = this.createPipeline(
        getSummaryPipelineTemplate(slo, this.spaceId, this.basePath),
        signal
      );
      rollbackOperations.push((rollbackSignal) =>
        this.deletePipeline(getSLOSummaryPipelineId(id, revision), rollbackSignal)
      );

      const summaryTransformPromise = this.summaryTransformManager.install(slo, { signal });
      rollbackOperations.push((rollbackSignal) =>
        this.summaryTransformManager.uninstall(summaryTransformId, { signal: rollbackSignal })
      );

      const tempDocPromise = this.createTempSummaryDocument(slo, signal);
      rollbackOperations.push((rollbackSignal) =>
        this.deleteTempSummaryDocument(slo, rollbackSignal)
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
        this.transformManager.start(rollupTransformId, { signal }),
        this.summaryTransformManager.start(summaryTransformId, { signal }),
      ]);
    } catch (err) {
      this.logger.warn('Cannot reset the SLO. Rolling back.', {
        service: { name: 'reset_slo' },
        labels: {
          slo_id: slo.id,
          indicator_type: slo.indicator.type,
          error_type: 'reset_failed',
        },
        error: err,
      });

      await runRollback({
        operations: rollbackOperations,
        onError: (rollbackErr) => {
          this.logger.warn('Rollback operation failed.', {
            service: { name: 'reset_slo' },
            labels: {
              slo_id: slo.id,
              indicator_type: slo.indicator.type,
              error_type: 'rollback_failed',
            },
            error: rollbackErr,
          });
        },
      });

      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
    }
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

  async deleteTempSummaryDocument(slo: SLODefinition, signal: AbortSignal) {
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
}
