/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KbnClient, KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, mergeSyntheticsApiHeaders } from '../fixtures';

/**
 * Covers `GET /internal/synthetics/monitors/maintenance_windows`.
 *
 * This route deliberately resolves maintenance windows with the internal
 * maintenance-window client, so a Synthetics **read-only** user (who does not
 * hold the `read-maintenance-window` privilege) can still load them — previously
 * the overview called the alerting endpoints directly and got a 403. These tests
 * lock in that behavior and the two other security-sensitive properties of the
 * route: it is scoped to the caller's space (`namespaces: [spaceId]`) and it
 * projects only a small field subset.
 *
 * The unauthorized (no `uptime-read`) 403 case is already covered for every
 * route by `synthetics_api_security.spec.ts`.
 */

const MW_ROUTE = 'internal/synthetics/monitors/maintenance_windows';
const MAINTENANCE_WINDOW_API = '/internal/alerting/rules/maintenance_window';
const MW_DURATION_MS = 60 * 60 * 1000;
const EXPECTED_FIELDS = ['id', 'title', 'status', 'updatedAt'].sort();

const spacePrefix = (spaceId?: string) => (spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '');
const routePath = (spaceId?: string) =>
  spaceId && spaceId !== 'default' ? `s/${spaceId}/${MW_ROUTE}` : MW_ROUTE;

interface CreatedMaintenanceWindow {
  id: string;
  title: string;
}

interface MaintenanceWindowResponseItem {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

const createMaintenanceWindow = async (
  kbnClient: KbnClient,
  spaceId?: string
): Promise<CreatedMaintenanceWindow> => {
  const { data } = await kbnClient.request<CreatedMaintenanceWindow>({
    method: 'POST',
    path: `${spacePrefix(spaceId)}${MAINTENANCE_WINDOW_API}`,
    body: {
      title: `test-maintenance-window-${uuidv4()}`,
      duration: MW_DURATION_MS,
      r_rule: { dtstart: new Date().toISOString(), tzid: 'UTC', freq: 0, count: 1 },
      category_ids: ['management'],
    },
  });
  return data;
};

const deleteMaintenanceWindow = async (kbnClient: KbnClient, id: string, spaceId?: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `${spacePrefix(spaceId)}${MAINTENANCE_WINDOW_API}/${id}`,
    ignoreErrors: [404],
  });
};

apiTest.describe(
  'MaintenanceWindowsRoute',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let readHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      // A Synthetics read-only user: `uptime: ['read']` maps to the `uptime-read`
      // privilege and grants no maintenance-window access.
      const readRole: KibanaRole = {
        elasticsearch: { cluster: [] },
        kibana: [{ base: [], feature: { uptime: ['read'] }, spaces: ['*'] }],
      };
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(readRole);
      readHeaders = mergeSyntheticsApiHeaders(apiKeyHeader);
    });

    apiTest(
      'returns maintenance windows to a read-only user and projects only the UI fields',
      async ({ apiClient, kbnClient }) => {
        const mw = await createMaintenanceWindow(kbnClient);

        try {
          const res = await apiClient.get(routePath(), {
            headers: readHeaders,
            responseType: 'json',
          });

          expect(res.statusCode).toBe(200);
          const maintenanceWindows = (
            res.body as { maintenanceWindows: MaintenanceWindowResponseItem[] }
          ).maintenanceWindows;

          const created = maintenanceWindows.find((item) => item.id === mw.id);
          expect(created).toBeDefined();
          expect(created!.title).toBe(mw.title);

          // Guards against the projection silently widening to leak the full
          // maintenance-window object (scope query, rRule, category ids, ...).
          for (const item of maintenanceWindows) {
            expect(Object.keys(item).sort()).toStrictEqual(EXPECTED_FIELDS);
          }
        } finally {
          await deleteMaintenanceWindow(kbnClient, mw.id);
        }
      }
    );

    apiTest(
      'only returns maintenance windows from the caller space',
      async ({ apiClient, kbnClient, log }) => {
        const spaceId = `mw-route-space-${uuidv4()}`;
        await kbnClient.spaces.create({ id: spaceId, name: spaceId });

        const defaultMw = await createMaintenanceWindow(kbnClient);
        const spaceMw = await createMaintenanceWindow(kbnClient, spaceId);

        try {
          const defaultRes = await apiClient.get(routePath(), {
            headers: readHeaders,
            responseType: 'json',
          });
          expect(defaultRes.statusCode).toBe(200);
          const defaultIds = (
            defaultRes.body as { maintenanceWindows: MaintenanceWindowResponseItem[] }
          ).maintenanceWindows.map((item) => item.id);
          expect(defaultIds).toContain(defaultMw.id);
          expect(defaultIds).not.toContain(spaceMw.id);

          const spaceRes = await apiClient.get(routePath(spaceId), {
            headers: readHeaders,
            responseType: 'json',
          });
          expect(spaceRes.statusCode).toBe(200);
          const spaceIds = (
            spaceRes.body as { maintenanceWindows: MaintenanceWindowResponseItem[] }
          ).maintenanceWindows.map((item) => item.id);
          expect(spaceIds).toContain(spaceMw.id);
          expect(spaceIds).not.toContain(defaultMw.id);
        } finally {
          await deleteMaintenanceWindow(kbnClient, defaultMw.id);
          await deleteMaintenanceWindow(kbnClient, spaceMw.id, spaceId);
          await kbnClient.spaces
            .delete(spaceId)
            .catch((err) =>
              log.warning(`Failed to delete test space ${spaceId}: ${err?.message ?? err}`)
            );
        }
      }
    );
  }
);
