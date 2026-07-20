/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { ONBOARDING_COMMON_HEADERS } from '../fixtures/constants';
import { apiTest } from '../fixtures';

apiTest.describe(
  'Observability onboarding POST flow step — updates saved state',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'updates step progress (status only, then status with decoded message)',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const adminHeaders = {
          ...ONBOARDING_COMMON_HEADERS,
          ...cookieHeader,
        };

        await apiTest.step('updates step status', async () => {
          const createFlowResponse = await apiClient.post(
            'internal/observability_onboarding/flow',
            {
              headers: adminHeaders,
              responseType: 'json',
            }
          );
          expect(createFlowResponse).toHaveStatusCode(200);
          const onboardingId = (createFlowResponse.body as { onboardingFlow: { id: string } })
            .onboardingFlow.id;

          const step = { name: 'ea-download', status: 'complete' };
          const response = await apiClient.post(
            `internal/observability_onboarding/flow/${onboardingId}/step/${step.name}`,
            {
              headers: adminHeaders,
              responseType: 'json',
              body: { status: step.status },
            }
          );
          expect(response).toHaveStatusCode(200);

          const progressResponse = await apiClient.get(
            `internal/observability_onboarding/flow/${onboardingId}/progress`,
            {
              headers: adminHeaders,
              responseType: 'json',
            }
          );
          expect(progressResponse).toHaveStatusCode(200);
          expect(
            (
              progressResponse.body as {
                progress: Record<string, { status: string; message?: string }>;
              }
            ).progress[step.name]
          ).toMatchObject({
            status: step.status,
          });
        });

        await apiTest.step('updates step status with base64 message', async () => {
          const createFlowResponse = await apiClient.post(
            'internal/observability_onboarding/flow',
            {
              headers: adminHeaders,
              responseType: 'json',
            }
          );
          expect(createFlowResponse).toHaveStatusCode(200);
          const onboardingId = (createFlowResponse.body as { onboardingFlow: { id: string } })
            .onboardingFlow.id;

          const message = 'Download failed';
          const step = {
            name: 'ea-download',
            status: 'danger',
            message: Buffer.from(message, 'utf8').toString('base64'),
          };

          const response = await apiClient.post(
            `internal/observability_onboarding/flow/${onboardingId}/step/${step.name}`,
            {
              headers: adminHeaders,
              responseType: 'json',
              body: {
                status: step.status,
                message: step.message,
              },
            }
          );
          expect(response).toHaveStatusCode(200);

          const progressResponse = await apiClient.get(
            `internal/observability_onboarding/flow/${onboardingId}/progress`,
            {
              headers: adminHeaders,
              responseType: 'json',
            }
          );
          expect(progressResponse).toHaveStatusCode(200);
          expect(
            (
              progressResponse.body as {
                progress: Record<string, { status: string; message?: string }>;
              }
            ).progress[step.name]
          ).toMatchObject({
            status: step.status,
            message,
          });
        });
      }
    );
  }
);
