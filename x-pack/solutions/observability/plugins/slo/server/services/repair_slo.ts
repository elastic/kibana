/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { type Logger } from '@kbn/core/server';
import type {
  RepairAction,
  RepairActionResult,
  RepairActionsGroupResult,
  RepairParams,
} from '@kbn/slo-schema';
import { keyBy } from 'lodash';
import pLimit from 'p-limit';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../common/constants';
import type { SLODefinition } from '../domain/models/slo';
import { computeHealth, type SLOHealth } from '../domain/services/compute_health';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { DefaultSummaryTransformManager } from './summay_transform_manager';
import type { DefaultTransformManager } from './transform_manager';

interface RepairActionsGroup {
  slo: SLODefinition;
  actions: RepairAction[];
}

export class RepairSLO {
  constructor(
    private logger: Logger,
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLODefinitionRepository,
    private transformManager: DefaultTransformManager,
    private summaryTransformManager: DefaultSummaryTransformManager
  ) {}

  public async execute(params: RepairParams): Promise<RepairActionsGroupResult[]> {
    if (params.list.length > 10) {
      throw new Error('Cannot repair more than 10 SLOs at once');
    }

    const definitions = await this.repository.findAllByIds(params.list);
    const health = await computeHealth(definitions, {
      scopedClusterClient: this.scopedClusterClient,
    });

    const healthById = keyBy(health, (h) => h.id);
    const repairActionsGroup = definitions.map((definition) =>
      this.identifyRepairActionsGroup(healthById[definition.id], definition)
    );

    const allResults: RepairActionsGroupResult[] = [];
    const limiter = pLimit(3);
    await Promise.allSettled(
      repairActionsGroup.map((actionGroup) =>
        limiter(() =>
          this.executeRepairActionsGroup(actionGroup).then((results) => {
            allResults.push({
              id: actionGroup.slo.id,
              results,
            });
          })
        )
      )
    );

    return allResults;
  }

  private identifyRepairActionsGroup(
    healthData: SLOHealth,
    slo: SLODefinition
  ): RepairActionsGroup {
    const group: RepairActionsGroup = { slo, actions: [] };
    const { health } = healthData;

    if (health.isProblematic === false) {
      group.actions.push({ type: 'noop' });
      return group;
    }

    if (health.rollup.missing) {
      group.actions.push({
        type: 'recreate-transform',
        transformType: 'rollup',
      });
    } else if (health.rollup.stateMatches === false) {
      group.actions.push({
        type: slo.enabled ? 'start-transform' : 'stop-transform',
        transformType: 'rollup',
      });
    }

    if (health.summary.missing) {
      group.actions.push({
        type: 'recreate-transform',
        transformType: 'summary',
      });
    } else if (health.summary.stateMatches === false) {
      group.actions.push({
        type: slo.enabled ? 'start-transform' : 'stop-transform',
        transformType: 'summary',
      });
    }

    return group;
  }

  private async executeRepairActionsGroup(
    group: RepairActionsGroup
  ): Promise<RepairActionResult[]> {
    const { slo, actions } = group;
    return Promise.all(
      actions.map((action) =>
        this.executeRepairAction(action, slo)
          .then(() => ({
            action,
            status: 'success' as const,
          }))
          .catch((error) => ({
            action,
            status: 'failure' as const,
            error,
          }))
      )
    );
  }

  private async executeRepairAction(action: RepairAction, slo: SLODefinition): Promise<void> {
    if (action.type === 'noop') {
      this.logger.debug(`No repair action needed for SLO [${slo.id}]`);
      return;
    }

    const transformId =
      action.transformType === 'rollup'
        ? getSLOTransformId(slo.id, slo.revision)
        : getSLOSummaryTransformId(slo.id, slo.revision);

    const manager =
      action.transformType === 'rollup' ? this.transformManager : this.summaryTransformManager;

    switch (action.type) {
      case 'recreate-transform':
        this.logger.debug(
          `Recreating ${action.transformType} transform [${transformId}] for SLO [${slo.id}]`
        );
        await manager.install(slo);
        if (!slo.enabled) {
          return manager.stop(transformId);
        }

        return manager.start(transformId);
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
