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
import type {
  DetectionRuleApiService,
  AssistantApiService,
  AssistantCleanupService,
  ConnectorsApiService,
} from './worker';

/**
 * Worker-scoped API services for Security Solution tests.
 * These services use kbnClient and are suitable for:
 * - Cleanup operations (delete all resources)
 * - Creating global resources (detection rules, connectors)
 *
 * For user-scoped resources (conversations, prompts), use browserScopedApis instead.
 */
export interface SecurityApiServicesFixture extends ApiServicesFixture {
  detectionRule: DetectionRuleApiService;
  assistant: AssistantCleanupService;
  connectors: ConnectorsApiService;
}

/**
 * Test-scoped API services that use browser authentication.
 * These services use page.request which inherits the browser's authenticated session.
 * Use these for creating user-scoped resources that need to be visible in the UI.
 */
export interface BrowserScopedApis {
  assistant: AssistantApiService;
}

export interface SecurityTestFixtures extends ScoutTestFixtures {
  browserAuth: SecurityBrowserAuthFixture;
  pageObjects: SecurityPageObjects;
  browserScopedApis: BrowserScopedApis;
}

export interface SecurityWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: SecurityApiServicesFixture;
}

export interface SecurityParallelTestFixtures extends ScoutParallelTestFixtures {
  browserAuth: SecurityBrowserAuthFixture;
  pageObjects: SecurityPageObjects;
  browserScopedApis: BrowserScopedApis;
}

export interface SecurityParallelWorkerFixtures extends ScoutParallelWorkerFixtures {
  apiServices: SecurityApiServicesFixture;
}
