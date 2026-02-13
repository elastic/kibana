/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  ElasticsearchClient,
  Logger,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  CollectorFetchContext,
  UsageCollectionSetup,
} from '@kbn/usage-collection-plugin/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import { difference } from 'lodash';
import {
  TRIAL_COMPANION_DEPLOYMENT_STATE,
  TRIAL_COMPANION_MILESTONE_REFRESH_ERROR,
} from '../telemetry/trial_companion_ebt_events';
import type { UsageCollectorDeps } from './trial_companion_nba_detectors';
import {
  savedDiscoverySessionsM2,
  detectionRulesInstalledM3,
  installedPackagesM1,
  aiFeaturesM5,
  casesM6,
} from './trial_companion_nba_detectors';
import { TrialCompanionMilestoneRepositoryImpl } from './trial_companion_milestone_repository';
import type {
  TrialCompanionMilestoneService,
  TrialCompanionMilestoneServiceDepsF,
  TrialCompanionMilestoneServiceSetup,
  TrialCompanionMilestoneServiceStart,
} from './trial_companion_milestone_service.types';
import { newTelemetryLogger } from '../../telemetry/helpers';
import type { Milestone } from '../../../../common/trial_companion/types';
import type {
  TrialCompanionMilestoneRepository,
  NBAToBeDone,
} from './trial_companion_milestone_repository.types';
import type { DetectorF } from '../types';

const TASK_TYPE = 'security:trial-companion-milestone';
const TASK_TITLE = 'This task periodically checks currently achieved milestones.';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const INTERVAL = '1m';
const TIMEOUT = '10m';

export const createTrialCompanionMilestoneServiceDeps: TrialCompanionMilestoneServiceDepsF = (
  logger: Logger,
  taskManager: TaskManagerStartContract,
  packageService: PackageService,
  savedObjects: SavedObjectsServiceStart,
  esClient: ElasticsearchClient,
  usageCollection?: UsageCollectionSetup
) => {
  const soClient = savedObjects.getUnsafeInternalClient();
  const detectorsLogger = logger.get('trial-companion-milestone-detectors');

  // the list of detectors should have minimum all milestones from NBA_TODO_LIST at x-pack/solutions/security/plugins/security_solution/public/trial_companion/nba_translations.ts:131
  const detectors: DetectorF[] = [];

  const usageCollectorDeps: UsageCollectorDeps | undefined = usageCollection
    ? {
        logger: detectorsLogger,
        collectorContext: {
          esClient,
          soClient,
        } as CollectorFetchContext,
        usageCollection,
      }
    : undefined;

  // order doesn't matter
  detectors.push(installedPackagesM1(detectorsLogger, packageService, esClient));
  if (usageCollectorDeps) {
    detectors.push(
      savedDiscoverySessionsM2(usageCollectorDeps),
      detectionRulesInstalledM3(usageCollectorDeps),
      aiFeaturesM5(esClient),
      casesM6(usageCollectorDeps)
    );
  }

  const repo: TrialCompanionMilestoneRepository = new TrialCompanionMilestoneRepositoryImpl(
    logger,
    soClient
  );

  return { taskManager, detectors, repo };
};

export class TrialCompanionMilestoneServiceImpl implements TrialCompanionMilestoneService {
  private readonly logger: Logger;
  private repo?: TrialCompanionMilestoneRepository | null;
  private enabled: boolean = false;
  private telemetry?: AnalyticsServiceSetup | null;

  private detectors: DetectorF[] = [];

  constructor(logger: Logger) {
    const mdc = { task_id: TASK_ID, task_type: TASK_TYPE };
    this.logger = newTelemetryLogger(logger.get('trial-companion-milestone-service'), mdc);
  }

  public setup(setup: TrialCompanionMilestoneServiceSetup) {
    this.logger.info(`Setting up TrialCompanionMilestoneService: ${setup.enabled}`);
    this.enabled = setup.enabled;
    this.telemetry = setup.telemetry;
    this.registerTask(setup.taskManager);
  }

  public async start(start: TrialCompanionMilestoneServiceStart) {
    this.logger.debug('Starting TrialCompanionMilestoneService');
    if (!this.enabled) {
      this.logger.info('TrialCompanionMilestoneService is disabled, skipping start');
      return;
    }
    this.repo = start.repo;
    this.detectors = start.detectors;
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

  private getTelemetry(): AnalyticsServiceSetup {
    if (this.telemetry === undefined || this.telemetry === null) {
      throw Error('AnalyticsServiceSetup is unavailable. Make sure that start() has been called.');
    }
    return this.telemetry;
  }

  async refreshMilestones(abortSignal: AbortSignal) {
    this.logger.debug('about to refresh milestones in the saved objects store');
    try {
      const saved = await this.getMilestoneRepository().getCurrent();
      this.logger.debug(() => `Current milestone from SO: ${JSON.stringify(saved)}`);

      const openTODOs: Milestone[] = [];
      for (const d of this.detectors) {
        if (abortSignal.aborted) {
          this.logger.info('Abort signal received, stopping milestone detection');
          return;
        }

        const milestoneId = await d();
        if (milestoneId) {
          openTODOs.push(milestoneId);
        }
      }

      this.logger.debug(`Current open TODOs detected: ${openTODOs}`);

      let updated: NBAToBeDone | undefined;
      if (!saved) {
        this.logger.debug('No previous TODOs found, creating it');
        updated = await this.getMilestoneRepository().create(openTODOs);
        this.getTelemetry().reportEvent(TRIAL_COMPANION_DEPLOYMENT_STATE.eventType, {
          openTODOs,
        });
      } else if (
        difference(openTODOs, saved.openTODOs).length > 0 ||
        difference(saved.openTODOs, openTODOs).length > 0
      ) {
        saved.openTODOs = openTODOs;
        await this.getMilestoneRepository().update(saved);
        this.getTelemetry().reportEvent(TRIAL_COMPANION_DEPLOYMENT_STATE.eventType, {
          openTODOs,
        });
        updated = saved;
      }
      this.logger.debug(() => `Current milestone updated: ${JSON.stringify(updated)}`);
    } catch (e) {
      this.getTelemetry().reportEvent(TRIAL_COMPANION_MILESTONE_REFRESH_ERROR.eventType, {
        message: e.message,
      });
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
        createTaskRunner: ({ abortController }: RunContext) => {
          return {
            run: async () => {
              await this.refreshMilestones(abortController.signal);
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
