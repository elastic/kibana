/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { type Logger } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { IScopedClusterClient } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { RepairParams } from '@kbn/slo-schema';
import pLimit from 'p-limit';
import { GetSLOHealth } from './get_slo_health';
import { KibanaSavedObjectsSLORepository } from './slo_repository';
import { getSLOTransformId, getSLOSummaryTransformId } from '../../common/constants';
import { DefaultTransformManager } from './transform_manager';
import { DefaultSummaryTransformManager } from './summay_transform_manager';
import { DefaultSummaryTransformGenerator } from './summary_transform_generator/summary_transform_generator';
import { createTransformGenerators } from './transform_generators';
import { SO_SLO_TYPE } from '../saved_objects';
import type { SLODefinition, StoredSLODefinition } from '../domain/models/slo';

interface RepairAction {
  sloId: string;
  revision: number;
  action: 'recreate-transform' | 'start-transform' | 'stop-transform';
  transformType: 'rollup' | 'summary';
  enabled: boolean | undefined;
}

export class RepairSLO {
  constructor(
    private logger: Logger,
    private internalSoClient: SavedObjectsClientContract,
    private scopedClusterClient: IScopedClusterClient,
    private dataViewService: DataViewsService
  ) {}

  public async execute(params: RepairParams): Promise<unknown> {
    try {
      const repository = new KibanaSavedObjectsSLORepository(this.internalSoClient, this.logger);
      const sloHealth = new GetSLOHealth(this.scopedClusterClient, repository);
      const healthResponse = await sloHealth.execute({
        list: params.list || [],
        statusFilter: 'unhealthy',
      });

      const repairActions = this.identifyRepairActions(
        healthResponse.data as Array<{
          id: string;
          revision: number;
          enabled?: boolean;
          health: {
            overall: 'healthy' | 'unhealthy' | 'missing';
            rollup: { status: string; transformState?: string; match: boolean | undefined };
            summary: { status: string; transformState?: string; match: boolean | undefined };
            enabled?: boolean;
          };
        }>
      );
      this.logger.debug(`Identified ${repairActions.length} repair actions needed`);

      if (repairActions.length === 0) {
        this.logger.debug('No repair actions needed');
        return;
      }

      const actionsBySloId = new Map<string, RepairAction[]>();
      for (const action of repairActions) {
        const key = `${action.sloId}-${action.revision}`;
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

          const sloDefinition = await this.findSloDefinition(
            this.internalSoClient,
            sloId,
            revision
          );

          if (!sloDefinition) {
            this.logger.warn(`SLO [${sloId}] revision [${revision}] not found, skipping repairs`);
            errorCount++;
            allResults.push({ id: sloId, success: false, error: 'SLO not found' });
            continue;
          }

          const spaceId = sloDefinition.namespace || 'default';

          const isServerless = false;
          const transformGenerators = createTransformGenerators(
            spaceId,
            this.dataViewService,
            isServerless
          );

          const transformManager = new DefaultTransformManager(
            transformGenerators,
            this.scopedClusterClient,
            this.logger
          );

          const summaryTransformManager = new DefaultSummaryTransformManager(
            new DefaultSummaryTransformGenerator(),
            this.scopedClusterClient,
            this.logger
          );

          const limiter = pLimit(3);

          const promises = actions.map(async (action) => {
            return limiter(async () => {
              try {
                await this.executeRepairAction(
                  action,
                  sloDefinition.slo,
                  transformManager,
                  summaryTransformManager
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
        `Auto-reset task completed: ${successCount} successful repairs, ${errorCount} errors`
      );
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`Request aborted due to timeout: ${err}`);
        return;
      }
      this.logger.error(`Error in auto-reset task: ${err}`);
    }
  }

  private identifyRepairActions(
    healthData: Array<{
      id: string;
      revision: number;
      enabled?: boolean;
      health: {
        overall: 'healthy' | 'unhealthy' | 'missing';
        rollup: { status: string; transformState?: string; match: boolean | undefined };
        summary: { status: string; transformState?: string; match: boolean | undefined };
        enabled?: boolean;
      };
    }>
  ): RepairAction[] {
    const actions: RepairAction[] = [];

    for (const item of healthData) {
      const { id, revision, health, enabled } = item;
      const sloEnabled = enabled ?? health.enabled ?? false;

      // check rollup transform
      if (health.rollup.status === 'missing') {
        actions.push({
          sloId: id,
          revision,
          action: 'recreate-transform',
          transformType: 'rollup',
          enabled: sloEnabled,
        });
      } else if (health.rollup.match === false) {
        if (health.rollup.transformState === 'stopped' && sloEnabled) {
          actions.push({
            sloId: id,
            revision,
            action: 'start-transform',
            transformType: 'rollup',
            enabled: sloEnabled,
          });
        } else if (health.rollup.transformState === 'started' && !sloEnabled) {
          actions.push({
            sloId: id,
            revision,
            action: 'stop-transform',
            transformType: 'rollup',
            enabled: sloEnabled,
          });
        }
      }

      // Check summary transform
      if (health.summary.status === 'missing') {
        actions.push({
          sloId: id,
          revision,
          action: 'recreate-transform',
          transformType: 'summary',
          enabled: sloEnabled,
        });
      } else if (health.summary.match === false) {
        if (health.summary.transformState === 'stopped' && sloEnabled) {
          actions.push({
            sloId: id,
            revision,
            action: 'start-transform',
            transformType: 'summary',
            enabled: sloEnabled,
          });
        } else if (health.summary.transformState === 'started' && !sloEnabled) {
          actions.push({
            sloId: id,
            revision,
            action: 'stop-transform',
            transformType: 'summary',
            enabled: sloEnabled,
          });
        }
      }
    }

    return actions;
  }

  private async findSloDefinition(
    soClient: SavedObjectsClientContract,
    sloId: string,
    revision: number
  ): Promise<{ slo: SLODefinition; namespace: string } | null> {
    try {
      const response = await soClient.find({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 1,
        filter: `slo.attributes.id:(${sloId})`,
        namespaces: [ALL_SPACES_ID],
      });

      if (response.total === 0) {
        return null;
      }

      const savedObject = response.saved_objects[0] as (typeof response.saved_objects)[0] & {
        attributes: StoredSLODefinition;
      };
      const repository = new KibanaSavedObjectsSLORepository(soClient, this.logger);
      const slo = repository.toSLO(savedObject);

      if (!slo || slo.revision !== revision) {
        return null;
      }

      return {
        slo,
        namespace: savedObject.namespaces?.[0] || 'default',
      };
    } catch (err) {
      this.logger.error(`Failed to find SLO definition for [${sloId}]: ${err}`);
      return null;
    }
  }

  private async executeRepairAction(
    action: RepairAction,
    slo: SLODefinition,
    transformManager: DefaultTransformManager,
    summaryTransformManager: DefaultSummaryTransformManager
  ): Promise<void> {
    const transformId =
      action.transformType === 'rollup'
        ? getSLOTransformId(action.sloId, action.revision)
        : getSLOSummaryTransformId(action.sloId, action.revision);

    const manager = action.transformType === 'rollup' ? transformManager : summaryTransformManager;

    switch (action.action) {
      case 'recreate-transform':
        this.logger.info(
          `Recreating ${action.transformType} transform [${transformId}] for SLO [${action.sloId}]`
        );
        await manager.install(slo);
        if (action.enabled) {
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
