/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE } from '../../../../server/saved_objects/observability_onboarding_status';
import { ONBOARDING_COMMON_HEADERS } from '../fixtures/constants';
import { apiTest } from '../fixtures';

apiTest.describe(
  'Observability onboarding POST flow step — updates saved state',
  { tag: tags.deploymentAgnostic },
  () => {
    let adminCredentials: RoleApiCredentials;
    let onboardingId: string;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.beforeEach(async ({ apiClient, kbnClient }) => {
      const createFlowResponse = await apiClient.post('internal/observability_onboarding/flow', {
        headers: {
          ...ONBOARDING_COMMON_HEADERS,
          ...adminCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });
      expect(createFlowResponse).toHaveStatusCode(200);
      onboardingId = (createFlowResponse.body as { onboardingFlow: { id: string } }).onboardingFlow
        .id;

      const savedState = await kbnClient.savedObjects.get({
        type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
        id: onboardingId,
      });
      expect(savedState.attributes.progress).toStrictEqual({});
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await kbnClient.savedObjects.delete({
        type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
        id: onboardingId,
      });
    });

    apiTest('updates step status', async ({ apiClient, kbnClient }) => {
      const step = {
        name: 'ea-download',
        status: 'complete',
      };

      const response = await apiClient.post(
        `internal/observability_onboarding/flow/${onboardingId}/step/${step.name}`,
        {
          headers: {
            ...ONBOARDING_COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            status: step.status,
          },
        }
      );
      expect(response).toHaveStatusCode(200);

      const savedState = await kbnClient.savedObjects.get({
        type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
        id: onboardingId,
      });
      const stepProgress = savedState.attributes.progress?.[step.name];
      expect(stepProgress).toMatchObject({ status: step.status });
    });

    apiTest('updates step status with base64 message', async ({ apiClient, kbnClient }) => {
      const message = 'Download failed';
      const step = {
        name: 'ea-download',
        status: 'danger',
        message: Buffer.from(message, 'utf8').toString('base64'),
      };

      const response = await apiClient.post(
        `internal/observability_onboarding/flow/${onboardingId}/step/${step.name}`,
        {
          headers: {
            ...ONBOARDING_COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: {
            status: step.status,
            message: step.message,
          },
        }
      );
      expect(response).toHaveStatusCode(200);

      const savedState = await kbnClient.savedObjects.get({
        type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
        id: onboardingId,
      });
      const stepProgress = savedState.attributes.progress?.[step.name];
      expect(stepProgress).toMatchObject({ status: step.status, message });
    });
  }
);
