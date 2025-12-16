/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Logger } from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { RepairParams } from '@kbn/slo-schema';
import pLimit from 'p-limit';
import { computeHealth, type SLOHealth } from '../domain/services/compute_health';
import { getSLOTransformId, getSLOSummaryTransformId } from '../../common/constants';
import type { DefaultTransformManager } from './transform_manager';
import type { DefaultSummaryTransformManager } from './summay_transform_manager';
import type { SLODefinition } from '../domain/models/slo';
import type { SLORepository } from './slo_repository';

interface RepairAction {
  action: 'recreate-transform' | 'start-transform' | 'stop-transform';
  transformType: 'rollup' | 'summary';
  enabled: boolean | undefined;
}

interface RepairResult {
  id: string;
  success: boolean;
  error?: string;
}

export class RepairSLO {
  constructor(
    private logger: Logger,
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLORepository,
    private transformManager: DefaultTransformManager,
    private summaryTransformManager: DefaultSummaryTransformManager
  ) {}

  public async execute(params: RepairParams): Promise<RepairResult[]> {
    if (params.list.length > 100) {
      throw new Error('Cannot repair more than 100 SLOs at once');
    }
    const allResults: Array<RepairResult> = [];
    const definitions = await this.repository.findAllByIds(params.list);

    let successCount = 0;
    let errorCount = 0;

    const headLimiter = pLimit(10);

    const health = await computeHealth(definitions, {
      scopedClusterClient: this.scopedClusterClient,
    });

    await Promise.all(
      definitions.map(async (definition, i) => {
        const repairActions = this.identifyRepairActions(health[i], definition.enabled);
        this.logger.debug(`Identified ${repairActions.length} repair actions needed`);

        if (repairActions.length === 0) {
          this.logger.debug('No repair actions needed');
          allResults.push({ id: definition.id, success: true });
          return;
        }

        return headLimiter(async () => {
          for (const action of repairActions) {
            try {
              await this.executeRepairAction(
                action,
                definition,
                this.transformManager,
                this.summaryTransformManager
              );
              successCount++;
              allResults.push({ id: definition.id, success: true });
            } catch (err) {
              this.logger.debug(
                `Failed to execute repair action [${action.action}] for SLO [${definition.id}] transform [${action.transformType}]: ${err}`
              );
              errorCount++;
              allResults.push({
                id: definition.id,
                success: false,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        });
      })
    );

    this.logger.debug(
      `Repairs completed: ${successCount} successful repairs, ${errorCount} errors`
    );
    return allResults;
  }

  private identifyRepairActions(healthData: SLOHealth, enabled: boolean): RepairAction[] {
    const actions: RepairAction[] = [];

    const { health } = healthData;

    if (health.rollup.missing) {
      actions.push({
        action: 'recreate-transform',
        transformType: 'rollup',
        enabled,
      });
    } else if (health.rollup.stateMatches === false) {
      actions.push({
        action: enabled ? 'start-transform' : 'stop-transform',
        transformType: 'rollup',
        enabled,
      });
    }

    if (health.summary.missing) {
      actions.push({
        action: 'recreate-transform',
        transformType: 'summary',
        enabled,
      });
    } else if (health.summary.stateMatches === false) {
      actions.push({
        action: enabled ? 'start-transform' : 'stop-transform',
        transformType: 'summary',
        enabled,
      });
    }

    return actions;
  }

  private async executeRepairAction(
    action: RepairAction,
    slo: SLODefinition,
    transformManager: DefaultTransformManager,
    summaryTransformManager: DefaultSummaryTransformManager
  ): Promise<void> {
    const transformId =
      action.transformType === 'rollup'
        ? getSLOTransformId(slo.id, slo.revision)
        : getSLOSummaryTransformId(slo.id, slo.revision);

    const manager = action.transformType === 'rollup' ? transformManager : summaryTransformManager;

    switch (action.action) {
      case 'recreate-transform':
        this.logger.debug(
          `Recreating ${action.transformType} transform [${transformId}] for SLO [${slo.id}]`
        );
        await manager.install(slo);
        if (action.enabled) {
          return manager.start(transformId);
        }
        // For disabled SLOs, ensure the transform is stopped after recreation
        return manager.stop(transformId);

      case 'start-transform':
        this.logger.debug(
          `Starting ${action.transformType} transform [${transformId}] for SLO [${slo.id}]`
        );
        return manager.start(transformId);

      case 'stop-transform':
        this.logger.debug(
          `Stopping ${action.transformType} transform [${transformId}] for SLO [${slo.id}]`
        );
        return manager.stop(transformId);
    }
  }
}
