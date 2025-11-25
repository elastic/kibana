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
import type { MilestoneID } from '../../../../common/trial_companion/types';

export interface TrialCompanionMilestoneServiceSetup {
  taskManager: TaskManagerSetupContract;
}

export interface TrialCompanionMilestoneServiceStart {
  taskManager: TaskManagerStartContract;
  packageService: PackageService;
  savedObjects: SavedObjectsServiceStart;
}

export type DetectorF = () => Promise<MilestoneID | undefined>;

export interface TrialCompanionMilestoneService {
  setup(setup: TrialCompanionMilestoneServiceSetup): void;
  start(start: TrialCompanionMilestoneServiceStart): Promise<void>;
}
