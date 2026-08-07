/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  PND_WATCHES_SETUP_URL,
  PND_WATCHES_URL,
  PREBUILT_WATCH_IDS,
  PREBUILT_WATCH_OFFICER_ID,
  buildWatchUrl,
  type GetWatchResponse,
  type ListWatchesResponse,
  type SetupWatchesResponse,
  type WatchSettings,
} from '@kbn/pnd-common';
import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe('PND watch settings persistence', { tag: tags.stateful.classic }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    headers = {
      ...credentials.cookieHeader,
      ...testData.COMMON_HEADERS,
      'elastic-api-version': API_VERSIONS.internal.v1,
    };
  });

  apiTest('persists a complete settings replacement across requests', async ({ apiClient }) => {
    apiTest.setTimeout(180_000);

    const setupResponse = await apiClient.post(PND_WATCHES_SETUP_URL, {
      headers,
      responseType: 'json',
    });
    expect(setupResponse.statusCode).toBe(200);
    const setup = setupResponse.body as SetupWatchesResponse;
    expect(setup.failed).toStrictEqual([]);
    expect([...setup.created, ...setup.existing]).toStrictEqual(
      expect.arrayContaining([...PREBUILT_WATCH_IDS])
    );

    const listResponse = await apiClient.get(PND_WATCHES_URL, {
      headers,
      responseType: 'json',
    });
    expect(listResponse.statusCode).toBe(200);
    const list = listResponse.body as ListWatchesResponse;
    expect(list.watches).toHaveLength(4);

    const initialResponse = await apiClient.get(buildWatchUrl(PREBUILT_WATCH_OFFICER_ID), {
      headers,
      responseType: 'json',
    });
    expect(initialResponse.statusCode).toBe(200);
    const initial = (initialResponse.body as GetWatchResponse).watch;
    const originalSettings: WatchSettings = {
      enabled: initial.enabled,
      description: initial.description,
      autonomyLevel: initial.autonomyLevel,
      scheduleInterval: initial.scheduleInterval,
    };
    const updatedSettings: WatchSettings = {
      enabled: !originalSettings.enabled,
      description: 'Scout persisted watch description',
      autonomyLevel: originalSettings.autonomyLevel === 'manual' ? 'assisted' : 'manual',
      scheduleInterval: originalSettings.scheduleInterval === '6h' ? '90s' : '6h',
    };

    try {
      const updateResponse = await apiClient.put(buildWatchUrl(PREBUILT_WATCH_OFFICER_ID), {
        headers,
        responseType: 'json',
        body: updatedSettings,
      });
      expect(updateResponse.statusCode).toBe(200);
      expect((updateResponse.body as GetWatchResponse).watch).toMatchObject(updatedSettings);

      const persistedResponse = await apiClient.get(buildWatchUrl(PREBUILT_WATCH_OFFICER_ID), {
        headers,
        responseType: 'json',
      });
      expect(persistedResponse.statusCode).toBe(200);
      expect((persistedResponse.body as GetWatchResponse).watch).toMatchObject(updatedSettings);
    } finally {
      await apiClient.put(buildWatchUrl(PREBUILT_WATCH_OFFICER_ID), {
        headers,
        responseType: 'json',
        body: originalSettings,
      });
    }
  });
});
