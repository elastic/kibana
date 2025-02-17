/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { BrowserAuthFixture } from '@kbn/scout/src/playwright/fixtures/test/browser_auth';
import { SecurityPageObjects } from '../page_objects';

export interface SecurityBrowserAuthFixture extends BrowserAuthFixture {
  loginAsPlatformEngineer: () => Promise<void>;
}
export interface SecurityTestFixtures extends ScoutTestFixtures {
  browserAuth: SecurityBrowserAuthFixture;
  pageObjects: SecurityPageObjects;
}

export type SecurityWorkerFixtures = ScoutWorkerFixtures;

export interface SecurityParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: SecurityPageObjects;
}

export type SecurityParallelWorkerFixtures = ScoutParallelWorkerFixtures;
