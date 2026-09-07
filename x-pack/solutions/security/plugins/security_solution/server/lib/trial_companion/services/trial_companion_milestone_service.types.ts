/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { AnalyticsServiceSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TrialCompanionMilestoneRepository } from './trial_companion_milestone_repository.types';
import type { DetectorF } from '../types';

export interface TrialCompanionMilestoneServiceSetup {
  taskManager: TaskManagerSetupContract;
  enabled: boolean;
  telemetry: AnalyticsServiceSetup;
}

export interface TrialCompanionMilestoneServiceStart {
  taskManager: TaskManagerStartContract;
  detectors: DetectorF[];
  repo: TrialCompanionMilestoneRepository;
}

export interface TrialCompanionMilestoneService {
  setup(setup: TrialCompanionMilestoneServiceSetup): void;
  start(start: TrialCompanionMilestoneServiceStart): Promise<void>;
}

export type TrialCompanionMilestoneServiceDepsF = (
  logger: Logger,
  taskManager: TaskManagerStartContract,
  packageService: PackageService,
  savedObjects: SavedObjectsServiceStart,
  esClient: ElasticsearchClient,
  usageCollection?: UsageCollectionSetup
) => TrialCompanionMilestoneServiceStart;
