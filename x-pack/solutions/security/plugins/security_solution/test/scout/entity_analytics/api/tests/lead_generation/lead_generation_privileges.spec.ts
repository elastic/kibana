/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  LEAD_GENERATION_ROUTES,
  INTERNAL_HEADERS,
  LEAD_GENERATION_TAGS,
} from '../../fixtures/lead_generation_constants';
import { DEFAULT_SPACE_ID } from '../../fixtures/lead_generation_helpers';
import { getLeadsIndexName } from '../../../../../../common/entity_analytics/lead_generation/constants';

/**
 * The leads index is shared, per-space infrastructure rather than per-user data, so it is
 * provisioned with the internal (kibana_system) client. These tests pin that contract: a user
 * holding only the Security feature privilege — and no Elasticsearch index privileges at all —
 * must still be able to enable lead generation and get the index created.
 */
apiTest.describe(
  'Lead Generation - index provisioning privileges',
  { tag: LEAD_GENERATION_TAGS },
  () => {
    const leadsIndexName = getLeadsIndexName(DEFAULT_SPACE_ID);

    let adminHeaders: Record<string, string>;
    // Security `all`, but zero Elasticsearch index privileges.
    let noIndexPrivilegesHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const admin = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...admin.cookieHeader, ...INTERNAL_HEADERS };

      const { cookieHeader } = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: [] },
        kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['*'] }],
      });
      noIndexPrivilegesHeaders = { ...cookieHeader, ...INTERNAL_HEADERS };
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
      'POST /enable creates the leads index for a user without index privileges',
      async ({ apiClient, esClient }) => {
        await apiTest.step('the user really holds no leads index privileges', async () => {
          const privileges = await apiClient.get(LEAD_GENERATION_ROUTES.PRIVILEGES, {
            headers: noIndexPrivilegesHeaders,
            responseType: 'json',
          });

          expect(privileges).toHaveStatusCode(200);
          expect(privileges.body.has_all_required).toBe(false);
          expect(privileges.body.has_write_permissions).toBe(false);
        });

        await apiTest.step('enable creates the index anyway', async () => {
          const response = await apiClient.post(LEAD_GENERATION_ROUTES.ENABLE, {
            headers: noIndexPrivilegesHeaders,
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
      async ({ apiClient, esClient }) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          const response = await apiClient.post(LEAD_GENERATION_ROUTES.ENABLE, {
            headers: noIndexPrivilegesHeaders,
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
      async ({ apiClient }) => {
        await apiClient.post(LEAD_GENERATION_ROUTES.ENABLE, {
          headers: noIndexPrivilegesHeaders,
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
  }
);
