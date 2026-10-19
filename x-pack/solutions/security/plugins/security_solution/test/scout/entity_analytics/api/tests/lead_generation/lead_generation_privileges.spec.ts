/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import type { SamlAuth } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  LEAD_GENERATION_ROUTES,
  INTERNAL_HEADERS,
  LEAD_GENERATION_TAGS,
} from '../../fixtures/lead_generation_constants';
import { DEFAULT_SPACE_ID } from '../../fixtures/lead_generation_helpers';
import {
  getLeadsIndexName,
  LEADS_INDEX_PATTERN,
} from '../../../../../../common/entity_analytics/lead_generation/constants';

/**
 * The leads index is shared, per-space infrastructure rather than per-user data, so it is
 * provisioned with the internal (kibana_system) client. These tests pin that contract: a user
 * with `read`/`write` on the leads index but no `manage`/`create_index` must still be able to
 * enable lead generation and get the index created. Enabling and generating both write leads
 * as the requesting user, so a user without index write access is rejected up front.
 */
apiTest.describe(
  'Lead Generation - index provisioning privileges',
  { tag: LEAD_GENERATION_TAGS },
  () => {
    const leadsIndexName = getLeadsIndexName(DEFAULT_SPACE_ID);

    let adminHeaders: Record<string, string>;

    // Scout reuses a single custom role per worker, so each call below overrides the previous
    // role definition. Resolve these headers inside the test that needs them, never up front.
    // Security `all`, but zero Elasticsearch index privileges.
    const getNoIndexPrivilegesHeaders = async (samlAuth: SamlAuth) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: [] },
        kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['*'] }],
      });
      return { ...cookieHeader, ...INTERNAL_HEADERS };
    };

    // Security `all` plus `read`/`write` on the leads index, but no `manage`/`create_index`.
    const getWriteWithoutManageHeaders = async (samlAuth: SamlAuth) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser({
        elasticsearch: {
          cluster: [],
          // The privileges route checks the wildcard pattern, so grant on the pattern.
          indices: [{ names: [LEADS_INDEX_PATTERN], privileges: ['read', 'write'] }],
        },
        kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['*'] }],
      });
      return { ...cookieHeader, ...INTERNAL_HEADERS };
    };

    apiTest.beforeAll(async ({ samlAuth }) => {
      const admin = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...admin.cookieHeader, ...INTERNAL_HEADERS };
    });

    apiTest.beforeEach(async ({ esClient }) => {
      // Delete the index so its existence after enable proves this request created it.
      await esClient.indices.delete({ index: leadsIndexName }, { ignore: [404] });
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      const disableResponse = await apiClient.post(LEAD_GENERATION_ROUTES.DISABLE, {
        headers: adminHeaders,
        responseType: 'json',
        body: {},
      });
      if (disableResponse.statusCode !== 200 && disableResponse.statusCode !== 404) {
        throw new Error(
          `Unexpected status from /disable during cleanup: ${disableResponse.statusCode}`
        );
      }
      await esClient.indices.delete({ index: leadsIndexName }, { ignore: [404] });
    });

    apiTest(
      'POST /enable creates the leads index for a user with write but not manage privileges',
      async ({ apiClient, esClient, samlAuth }) => {
        const writeWithoutManageHeaders = await getWriteWithoutManageHeaders(samlAuth);

        await apiTest.step(
          'the user can write to the leads index but cannot manage it',
          async () => {
            const privileges = await apiClient.get(LEAD_GENERATION_ROUTES.PRIVILEGES, {
              headers: writeWithoutManageHeaders,
              responseType: 'json',
            });

            expect(privileges).toHaveStatusCode(200);
            expect(privileges.body.has_write_permissions).toBe(true);
          }
        );

        await apiTest.step('enable creates the index anyway', async () => {
          const response = await apiClient.post(LEAD_GENERATION_ROUTES.ENABLE, {
            headers: writeWithoutManageHeaders,
            responseType: 'json',
            body: { connectorId: 'test-connector' },
          });

          expect(response).toHaveStatusCode(200);
          expect(response.body).toStrictEqual({ success: true });

          expect(await esClient.indices.exists({ index: leadsIndexName })).toBe(true);
        });
      }
    );

    apiTest(
      'POST /enable stays idempotent when the leads index already exists',
      async ({ apiClient, esClient, samlAuth }) => {
        const writeWithoutManageHeaders = await getWriteWithoutManageHeaders(samlAuth);
        for (let attempt = 0; attempt < 2; attempt++) {
          const response = await apiClient.post(LEAD_GENERATION_ROUTES.ENABLE, {
            headers: writeWithoutManageHeaders,
            responseType: 'json',
            body: { connectorId: 'test-connector' },
          });
          expect(response).toHaveStatusCode(200);
        }

        expect(await esClient.indices.exists({ index: leadsIndexName })).toBe(true);
      }
    );

    apiTest(
      'GET /status reports the index as created once enable has run',
      async ({ apiClient, samlAuth }) => {
        const writeWithoutManageHeaders = await getWriteWithoutManageHeaders(samlAuth);
        await apiClient.post(LEAD_GENERATION_ROUTES.ENABLE, {
          headers: writeWithoutManageHeaders,
          responseType: 'json',
          body: { connectorId: 'test-connector' },
        });

        const response = await apiClient.get(LEAD_GENERATION_ROUTES.STATUS, {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.isEnabled).toBe(true);
        expect(response.body.indexExists).toBe(true);
      }
    );

    apiTest(
      'POST /enable is rejected with 403 for a user without index write permissions',
      async ({ apiClient, esClient, samlAuth }) => {
        const noIndexPrivilegesHeaders = await getNoIndexPrivilegesHeaders(samlAuth);
        const response = await apiClient.post(LEAD_GENERATION_ROUTES.ENABLE, {
          headers: noIndexPrivilegesHeaders,
          responseType: 'json',
          body: { connectorId: 'test-connector' },
        });

        expect(response).toHaveStatusCode(403);
        expect(await esClient.indices.exists({ index: leadsIndexName })).toBe(false);
      }
    );

    apiTest(
      'POST /generate is rejected with 403 for a user without index write permissions',
      async ({ apiClient, samlAuth }) => {
        const noIndexPrivilegesHeaders = await getNoIndexPrivilegesHeaders(samlAuth);
        const response = await apiClient.post(LEAD_GENERATION_ROUTES.GENERATE, {
          headers: noIndexPrivilegesHeaders,
          responseType: 'json',
          body: { connectorId: 'test-connector' },
        });

        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
