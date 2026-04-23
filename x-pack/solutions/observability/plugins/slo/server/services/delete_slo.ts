/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getSLOSummaryTransformId,
  getSLOTransformId,
  getCustomSLOWildcardPipelineId,
  getWildcardPipelineId,
} from '../../common/constants';
import { retryTransientEsErrors } from '../utils/retry';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';

interface Options {
  skipDataDeletion: boolean;
  skipRuleDeletion: boolean;
}

export class DeleteSLO {
  constructor(
    private repository: SLODefinitionRepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private scopedClusterClient: IScopedClusterClient,
    private rulesClient: RulesClientApi,
    private abortController: AbortController = new AbortController()
  ) {}

  public async execute(
    sloId: string,
    options: Options = {
      skipDataDeletion: false,
      skipRuleDeletion: false,
    }
  ): Promise<void> {
    const slo = await this.repository.findById(sloId);

    // First delete the linked resources before deleting the data
    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    const wildcardPipelineId = getWildcardPipelineId(slo.id, slo.revision);
    const customWildcardPipelineId = getCustomSLOWildcardPipelineId(slo.id);

    await Promise.all([
      this.transformManager.uninstall(rollupTransformId),
      this.summaryTransformManager.uninstall(summaryTransformId),
      retryTransientEsErrors(() =>
        this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
          { id: wildcardPipelineId },
          { ignore: [404], signal: this.abortController.signal }
        )
      ),
      retryTransientEsErrors(() =>
        this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
          { id: customWildcardPipelineId },
          { ignore: [404], signal: this.abortController.signal }
        )
      ),
      this.repository.deleteById(slo.id, { ignoreNotFound: true }),
    ]);

    await Promise.all([
      this.deleteRollupData(slo.id, options.skipDataDeletion),
      this.deleteSummaryData(slo.id, options.skipDataDeletion),
      this.deleteAssociatedRules(slo.id, options.skipRuleDeletion),
    ]);
  }

  private async deleteRollupData(sloId: string, skip: boolean): Promise<void> {
    if (skip) {
      return;
    }

    await this.scopedClusterClient.asCurrentUser.deleteByQuery(
      {
        index: SLI_DESTINATION_INDEX_PATTERN,
        wait_for_completion: false,
        conflicts: 'proceed',
        slices: 'auto',
        query: {
          bool: {
            filter: {
              term: {
                'slo.id': sloId,
              },
            },
          },
        },
      },
      { signal: this.abortController.signal }
    );
  }

  private async deleteSummaryData(sloId: string, skip: boolean): Promise<void> {
    if (skip) {
      return;
    }

    await this.scopedClusterClient.asCurrentUser.deleteByQuery(
      {
        index: SUMMARY_DESTINATION_INDEX_PATTERN,
        refresh: false,
        wait_for_completion: false,
        conflicts: 'proceed',
        slices: 'auto',
        query: {
          bool: {
            filter: {
              term: {
                'slo.id': sloId,
              },
            },
          },
        },
      },
      { signal: this.abortController.signal }
    );
  }
  private async deleteAssociatedRules(sloId: string, skip: boolean): Promise<void> {
    if (skip) {
      return;
    }

    try {
      await this.rulesClient.bulkDeleteRules({
        filter: `alert.attributes.params.sloId:${sloId}`,
      });
    } catch (err) {
      // no-op
    }
  }
}
