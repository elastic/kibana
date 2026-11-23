/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { ALL_SESSIONS_INDEX_PATTERN, SESSIONS_SOURCE_INDICES } from '../../../../common/sessions';
import { deleteSessionsData } from '../../common/fixtures/sessions_data';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const { COMMON_HEADERS, SESSIONS_DISABLE_PATH, SESSIONS_ENABLE_PATH, SESSIONS_STATUS_PATH } =
  testData;

/** The Elasticsearch privileges setting sessions up needs, with a Digital Experience privilege. */
const roleWith = ({
  query,
  feature,
  spaces = ['*'],
}: {
  query?: string;
  feature: string[];
  spaces?: string[];
}): KibanaRole => ({
  elasticsearch: {
    // `read_security` lets the user read their own roles on Serverless.
    cluster: ['read_security'],
    indices: [
      {
        names: [...SESSIONS_SOURCE_INDICES],
        privileges: ['read', 'view_index_metadata'],
        ...(query ? { query } : {}),
      },
      {
        names: [ALL_SESSIONS_INDEX_PATTERN],
        privileges: ['read', 'view_index_metadata', 'index', 'create_index'],
      },
    ],
  },
  kibana: [{ base: [], feature: { digital_experience: feature }, spaces }],
});

const READER_ROLE = roleWith({ feature: ['read'] });

const FILTERED_READ_ROLE = roleWith({
  feature: ['read'],
  query: '{"term":{"service.name":"checkout-web"}}',
});

/** Manages sessions in all spaces. */
const MANAGER_ROLE = roleWith({ feature: ['all'] });

/** Manages sessions, but in one space only. */
const SPACE_MANAGER_ROLE = roleWith({ feature: ['all'], spaces: ['default'] });

// As an interactive user: on Serverless that is a UIAM user, who may not read their own
// privileges, unlike the operator user behind `kbnClient`.
apiTest.describe('Enabling Digital Experience sessions', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
  });

  apiTest.beforeEach(async ({ esClient, kbnClient }) => {
    await deleteSessionsData(esClient, kbnClient);
  });

  apiTest.afterAll(async ({ apiServices, esClient, kbnClient }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    await deleteSessionsData(esClient, kbnClient);
  });

  apiTest('enables sessions for an admin', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const response = await apiClient.post(SESSIONS_ENABLE_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    // The summaries task is scheduled, and building from the lookback until it catches up.
    expect(response.body).toMatchObject({ installed: true, disabled: false, apiKeyInvalid: false });
    expect(response.body.health).not.toBe('missing');
  });

  apiTest(
    'lets a reader who can read the EDOT Browser data in full set sessions up',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(READER_ROLE);
      const headers = { ...COMMON_HEADERS, ...cookieHeader };

      const status = await apiClient.get(SESSIONS_STATUS_PATH, { headers, responseType: 'json' });
      expect(status.body).toMatchObject({ installed: false, autoEnable: true });

      const response = await apiClient.post(SESSIONS_ENABLE_PATH, {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ installed: true, disabled: false });
    }
  );

  apiTest(
    'refuses a user whose source read is filtered by document-level security',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(FILTERED_READ_ROLE);

      const response = await apiClient.post(SESSIONS_ENABLE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toContain('without document- or field-level security');
      expect(response.body.attributes).toMatchObject({
        data: { restrictedIndices: [...SESSIONS_SOURCE_INDICES], reason: 'filtered' },
      });
    }
  );

  // One test, as each stage starts from where the previous one left sessions.
  apiTest(
    'turns sessions off, and only a manager in all spaces turns them back on',
    async ({ apiClient, samlAuth }) => {
      // Scout has one custom role per worker, which each custom login overwrites, so a custom
      // user logs in right before their requests.
      const headersAs = async (role: 'admin' | KibanaRole) => ({
        ...COMMON_HEADERS,
        ...(await samlAuth.asInteractiveUser(role)).cookieHeader,
      });
      const adminHeaders = await headersAs('admin');
      const post = (path: string, headers: Record<string, string>) =>
        apiClient.post(path, { headers, responseType: 'json' });

      await apiTest.step('refuses to turn off sessions that are not set up', async () => {
        expect(await post(SESSIONS_DISABLE_PATH, adminHeaders)).toHaveStatusCode(404);
      });

      await apiTest.step('sets sessions up', async () => {
        const response = await post(SESSIONS_ENABLE_PATH, adminHeaders);
        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ canManage: true });
      });

      await apiTest.step('tells a manager in all spaces they manage sessions', async () => {
        const status = await apiClient.get(SESSIONS_STATUS_PATH, {
          headers: await headersAs(MANAGER_ROLE),
          responseType: 'json',
        });
        expect(status.body).toMatchObject({ canManage: true });
        expect(typeof status.body.enabledBy).toBe('string');
      });

      await apiTest.step('refuses a user who manages sessions in one space only', async () => {
        const spaceManagerHeaders = await headersAs(SPACE_MANAGER_ROLE);
        const status = await apiClient.get(SESSIONS_STATUS_PATH, {
          headers: spaceManagerHeaders,
          responseType: 'json',
        });
        expect(status.body).toMatchObject({ canManage: false, enabledBy: null });

        const response = await post(SESSIONS_DISABLE_PATH, spaceManagerHeaders);
        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toContain('in all spaces');
      });

      await apiTest.step('refuses a reader', async () => {
        expect(await post(SESSIONS_DISABLE_PATH, await headersAs(READER_ROLE))).toHaveStatusCode(
          403
        );
      });

      await apiTest.step('turns sessions off for a manager in all spaces', async () => {
        const response = await post(SESSIONS_DISABLE_PATH, adminHeaders);
        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({
          installed: true,
          disabled: true,
          health: 'disabled',
        });
      });

      await apiTest.step('never sets turned-off sessions up again by itself', async () => {
        const readerHeaders = await headersAs(READER_ROLE);
        const status = await apiClient.get(SESSIONS_STATUS_PATH, {
          headers: readerHeaders,
          responseType: 'json',
        });
        expect(status.body).toMatchObject({ disabled: true, autoEnable: false });

        const response = await post(SESSIONS_ENABLE_PATH, readerHeaders);
        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toContain('Sessions were turned off');
      });

      await apiTest.step('turns sessions back on for a manager in all spaces', async () => {
        const response = await post(SESSIONS_ENABLE_PATH, adminHeaders);
        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ installed: true, disabled: false });
        expect(response.body.health).not.toBe('disabled');
      });
    }
  );
});
