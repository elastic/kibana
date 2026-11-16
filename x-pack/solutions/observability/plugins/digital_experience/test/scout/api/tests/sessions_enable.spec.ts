/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { SESSIONS_INDEX_PATTERN, SESSIONS_SOURCE_INDICES } from '../../../../common/sessions';
import { deleteSessionsData } from '../../common/fixtures/sessions_data';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const { COMMON_HEADERS, SESSIONS_ENABLE_PATH } = testData;

/** Everything enabling sessions needs, but with document-level security on the source read. */
const FILTERED_READ_ROLE: KibanaRole = {
  elasticsearch: {
    // `read_security` lets the user read their own roles on Serverless.
    cluster: ['manage_index_templates', 'read_security'],
    indices: [
      {
        names: [...SESSIONS_SOURCE_INDICES],
        privileges: ['read', 'view_index_metadata'],
        query: '{"term":{"service.name":"checkout-web"}}',
      },
      {
        names: [SESSIONS_INDEX_PATTERN],
        privileges: ['read', 'index', 'create_index', 'delete', 'delete_index'],
      },
    ],
  },
  kibana: [
    { base: [], feature: { digital_experience: ['read', 'manage_sessions'] }, spaces: ['*'] },
  ],
};

// As an interactive user: on Serverless that is a UIAM user, who may not read their own
// privileges, unlike the operator user behind `kbnClient`.
apiTest.describe('Enabling Digital Experience sessions', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
  });

  apiTest.afterAll(async ({ apiServices, esClient }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    await deleteSessionsData(esClient);
  });

  apiTest('enables sessions for an admin', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const response = await apiClient.post(SESSIONS_ENABLE_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ installed: true });
  });

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
});
