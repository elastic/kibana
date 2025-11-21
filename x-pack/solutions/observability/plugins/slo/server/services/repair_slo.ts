/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { type Logger } from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { RepairParams } from '@kbn/slo-schema';
import pLimit from 'p-limit';
import { computeHealth, SLOHealth } from '../domain/services/compute_health';
import { getSLOTransformId, getSLOSummaryTransformId } from '../../common/constants';
import type { DefaultTransformManager } from './transform_manager';
import type { DefaultSummaryTransformManager } from './summay_transform_manager';
import type { SLODefinition } from '../domain/models/slo';
import type { SLORepository } from './slo_repository';

interface RepairAction {
  sloId: string;
  sloRevision: number;
  action: 'recreate-transform' | 'start-transform' | 'stop-transform';
  transformType: 'rollup' | 'summary';
  sloEnabled: boolean | undefined;
}

export class RepairSLO {
  constructor(
    private logger: Logger,
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLORepository,
    private transformManager: DefaultTransformManager,
    private summaryTransformManager: DefaultSummaryTransformManager
  ) {}

  public async execute(params: RepairParams): Promise<unknown> {
    if (params.list.length > 100) {
      throw new Error('Cannot repair more than 100 SLOs at once');
    }

    try {
      // use pLimiter(10)
      // find definitions for the provided list, dedup/filter out the inexistant tuples (ids.)
      // definitions.map({...definition, instanceId})

      const sloDefinitions = await this.repository.findAllByIds(
        params.list.map((item) => item.sloId)
      );

      const health = await computeHealth(
        sloDefinitions.map((definition) => ({
          id: definition.id,
          instanceId: '*',
          revision: definition.revision,
          name: definition.name,
          enabled: definition.enabled,
        })),
        {
          scopedClusterClient: this.scopedClusterClient,
        }
      );

      const repairActions = this.identifyRepairActions(health);
      this.logger.debug(`Identified ${repairActions.length} repair actions needed`);

      if (repairActions.length === 0) {
        this.logger.debug('No repair actions needed');
        return;
      }

      const actionsBySloId = new Map<string, RepairAction[]>();
      for (const action of repairActions) {
        const key = `${action.sloId}-${action.sloRevision}`;
        if (!actionsBySloId.has(key)) {
          actionsBySloId.set(key, []);
        }
        actionsBySloId.get(key)!.push(action);
      }

      let successCount = 0;
      let errorCount = 0;
      const allResults: Array<{ id: string; success: boolean; error?: string }> = [];

      for (const [sloKey, actions] of actionsBySloId.entries()) {
        try {
          const lastDashIndex = sloKey.lastIndexOf('-');
          if (lastDashIndex === -1) {
            this.logger.warn(`Invalid sloKey format [${sloKey}], expected format: sloId-revision`);
            errorCount++;
            continue;
          }
          const sloId = sloKey.substring(0, lastDashIndex);
          const revisionStr = sloKey.substring(lastDashIndex + 1);
          const revision = parseInt(revisionStr, 10);

          if (isNaN(revision)) {
            this.logger.warn(`Invalid revision in sloKey [${sloKey}], revision: ${revisionStr}`);
            errorCount++;
            continue;
          }

          const sloDefinition = await this.repository.findById(sloId);

          // alreasdy done at the beginning
          if (!sloDefinition) {
            this.logger.warn(`SLO [${sloId}] revision [${revision}] not found, skipping repairs`);
            errorCount++;
            allResults.push({ id: sloId, success: false, error: 'SLO not found' });
            continue;
          }

          const limiter = pLimit(3);

          const promises = actions.map(async (action) => {
            return limiter(async () => {
              try {
                await this.executeRepairAction(
                  action,
                  sloDefinition,
                  this.transformManager,
                  this.summaryTransformManager
                );
                successCount++;
                return { id: sloId, success: true };
              } catch (err) {
                this.logger.error(
                  `Failed to execute repair action [${action.action}] for SLO [${action.sloId}] transform [${action.transformType}]: ${err}`
                );
                errorCount++;
                return {
                  id: sloId,
                  success: false,
                  error: err instanceof Error ? err.message : String(err),
                };
              }
            });
          });

          const results = await Promise.all(promises);
          // Aggregate results - use the first result per SLO (all actions for same SLO should have same outcome)
          const sloResult = results[0];
          if (sloResult) {
            allResults.push(sloResult);
          }
        } catch (err) {
          this.logger.error(`Failed to process repairs for SLO [${sloKey}]: ${err}`);
          errorCount++;
          const lastDashIndex = sloKey.lastIndexOf('-');
          const sloId = lastDashIndex !== -1 ? sloKey.substring(0, lastDashIndex) : sloKey;
          allResults.push({
            id: sloId,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      this.logger.info(
        `Repair task completed: ${successCount} successful repairs, ${errorCount} errors`
      );
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`Request aborted due to timeout: ${err}`);
        return;
      }
      this.logger.error(`Error in Repair task: ${err}`);
    }
  }

  private identifyRepairActions(healthData: SLOHealth[]): RepairAction[] {
    const actions: RepairAction[] = [];

    for (const item of healthData) {
      const { sloId, sloRevision, health, sloEnabled } = item;

      // check rollup transform
      if (health.rollup.status === 'missing') {
        actions.push({
          sloId,
          sloRevision,
          action: 'recreate-transform',
          transformType: 'rollup',
          sloEnabled,
        });
      } else if (health.rollup.match === false) {
        actions.push({
          sloId,
          sloRevision,
          action: sloEnabled ? 'start-transform' : 'stop-transform',
          transformType: 'rollup',
          sloEnabled,
        });
      }

      // Check summary transform
      if (health.summary.status === 'missing') {
        actions.push({
          sloId,
          sloRevision,
          action: 'recreate-transform',
          transformType: 'summary',
          sloEnabled,
        });
      } else if (health.summary.match === false) {
        actions.push({
          sloId,
          sloRevision,
          action: sloEnabled ? 'start-transform' : 'stop-transform',
          transformType: 'summary',
          sloEnabled,
        });
      }
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
        ? getSLOTransformId(action.sloId, action.sloRevision)
        : getSLOSummaryTransformId(action.sloId, action.sloRevision);

    const manager = action.transformType === 'rollup' ? transformManager : summaryTransformManager;

    switch (action.action) {
      case 'recreate-transform':
        this.logger.info(
          `Recreating ${action.transformType} transform [${transformId}] for SLO [${action.sloId}]`
        );
        await manager.install(slo);
        if (action.sloEnabled) {
          return manager.start(transformId);
        }
        return Promise.resolve();

      case 'start-transform':
        this.logger.info(
          `Starting ${action.transformType} transform [${transformId}] for SLO [${action.sloId}]`
        );
        return manager.start(transformId);

      case 'stop-transform':
        this.logger.info(
          `Stopping ${action.transformType} transform [${transformId}] for SLO [${action.sloId}]`
        );
        return manager.stop(transformId);
    }
  }
}
