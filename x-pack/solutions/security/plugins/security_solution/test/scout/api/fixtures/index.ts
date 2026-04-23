/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  KbnClient,
  ScoutLogger,
  ScoutWorkerFixtures,
} from '@kbn/scout-security';
import { apiTest as baseApiTest } from '@kbn/scout-security';
import {
  getDetectionRuleApiService,
  type DetectionRuleApiService,
} from '@kbn/scout-security/src/playwright/fixtures/worker/apis/detection_rule';
import { WorkflowsApiService } from './services/workflows_api_service';

export interface SecurityWorkflowsApiServicesFixture extends ApiServicesFixture {
  workflowsApi: WorkflowsApiService;
  detectionRule: DetectionRuleApiService;
}

interface SecurityWorkflowsWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: SecurityWorkflowsApiServicesFixture;
}

export const apiTest = baseApiTest.extend<{}, SecurityWorkflowsWorkerFixtures>({
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        log,
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: KbnClient;
        log: ScoutLogger;
      },
      use: (services: SecurityWorkflowsApiServicesFixture) => Promise<void>
    ) => {
      const extended = apiServices as SecurityWorkflowsApiServicesFixture;
      extended.workflowsApi = new WorkflowsApiService('default', kbnClient);
      extended.detectionRule = getDetectionRuleApiService({ kbnClient, log });
      await use(extended);
    },
    { scope: 'worker' },
  ],
});
