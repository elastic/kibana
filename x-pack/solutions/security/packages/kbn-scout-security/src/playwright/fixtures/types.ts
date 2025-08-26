/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import type { SecurityPageObjects, SecurityBrowserAuthFixture } from './test';
import type { DetectionRuleApiService } from './worker';

export interface SecurityApiServicesFixture extends ApiServicesFixture {
  detectionRule: DetectionRuleApiService;
}

export interface SecurityTestFixtures extends ScoutTestFixtures {
  browserAuth: SecurityBrowserAuthFixture;
  pageObjects: SecurityPageObjects;
}

export interface SecurityWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: SecurityApiServicesFixture;
}

export interface SecurityParallelTestFixtures extends ScoutParallelTestFixtures {
  browserAuth: SecurityBrowserAuthFixture;
  pageObjects: SecurityPageObjects;
}

export interface SecurityParallelApiServicesFixture extends ApiServicesFixture {
  detectionRule: DetectionRuleApiService;
}

export interface SecurityParallelWorkerFixtures extends ScoutParallelWorkerFixtures {
  apiServices: SecurityApiServicesFixture;
}
