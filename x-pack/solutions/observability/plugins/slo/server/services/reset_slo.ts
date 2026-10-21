/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addTransactionLabels } from '@kbn/apm-utils';
import type { IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ResetSLOResponse } from '@kbn/slo-schema';
import { resetSLOResponseSchema } from '@kbn/slo-schema';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SLO_MODEL_VERSION,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getSLOSummaryTransformId,
  getSLOTransformId,
  getWildcardPipelineId,
} from '../../common/constants';
import type { SLODefinition } from '../domain/models';
import { createDeadline } from '../utils/deadline';
import { REQUEST_RETRY_OPTIONS, retryTransientEsErrors } from '../utils/retry';
import type { SLODefinitionRepository } from './slo_definition_repository';
import { FORWARD_DEADLINE_MS, SLOResourcesInstaller } from './slo_resources_installer';
import type { TransformManager } from './transform_manager';
import { assertExpectedIndicatorSourceIndexPrivileges } from './utils/assert_expected_indicator_source_index_privileges';
import { getSloApmLabels } from './utils';

export class ResetSLO {
  private resourcesInstaller: SLOResourcesInstaller;

  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLODefinitionRepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private logger: Logger,
    spaceId: string,
    basePath: IBasePath
  ) {
    this.resourcesInstaller = new SLOResourcesInstaller(
      scopedClusterClient,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath
    );
  }

  public async execute(sloId: string): Promise<ResetSLOResponse> {
    const originalSlo = await this.repository.findById(sloId);
    addTransactionLabels(getSloApmLabels(originalSlo));

    const { signal, clear } = createDeadline(FORWARD_DEADLINE_MS);
    const resetedSlo: SLODefinition = {
      ...originalSlo,
      revision: originalSlo.revision + 1,
      version: SLO_MODEL_VERSION,
      updatedAt: new Date(),
    };
    try {
      await assertExpectedIndicatorSourceIndexPrivileges(
        originalSlo,
        this.scopedClusterClient.asCurrentUser,
        { signal }
      );

      await this.deleteOriginalSLO(originalSlo);

      await this.resourcesInstaller.install(resetedSlo, { signal, operation: 'reset' });
    } finally {
      clear();
    }

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
      { logger: this.logger, retryOptions: REQUEST_RETRY_OPTIONS }
    );
  }
}
