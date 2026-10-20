/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  FIND_THREAT_REPORTS_API_PATH,
  GET_THREAT_REPORT_API_PATH,
  LIST_SOURCES_API_PATH,
} from '../../../../common/threat_intel';
import {
  ALERTZERO_READ_ONLY_ROLE,
  apiTest,
  cleanupThreatReportsByIds,
  enableAlertZeroInSpace,
  HUNT_ALL_ROUTES,
  HUNT_INDEX_SCOPE_URL,
  HUNT_READ_ROUTES,
  HUNT_WORKER_URL,
  HUNT_WRITE_ROUTES,
  NO_ALERTZERO_ROLE,
  seedSharedReportWithEvidence,
  spaceUrl,
  SUPPLY_RESTORE_URL,
  SUPPLY_STATUS_URL,
  tags,
  withHuntHeaders,
} from '../fixtures';

const RUN = Date.now();
const SPACE_A = `hunt-authz-a-${RUN}`;
const SPACE_B = `hunt-authz-b-${RUN}`;
const REPORT_ID = `scout-evidence-${RUN}`;
const HUNT_READ_ROUTE_SET: ReadonlySet<string> = new Set(HUNT_READ_ROUTES);

interface ErrorBody {
  message?: string;
}

/**
 * Core route authz names the missing Kibana privilege in its 403 body. Asserting on it
 * keeps a 403 from the AlertZero subscription gate or a handler from passing as authz.
 */
const expectMissingKibanaPrivilege = (
  response: { statusCode: number; body: unknown },
  privilege: string
) => {
  expect(response.statusCode).toBe(403);
  expect((response.body as ErrorBody).message).toContain(
    `granted by the Kibana privileges [${privilege}]`
  );
};

/**
 * Route, identity, and space authz table, plus per-space evidence projection on
 * a shared report and feed credential non-exposure on list_sources.
 */
apiTest.describe(
  'Hunt Watch - authz isolation and evidence projection',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient, esClient }) => {
      await apiServices.spaces.create({ id: SPACE_A, name: SPACE_A });
      await apiServices.spaces.create({ id: SPACE_B, name: SPACE_B });

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = withHuntHeaders(cookieHeader);

      await enableAlertZeroInSpace({ apiClient, headers: adminHeaders, spaceId: SPACE_A });
      await enableAlertZeroInSpace({ apiClient, headers: adminHeaders, spaceId: SPACE_B });

      await seedSharedReportWithEvidence({
        esClient,
        reportId: REPORT_ID,
        spaceA: SPACE_A,
        spaceB: SPACE_B,
      });
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await cleanupThreatReportsByIds(esClient, [REPORT_ID]);
      await apiServices.spaces.delete(SPACE_A);
      await apiServices.spaces.delete(SPACE_B);
    });

    apiTest(
      'returns 403 on every hunt route for a user without AlertZero',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NO_ALERTZERO_ROLE);
        const headers = withHuntHeaders(cookieHeader);

        for (const path of HUNT_ALL_ROUTES) {
          const response =
            path === HUNT_INDEX_SCOPE_URL
              ? await apiClient.get(spaceUrl(path, SPACE_B), { headers, responseType: 'json' })
              : await apiClient.post(spaceUrl(path, SPACE_B), {
                  headers,
                  responseType: 'json',
                  body: {},
                });
          expectMissingKibanaPrivilege(
            response,
            HUNT_READ_ROUTE_SET.has(path) ? 'alertzero_read' : 'alertzero_write'
          );
        }
      }
    );

    apiTest(
      'returns 403 on hunt write routes for an AlertZero read-only user',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTZERO_READ_ONLY_ROLE);
        const headers = withHuntHeaders(cookieHeader);

        for (const path of HUNT_WRITE_ROUTES) {
          const response = await apiClient.post(spaceUrl(path, SPACE_B), {
            headers,
            responseType: 'json',
            body: {},
          });
          expectMissingKibanaPrivilege(response, 'alertzero_write');
        }
      }
    );

    apiTest(
      'lets an AlertZero read-only user read supply status',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTZERO_READ_ONLY_ROLE);
        const response = await apiClient.get(spaceUrl(SUPPLY_STATUS_URL, SPACE_B), {
          headers: withHuntHeaders(cookieHeader),
          responseType: 'json',
        });
        expect(response.statusCode).toBe(200);
      }
    );

    apiTest(
      'returns 403 when an AlertZero read-only user calls Restore',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTZERO_READ_ONLY_ROLE);
        const response = await apiClient.post(spaceUrl(SUPPLY_RESTORE_URL, SPACE_B), {
          headers: withHuntHeaders(cookieHeader),
          responseType: 'json',
          body: {},
        });
        // Read-only lacks alertzero_write, so core authz refuses before the handler's
        // manage_security check runs.
        expectMissingKibanaPrivilege(response, 'alertzero_write');
      }
    );

    apiTest(
      'returns 403 when an AlertZero read-only user PATCHes a Worker',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTZERO_READ_ONLY_ROLE);
        const response = await apiClient.patch(spaceUrl(HUNT_WORKER_URL, SPACE_B), {
          headers: withHuntHeaders(cookieHeader),
          responseType: 'json',
          body: { enabled: false },
        });
        expectMissingKibanaPrivilege(response, 'alertzero_write');
      }
    );

    apiTest(
      'returns 400 when an admin omits the internal-origin header',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const response = await apiClient.get(spaceUrl(SUPPLY_STATUS_URL, SPACE_B), {
          headers: {
            ...cookieHeader,
            'kbn-xsrf': 'true',
            'elastic-api-version': '1',
          },
          responseType: 'json',
        });
        expect(response.statusCode).toBe(400);
        expect((response.body as ErrorBody).message).toContain(
          'is not available with the current configuration'
        );
      }
    );

    apiTest('projects only the caller space evidence on a shared report', async ({ apiClient }) => {
      const path = GET_THREAT_REPORT_API_PATH.replace('{reportId}', REPORT_ID);
      const response = await apiClient.get(spaceUrl(path, SPACE_B), {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(response.statusCode).toBe(200);
      const evidence = (response.body as { evidence?: { space_id: string } }).evidence;
      expect(evidence?.space_id).toBe(SPACE_B);
    });

    apiTest('omits evidence from find_threat_reports', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${spaceUrl(FIND_THREAT_REPORTS_API_PATH, SPACE_B)}?pageSize=100`,
        {
          headers: adminHeaders,
          responseType: 'json',
        }
      );
      expect(response.statusCode).toBe(200);
      const items = (response.body as { items?: Array<Record<string, unknown>> }).items ?? [];
      expect(items.every((item) => !('evidence' in item))).toBe(true);
    });

    apiTest('refuses a B-only role on space A routes', async ({ samlAuth, apiClient }) => {
      const bOnlyRole: KibanaRole = {
        elasticsearch: { cluster: [], indices: [] },
        kibana: [
          {
            base: [],
            feature: { siem: ['read'], alertzero: ['read'] },
            spaces: [SPACE_B],
          },
        ],
      };
      const { cookieHeader } = await samlAuth.asInteractiveUser(bOnlyRole);
      const path = GET_THREAT_REPORT_API_PATH.replace('{reportId}', REPORT_ID);
      const response = await apiClient.get(spaceUrl(path, SPACE_A), {
        headers: withHuntHeaders(cookieHeader),
        responseType: 'json',
      });
      expectMissingKibanaPrivilege(response, 'securitySolution');
    });

    apiTest(
      'never returns feed credentials as URL userinfo from list_sources',
      async ({ apiClient }) => {
        const response = await apiClient.post(LIST_SOURCES_API_PATH, {
          headers: adminHeaders,
          responseType: 'json',
          body: {},
        });
        expect(response.statusCode).toBe(200);
        const sources = (response.body as { sources: Array<{ url?: string }> }).sources;
        expect(sources.every((s) => s.url == null || !/:[^/]*@/.test(s.url))).toBe(true);
      }
    );
  }
);
