/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { ElasticsearchClient, IScopedClusterClient } from '@kbn/core/server';
import {
  getSLOPipelineId,
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
  SLI_DESTINATION_INDEX_PATTERN,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../common/constants';
import { retryTransientEsErrors } from '../utils/retry';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

export class DeleteSLO {
  constructor(
    private repository: SLORepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private esClient: ElasticsearchClient,
    private scopedClusterClient: IScopedClusterClient,
    private rulesClient: RulesClientApi
  ) {}

  public async execute(sloId: string): Promise<void> {
    const slo = await this.repository.findById(sloId);

    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    await this.summaryTransformManager.stop(summaryTransformId);
    await this.summaryTransformManager.uninstall(summaryTransformId);

    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    await this.transformManager.stop(rollupTransformId);
    await this.transformManager.uninstall(rollupTransformId);

    await retryTransientEsErrors(() =>
      this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
        { id: getSLOPipelineId(slo.id, slo.revision) },
        { ignore: [404] }
      )
    );

    await retryTransientEsErrors(() =>
      this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
        { id: getSLOSummaryPipelineId(slo.id, slo.revision) },
        { ignore: [404] }
      )
    );

    await this.deleteRollupData(slo.id);
    await this.deleteSummaryData(slo.id);
    await this.deleteAssociatedRules(slo.id);
    await this.repository.deleteById(slo.id);
  }

  private async deleteRollupData(sloId: string): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      wait_for_completion: false,
      query: {
        match: {
          'slo.id': sloId,
        },
      },
    });
  }

  private async deleteSummaryData(sloId: string): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      refresh: true,
      query: {
        match: {
          'slo.id': sloId,
        },
      },
    });
  }
  private async deleteAssociatedRules(sloId: string): Promise<void> {
    try {
      await this.rulesClient.bulkDeleteRules({
        filter: `alert.attributes.params.sloId:${sloId}`,
      });
    } catch (err) {
      // no-op: bulkDeleteRules throws if no rules are found.
    }
  }
}
