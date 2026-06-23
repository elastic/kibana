/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { syntheticsMonitorSavedObjectType } from '../../../../common/types/saved_objects';
import {
  apiTest,
  LOCAL_PUBLIC_LOCATION,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../fixtures';
import {
  bulkUpdateMonitors,
  deleteMonitors,
  enableSynthetics,
  getMonitor,
  listMonitors,
  saveMonitorInternal,
} from '../fixtures/monitors';
import { pushProjectMonitors } from '../fixtures/project';
import { httpMonitorFixture } from '../fixtures/data/http_monitor';
import type { ScoutPrivateLocation } from '../services/synthetics_private_location_api_service';

interface BulkUpdateResult {
  id: string;
  updated: boolean;
  error?: string;
}

interface SavedUiMonitor extends Record<string, unknown> {
  config_id: string;
  name: string;
  tags: string[];
  urls: string;
  schedule: { number: string; unit: string };
}

/**
 * Ported from FTR
 * `x-pack/solutions/observability/test/api_integration/apis/synthetics/update_monitor_bulk.ts`.
 *
 * Exercises `PUT /api/synthetics/monitors/_bulk_update` through the full stack:
 * real ESO round-trip (the AAD regression reads the monitor back via internal
 * GET, which decrypts; if `mergeSourceMonitor` ever stops carrying prev AAD
 * attrs through, that GET turns into a 500), real Fleet for the private-location
 * monitor, and the project-monitor rejection path through the registered route.
 */
apiTest.describe(
  'UpdateMonitorBulkAPI',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let editorHeaders: Record<string, string>;
    let privateLocation: ScoutPrivateLocation;
    const httpMonitorJson: Record<string, unknown> = {
      ...httpMonitorFixture,
      locations: [LOCAL_PUBLIC_LOCATION],
    };

    const createUiMonitor = async (
      apiClient: ApiClientFixture,
      overrides: Record<string, unknown> = {}
    ): Promise<SavedUiMonitor> => {
      const monitor = {
        ...httpMonitorJson,
        name: `bulk-patch-${uuidv4()}`,
        ...overrides,
      };
      const res = await saveMonitorInternal(apiClient, editorHeaders, monitor);
      return res.body as SavedUiMonitor;
    };

    const findByJourneyId = async (
      apiClient: ApiClientFixture,
      journeyId: string
    ): Promise<string | undefined> => {
      const filter = `${syntheticsMonitorSavedObjectType}.attributes.journey_id: "${journeyId}"`;
      const res = await listMonitors(apiClient, editorHeaders, `filter=${encodeURIComponent(filter)}`);
      const monitors = (res.body as { monitors: Array<{ config_id: string }> }).monitors;
      return monitors[0]?.config_id;
    };

    const resultFor = (results: BulkUpdateResult[], id: string) =>
      results.find((entry) => entry.id === id);

    apiTest.beforeAll(async ({ requestAuth, apiClient, kbnClient, apiServices }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
      await enableSynthetics(apiClient, editorHeaders);
      privateLocation = await apiServices.syntheticsPrivateLocations.getSharedPrivateLocation();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    });

    // --- happy path ----------------------------------------------------------

    apiTest('partially patches a single monitor with a public location', async ({ apiClient }) => {
      const monitor = await createUiMonitor(apiClient, { enabled: true });
      try {
        const res = await bulkUpdateMonitors(apiClient, editorHeaders, {
          ids: [monitor.config_id],
          attributes: { enabled: false },
        });

        expect(res.body.result).toStrictEqual([{ id: monitor.config_id, updated: true }]);
        expect(res.body.errors).toBeUndefined();

        const { body: refreshed } = await getMonitor(apiClient, editorHeaders, monitor.config_id);
        expect((refreshed as { enabled: boolean }).enabled).toBe(false);
        // Untouched AAD-bound fields must round-trip unchanged.
        expect((refreshed as { name: string }).name).toBe(monitor.name);
        expect((refreshed as { tags: string[] }).tags).toStrictEqual(monitor.tags);
        expect((refreshed as { schedule: unknown }).schedule).toStrictEqual(monitor.schedule);
      } finally {
        await deleteMonitors(apiClient, editorHeaders, [monitor.config_id]);
      }
    });

    apiTest('partially patches a monitor with a private location', async ({ apiClient }) => {
      const monitor = await createUiMonitor(apiClient, {
        locations: [privateLocation],
      });
      try {
        const res = await bulkUpdateMonitors(apiClient, editorHeaders, {
          ids: [monitor.config_id],
          attributes: { enabled: false },
        });

        expect(res.body.result).toStrictEqual([{ id: monitor.config_id, updated: true }]);

        const { body: refreshed } = await getMonitor(apiClient, editorHeaders, monitor.config_id);
        expect((refreshed as { enabled: boolean }).enabled).toBe(false);
        expect((refreshed as { locations: Array<{ id: string }> }).locations[0].id).toBe(
          privateLocation.id
        );
      } finally {
        await deleteMonitors(apiClient, editorHeaders, [monitor.config_id]);
      }
    });

    apiTest('patches multiple monitors in one request', async ({ apiClient }) => {
      const m1 = await createUiMonitor(apiClient);
      const m2 = await createUiMonitor(apiClient);
      try {
        const res = await bulkUpdateMonitors(apiClient, editorHeaders, {
          ids: [m1.config_id, m2.config_id],
          attributes: { tags: ['bulk-patched'] },
        });

        expect(res.body.result).toStrictEqual([
          { id: m1.config_id, updated: true },
          { id: m2.config_id, updated: true },
        ]);

        const refreshedA = await getMonitor(apiClient, editorHeaders, m1.config_id);
        const refreshedB = await getMonitor(apiClient, editorHeaders, m2.config_id);
        expect((refreshedA.body as { tags: string[] }).tags).toStrictEqual(['bulk-patched']);
        expect((refreshedB.body as { tags: string[] }).tags).toStrictEqual(['bulk-patched']);
      } finally {
        await deleteMonitors(apiClient, editorHeaders, [m1.config_id, m2.config_id]);
      }
    });

    // --- AAD regression (decrypt-merge-encrypt safety) -----------------------

    apiTest(
      'keeps the monitor decryptable after a partial patch on an AAD field',
      async ({ apiClient }) => {
        /*
         * Headline guarantee of this endpoint. Create a monitor with encrypted
         * secrets (`username`, `password`) bound by AAD to a set of plaintext
         * attributes. Patch only `enabled` (itself in the AAD set). Re-fetch
         * via internal GET, which goes through `monitorConfigRepository.getDecrypted`
         * and throws a 500 if AAD ever drifts from the encrypted value during
         * our merge — i.e. if `mergeSourceMonitor` stops carrying prev AAD attrs
         * through, this turns the GET below into a 500.
         */
        const monitor = await createUiMonitor(apiClient, {
          username: 'aad-test-user',
          password: 'aad-test-pass',
          tags: ['aad', 'regression'],
        });
        try {
          await bulkUpdateMonitors(apiClient, editorHeaders, {
            ids: [monitor.config_id],
            attributes: { enabled: false },
          });

          const { body: refreshed } = await getMonitor(apiClient, editorHeaders, monitor.config_id, {
            internal: true,
          });

          const decrypted = refreshed as {
            enabled: boolean;
            username: string;
            password: string;
            tags: string[];
            urls: string;
          };
          expect(decrypted.enabled).toBe(false);
          expect(decrypted.username).toBe('aad-test-user');
          expect(decrypted.password).toBe('aad-test-pass');
          expect(decrypted.tags).toStrictEqual(['aad', 'regression']);
          expect(decrypted.urls).toBe(monitor.urls);
        } finally {
          await deleteMonitors(apiClient, editorHeaders, [monitor.config_id]);
        }
      }
    );

    // --- per-id error reporting ----------------------------------------------

    apiTest('returns mixed updated/error entries when some ids do not exist', async ({
      apiClient,
    }) => {
      const monitor = await createUiMonitor(apiClient);
      const missingId = uuidv4();
      try {
        const res = await bulkUpdateMonitors(apiClient, editorHeaders, {
          ids: [monitor.config_id, missingId],
          attributes: { enabled: false },
        });

        const results = res.body.result as BulkUpdateResult[];
        expect(results).toHaveLength(2);

        const updatedEntry = resultFor(results, monitor.config_id);
        const missingEntry = resultFor(results, missingId);

        expect(updatedEntry).toStrictEqual({ id: monitor.config_id, updated: true });
        expect(missingEntry!.updated).toBe(false);
        expect(missingEntry!.error).toMatch(/not found/i);
      } finally {
        await deleteMonitors(apiClient, editorHeaders, [monitor.config_id]);
      }
    });

    apiTest('rejects project-origin monitors with an origin error', async ({ apiClient }) => {
      const projectName = `bulk-patch-project-${uuidv4()}`;
      const journeyId = `bulk-patch-journey-${uuidv4()}`;

      await pushProjectMonitors(apiClient, editorHeaders, projectName, [
        {
          type: 'http',
          id: journeyId,
          name: 'project monitor for bulk patch test',
          urls: ['https://elastic.co'],
          schedule: 5,
          locations: ['dev'],
          privateLocations: [],
        },
      ]);

      const projectMonitorId = await findByJourneyId(apiClient, journeyId);
      expect(projectMonitorId).toBeDefined();

      try {
        const res = await bulkUpdateMonitors(apiClient, editorHeaders, {
          ids: [projectMonitorId!],
          attributes: { enabled: false },
        });

        const results = res.body.result as BulkUpdateResult[];
        expect(results).toHaveLength(1);
        expect(results[0].updated).toBe(false);
        expect(results[0].error).toMatch(/origin/i);

        const refreshed = await getMonitor(apiClient, editorHeaders, projectMonitorId!);
        expect((refreshed.body as { enabled: boolean }).enabled).toBe(true);
      } finally {
        await deleteMonitors(apiClient, editorHeaders, [projectMonitorId!]);
      }
    });

    apiTest('rejects schedules outside the allowed set with a validation error', async ({
      apiClient,
    }) => {
      const monitor = await createUiMonitor(apiClient);
      try {
        const res = await bulkUpdateMonitors(apiClient, editorHeaders, {
          ids: [monitor.config_id],
          attributes: { schedule: { number: '7', unit: 'm' } },
        });

        const results = res.body.result as BulkUpdateResult[];
        expect(results).toHaveLength(1);
        expect(results[0].updated).toBe(false);
        expect(results[0].error).toMatch(/schedule/i);

        const refreshed = await getMonitor(apiClient, editorHeaders, monitor.config_id);
        expect((refreshed.body as { schedule: unknown }).schedule).toStrictEqual({
          number: '5',
          unit: 'm',
        });
      } finally {
        await deleteMonitors(apiClient, editorHeaders, [monitor.config_id]);
      }
    });

    // --- input validation ----------------------------------------------------

    apiTest('returns 400 when attributes is empty', async ({ apiClient }) => {
      const monitor = await createUiMonitor(apiClient);
      try {
        const res = await bulkUpdateMonitors(
          apiClient,
          editorHeaders,
          { ids: [monitor.config_id], attributes: {} },
          { statusCode: 400 }
        );
        expect((res.body as { message: string }).message).toMatch(/attributes/i);
      } finally {
        await deleteMonitors(apiClient, editorHeaders, [monitor.config_id]);
      }
    });

    apiTest('returns 400 when ids is empty (schema-level rejection)', async ({ apiClient }) => {
      await bulkUpdateMonitors(
        apiClient,
        editorHeaders,
        { ids: [], attributes: { enabled: false } },
        { statusCode: 400 }
      );
    });
  }
);
