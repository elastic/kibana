/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE } from '../../../../server/saved_objects/observability_onboarding_status';
import { ONBOARDING_COMMON_HEADERS } from '../fixtures/constants';
import { apiTest } from '../fixtures';

apiTest.describe(
  'Observability onboarding flow ownership',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'hides flow saved objects from generic saved object find',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const adminHeaders = {
          ...ONBOARDING_COMMON_HEADERS,
          ...cookieHeader,
        };

        const createFlowResponse = await apiClient.post('internal/observability_onboarding/flow', {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(createFlowResponse).toHaveStatusCode(200);

        const findResponse = await apiClient.get(
          `api/saved_objects/_find?type=${OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE}&per_page=20`,
          {
            headers: adminHeaders,
            responseType: 'json',
          }
        );

        expect(findResponse).toHaveStatusCode(200);
        expect((findResponse.body as { saved_objects: unknown[] }).saved_objects).toHaveLength(0);
      }
    );

    apiTest(
      'returns 404 when a different user reads or updates a flow',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: ownerCookieHeader } = await samlAuth.asInteractiveUser('admin');
        const ownerHeaders = {
          ...ONBOARDING_COMMON_HEADERS,
          ...ownerCookieHeader,
        };

        const createFlowResponse = await apiClient.post('internal/observability_onboarding/flow', {
          headers: ownerHeaders,
          responseType: 'json',
        });
        expect(createFlowResponse).toHaveStatusCode(200);
        const onboardingId = (createFlowResponse.body as { onboardingFlow: { id: string } })
          .onboardingFlow.id;

        const { cookieHeader: otherCookieHeader } = await samlAuth.asInteractiveUser('viewer');
        const otherHeaders = {
          ...ONBOARDING_COMMON_HEADERS,
          ...otherCookieHeader,
        };

        const progressResponse = await apiClient.get(
          `internal/observability_onboarding/flow/${onboardingId}/progress`,
          {
            headers: otherHeaders,
            responseType: 'json',
          }
        );
        expect(progressResponse).toHaveStatusCode(404);
        expect((progressResponse.body as { message?: string }).message).toContain(
          'onboarding session not found'
        );

        const stepResponse = await apiClient.post(
          `internal/observability_onboarding/flow/${onboardingId}/step/ea-download`,
          {
            headers: otherHeaders,
            responseType: 'json',
            body: { status: 'complete' },
          }
        );
        expect(stepResponse).toHaveStatusCode(404);
        expect((stepResponse.body as { message?: string }).message).toContain(
          'onboarding session not found'
        );

        const integrationsResponse = await apiClient.post(
          `internal/observability_onboarding/flow/${onboardingId}/integrations/install`,
          {
            headers: {
              ...otherHeaders,
              accept: 'application/x-tar',
              'content-type': 'text/tab-separated-values',
            },
            responseType: 'json',
            body: 'system\tregistry\twebserver01',
          }
        );
        expect(integrationsResponse).toHaveStatusCode(404);
        expect((integrationsResponse.body as { message?: string }).message).toContain(
          `Onboarding session '${onboardingId}' not found`
        );
      }
    );

    apiTest(
      'allows the returned install API key to update its owner flow',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const adminHeaders = {
          ...ONBOARDING_COMMON_HEADERS,
          ...cookieHeader,
        };

        const createFlowResponse = await apiClient.post('internal/observability_onboarding/flow', {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(createFlowResponse).toHaveStatusCode(200);
        const { onboardingFlow, installApiKey } = createFlowResponse.body as {
          onboardingFlow: { id: string };
          installApiKey: string;
        };

        const stepResponse = await apiClient.post(
          `internal/observability_onboarding/flow/${onboardingFlow.id}/step/ea-download`,
          {
            headers: {
              ...ONBOARDING_COMMON_HEADERS,
              Authorization: `ApiKey ${installApiKey}`,
            },
            responseType: 'json',
            body: { status: 'complete' },
          }
        );
        expect(stepResponse).toHaveStatusCode(200);
      }
    );

    apiTest(
      'returns with incomplete status for malformed payloads',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const adminHeaders = {
          ...ONBOARDING_COMMON_HEADERS,
          ...cookieHeader,
        };

        const createFlowResponse = await apiClient.post('internal/observability_onboarding/flow', {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(createFlowResponse).toHaveStatusCode(200);
        const onboardingId = (createFlowResponse.body as { onboardingFlow: { id: string } })
          .onboardingFlow.id;

        const stepResponse = await apiClient.post(
          `internal/observability_onboarding/flow/${onboardingId}/step/ea-status`,
          {
            headers: adminHeaders,
            responseType: 'json',
            body: { status: 'complete' },
          }
        );
        expect(stepResponse).toHaveStatusCode(200);

        const progressResponse = await apiClient.get(
          `internal/observability_onboarding/flow/${onboardingId}/progress`,
          {
            headers: adminHeaders,
            responseType: 'json',
          }
        );
        expect(progressResponse).toHaveStatusCode(200);
        expect(
          (progressResponse.body as { progress: Record<string, { status: string }> }).progress[
            'logs-ingest'
          ]
        ).toMatchObject({ status: 'incomplete' });
      }
    );
  }
);
