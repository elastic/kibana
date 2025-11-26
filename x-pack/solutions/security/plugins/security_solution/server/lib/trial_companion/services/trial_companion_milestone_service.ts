/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import {
  allSet,
  detectionRulesInstalled,
  installedPackages,
} from './trial_companion_nba_detectors';
import { TrialCompanionMilestoneRepositoryImpl } from './trial_companion_milestone_repository';
import type {
  TrialCompanionMilestoneService,
  TrialCompanionMilestoneServiceSetup,
  TrialCompanionMilestoneServiceStart,
} from './trial_companion_milestone_service.types';
import { newTelemetryLogger } from '../../telemetry/helpers';
import type { Milestone } from '../../../../common/trial_companion/types';
import type { TrialCompanionMilestoneRepository } from './trial_companion_milestone_repository.types';
import type { NBAMilestone, DetectorF } from '../types';

const TASK_TYPE = 'security:trial-companion-milestone';
const TASK_TITLE = 'This task periodically checks currently achieved milestones.';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const INTERVAL = '1m'; // testing purposes
const TIMEOUT = '10m';

export class TrialCompanionMilestoneServiceImpl implements TrialCompanionMilestoneService {
  private readonly logger: Logger;
  private repo?: TrialCompanionMilestoneRepository | null;
  private usageCollection?: UsageCollectionSetup;

  private detectors: DetectorF[] = [];

  constructor(logger: Logger) {
    const mdc = { task_id: TASK_ID, task_type: TASK_TYPE };
    this.logger = newTelemetryLogger(logger.get('trial-companion-milestone-service'), mdc);
  }

  public setup(setup: TrialCompanionMilestoneServiceSetup) {
    this.logger.debug('Setting up health diagnostic service');
    this.usageCollection = setup.usageCollection;
    this.registerTask(setup.taskManager);
  }

  public async start(start: TrialCompanionMilestoneServiceStart) {
    this.logger.debug('Starting health diagnostic service');
    const soClient = start.savedObjects.getUnsafeInternalClient();
    this.detectors.push(
      // savedSearches(this.logger, start.esClient, soClient, this.usageCollection), // TODO - fix me
      installedPackages(this.logger, start.packageService),
      detectionRulesInstalled(this.logger, start.esClient, soClient, this.usageCollection),
      allSet(this.logger)
    ); // order matters
    this.repo = new TrialCompanionMilestoneRepositoryImpl(this.logger, soClient);
    await this.scheduleTask(start.taskManager);
  }

  private getMilestoneRepository(): TrialCompanionMilestoneRepository {
    if (this.repo === undefined || this.repo === null) {
      throw Error(
        'TrialCompanionMilestoneRepository is unavailable. Make sure that start() has been called.'
      );
    }
    return this.repo;
  }

  async refreshMilestones() {
    this.logger.debug('about to refresh milestones in the saved objects store');
    try {
      const saved = await this.getMilestoneRepository().getCurrent();
      this.logger.info(`Current milestone from SO: ${JSON.stringify(saved)}`);

      let currentMilestoneId: Milestone | undefined;
      // TODO: potential optimization: stop checking once we reach the final milestone, we could check SO in start function
      // TODO: potential optimization: run only detectors for milestones higher than the current one
      for (const d of this.detectors) {
        const milestoneId = await d();
        if (milestoneId) {
          currentMilestoneId = milestoneId;
          break;
        }
      }

      this.logger.info(`Current milestone detected: ${currentMilestoneId}`);

      let updated: NBAMilestone | undefined;
      if (currentMilestoneId) {
        if (!saved) {
          this.logger.debug('No previous milestone found, creating it');
          updated = await this.getMilestoneRepository().create(currentMilestoneId);
        } else if (saved.milestoneId !== currentMilestoneId) {
          saved.milestoneId = currentMilestoneId;
          await this.getMilestoneRepository().update(saved);
          updated = saved;
        }
      }
      this.logger.info(`Current milestone updated: ${JSON.stringify(updated)}`);
    } catch (e) {
      this.logger.error(`Error refreshing milestones: ${e.message}`);
    }
  }

  private registerTask(taskManager: TaskManagerSetupContract) {
    this.logger.debug('About to register task');

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: TASK_TITLE,
        timeout: TIMEOUT,
        maxAttempts: 1,
        createTaskRunner: () => {
          return {
            run: async () => {
              await this.refreshMilestones();
            },

            cancel: async () => {
              this.logger?.warn('Task timed out');
            },
          };
        },
      },
    });
  }

  private async scheduleTask(taskManager: TaskManagerStartContract): Promise<void> {
    this.logger.debug('About to schedule task');

    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: { interval: INTERVAL },
      params: {},
      state: {},
      scope: ['securitySolution'],
    });

    this.logger.debug('Task scheduled');
  }
}
