/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, KIBANA_HEADERS } from '../../../common/fixtures';

/**
 * Ported from FTR
 * `x-pack/solutions/observability/test/api_integration/apis/security/api_keys.ts`.
 *
 * Verifies a privileged user can create an API key whose role descriptors carry
 * the synthetics-service Elasticsearch privileges plus the uptime feature. Drives
 * the *internal* security route, so it uses cookie-based auth
 * (`samlAuth.asInteractiveUser('admin')` + `KIBANA_HEADERS`), matching the
 * `synthetics_enablement` spec.
 *
 * The Elasticsearch privileges mirror `getServiceApiKeyPrivileges(false)` from
 * `@kbn/synthetics-plugin/server/synthetics_service/get_api_key`; we inline them
 * here (and use `'*'` for `ALL_SPACES_ID`) to avoid importing across the plugin
 * server boundary, matching the local-constants convention in this Scout suite.
 *
 * `read_ilm` is only requested on stateful, mirroring `getServiceApiKeyPrivileges`, which
 * omits it when Elasticsearch is serverless (ILM isn't available there).
 */

const getServiceEsPrivileges = (isServerless: boolean) => ({
  cluster: isServerless ? ['monitor', 'read_pipeline'] : ['monitor', 'read_pipeline', 'read_ilm'],
  indices: [
    {
      names: ['synthetics-*'],
      privileges: ['view_index_metadata', 'create_doc', 'auto_configure', 'read'],
    },
  ],
  run_as: [],
});

apiTest.describe(
  'ApiKeys',
  { tag: [...tags.local.stateful.classic, ...tags.local.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...KIBANA_HEADERS, ...cookieHeader };
    });

    apiTest(
      '[POST] internal/security/api_key allows an API key to be created with kibana privileges',
      async ({ apiClient, config }) => {
        const res = await apiClient.post('internal/security/api_key', {
          headers: adminHeaders,
          body: {
            name: 'test_api_key',
            expiration: '12d',
            kibana_role_descriptors: {
              uptime_save: {
                elasticsearch: getServiceEsPrivileges(config.serverless),
                kibana: [
                  {
                    base: [],
                    spaces: ['*'],
                    feature: {
                      uptime: ['all'],
                    },
                  },
                ],
              },
            },
          },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body).toMatchObject({ name: 'test_api_key' });
      }
    );
  }
);
