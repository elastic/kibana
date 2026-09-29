/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../../fixtures/constants';

// Inline id: importing @kbn/workflows pulls in YAML files that Playwright's esbuild
// transform cannot load. Each space gets its own `<id>-<spaceId>` document.
const CONTINUOUS_ONBOARDING_WORKFLOW_ID = 'system-streams-ki-continuous-onboarding';
const SETTINGS_ENDPOINT =
  'internal/streams/_knowledge_indicators/continuous_ki_extraction/settings';
const ELIGIBLE_ENDPOINT = 'internal/streams/_extraction/_eligible';

// Disabling drains in-flight executions before the uninstall, which can take a while.
const TEST_TIMEOUT_MS = 120_000;

const settingsPath = (spaceId: string) => `s/${spaceId}/${SETTINGS_ENDPOINT}`;

/** Reads, from `spaceId`, the continuous onboarding document of `documentSpaceId`. */
const workflowPath = ({ spaceId, documentSpaceId }: { spaceId: string; documentSpaceId: string }) =>
  `s/${spaceId}/api/workflows/workflow/${CONTINUOUS_ONBOARDING_WORKFLOW_ID}-${documentSpaceId}`;

/**
 * Covers the per-space install and uninstall of the continuous onboarding
 * workflow driven by the space-scoped settings route. Spaces are created per
 * run so no other suite's continuous onboarding state leaks in.
 */
apiTest.describe('Continuous KI onboarding per space', { tag: tags.stateful.classic }, () => {
  let cookieHeader: Record<string, string>;
  let spaceA: string;
  let spaceB: string;

  const settingsRequest = (enabled: boolean) => ({
    headers: { ...COMMON_API_HEADERS, ...cookieHeader },
    body: { continuousKiExtraction: { enabled } },
    responseType: 'json' as const,
  });
  const workflowRequest = () => ({
    headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
    responseType: 'json' as const,
  });

  apiTest.beforeAll(async ({ samlAuth, apiServices }, workerInfo) => {
    ({ cookieHeader } = await samlAuth.asStreamsAdmin());
    // An earlier flag flip in this run may have left the deployment paused, and the
    // settings route rejects changes while paused.
    await apiServices.significantEventsTest.resumeSignificantEvents();

    const suffix = `${workerInfo.parallelIndex}-${Date.now()}`;
    spaceA = `ki-continuous-a-${suffix}`;
    spaceB = `ki-continuous-b-${suffix}`;
    await apiServices.spaces.create({ id: spaceA });
    await apiServices.spaces.create({ id: spaceB });
  });

  apiTest.afterAll(async ({ apiClient, apiServices }) => {
    apiTest.setTimeout(TEST_TIMEOUT_MS);
    // Deleting a space does not delete its workflows, so turn the feature off first
    // to uninstall the space documents.
    for (const spaceId of [spaceA, spaceB]) {
      await apiClient.put(settingsPath(spaceId), settingsRequest(false));
      await apiServices.spaces.delete(spaceId);
    }
  });

  apiTest('installs the workflow document in the enabled space only', async ({ apiClient }) => {
    apiTest.setTimeout(TEST_TIMEOUT_MS);

    const enableResponse = await apiClient.put(settingsPath(spaceA), settingsRequest(true));
    expect(enableResponse).toHaveStatusCode(200);

    const installed = await apiClient.get(
      workflowPath({ spaceId: spaceA, documentSpaceId: spaceA }),
      workflowRequest()
    );
    expect(installed).toHaveStatusCode(200);
    expect(installed.body.enabled).toBe(true);

    // Neither the other space's own document nor space A's document is visible there.
    const otherSpaceDocument = await apiClient.get(
      workflowPath({ spaceId: spaceB, documentSpaceId: spaceB }),
      workflowRequest()
    );
    expect(otherSpaceDocument).toHaveStatusCode(404);
    const crossSpaceRead = await apiClient.get(
      workflowPath({ spaceId: spaceB, documentSpaceId: spaceA }),
      workflowRequest()
    );
    expect(crossSpaceRead).toHaveStatusCode(404);

    const disableResponse = await apiClient.put(settingsPath(spaceA), settingsRequest(false));
    expect(disableResponse).toHaveStatusCode(200);

    const removed = await apiClient.get(
      workflowPath({ spaceId: spaceA, documentSpaceId: spaceA }),
      workflowRequest()
    );
    expect(removed).toHaveStatusCode(404);
  });

  apiTest(
    'keeps the workflow of another space when one space is disabled',
    async ({ apiClient }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);

      for (const spaceId of [spaceA, spaceB]) {
        const response = await apiClient.put(settingsPath(spaceId), settingsRequest(true));
        expect(response).toHaveStatusCode(200);
      }

      const disableResponse = await apiClient.put(settingsPath(spaceA), settingsRequest(false));
      expect(disableResponse).toHaveStatusCode(200);

      const removed = await apiClient.get(
        workflowPath({ spaceId: spaceA, documentSpaceId: spaceA }),
        workflowRequest()
      );
      expect(removed).toHaveStatusCode(404);

      const kept = await apiClient.get(
        workflowPath({ spaceId: spaceB, documentSpaceId: spaceB }),
        workflowRequest()
      );
      expect(kept).toHaveStatusCode(200);
      expect(kept.body.enabled).toBe(true);
    }
  );

  apiTest(
    'rejects the eligible sources request in a space where the setting is off',
    async ({ apiClient }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);

      const response = await apiClient.put(settingsPath(spaceA), settingsRequest(false));
      expect(response).toHaveStatusCode(200);

      const eligible = await apiClient.get(`s/${spaceA}/${ELIGIBLE_ENDPOINT}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(eligible).toHaveStatusCode(400);
      expect(eligible.body.message).toBe('Continuous KI extraction is disabled');
    }
  );
});
