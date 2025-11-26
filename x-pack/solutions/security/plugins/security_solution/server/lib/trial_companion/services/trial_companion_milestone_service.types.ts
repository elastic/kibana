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
import type { ElasticsearchClient } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

export interface TrialCompanionMilestoneServiceSetup {
  taskManager: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
}

export interface TrialCompanionMilestoneServiceStart {
  taskManager: TaskManagerStartContract;
  packageService: PackageService;
  savedObjects: SavedObjectsServiceStart;
  esClient: ElasticsearchClient;
}

export interface TrialCompanionMilestoneService {
  setup(setup: TrialCompanionMilestoneServiceSetup): void;
  start(start: TrialCompanionMilestoneServiceStart): Promise<void>;
}
