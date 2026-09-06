/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import {
  LIST_SOURCES_API_PATH,
  SOURCE_BY_ID_API_PATH,
  THREAT_INTEL_INDICATORS_INDEX,
} from '../../../../../common/threat_intel';
import { apiTest, tags, testData, SECURITY_READ_ONLY_ROLE } from '../fixtures';

interface ListSourcesResponse {
  total: number;
  sources: Array<{
    id: string;
    enabled: boolean;
    report_count: number;
    env_hits_total: number;
    url?: string;
  }>;
}

/**
 * `list_sources` and `update_source` carry two guarantees that unit tests with a
 * mocked ES client structurally cannot prove:
 *
 *  1. The read/write authz split is *enforced* by Kibana, not merely declared on
 *     the route config. A Jest test asserts the object literal; only a real
 *     request as a read-only Security user shows a 403.
 *  2. `ensureIndicatorAliasForSpace` is memoized in a module-level Set, so its
 *     behavior across two sequential requests is the actual contract. Every Jest
 *     test gets a fresh module and therefore always exercises the cold path.
 */
apiTest.describe('Threat Intel - source catalog API', { tag: [...tags.stateful.classic] }, () => {
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...testData.TI_HEADERS, ...cookieHeader };
  });

  apiTest(
    'returns the source catalog and creates the space-filtered indicator alias',
    async ({ apiClient, esClient }) => {
      const res = await apiClient.post(LIST_SOURCES_API_PATH, {
        headers: adminHeaders,
        responseType: 'json',
        body: {},
      });

      expect(res).toHaveStatusCode(200);
      const body = res.body as ListSourcesResponse;
      expect(Array.isArray(body.sources)).toBe(true);
      expect(body.total).toBe(body.sources.length);

      // The route ensures the per-space filtered alias on first read. Assert the
      // filter too: an unfiltered alias would expose every space's indicators at
      // every confidence tier to Indicator Match rules.
      const aliasName = `${THREAT_INTEL_INDICATORS_INDEX}-default`;
      const aliases = await esClient.indices.getAlias({ name: aliasName });
      const entry = Object.values(aliases)[0] as {
        aliases: Record<string, { filter?: Record<string, unknown> }>;
      };
      const filter = entry.aliases[aliasName]?.filter;
      expect(filter).toBeDefined();
      expect(JSON.stringify(filter)).toContain('space_id');
      expect(JSON.stringify(filter)).toContain('ioc_tier');
    }
  );

  apiTest('stays consistent on a second call once the alias is memoized', async ({ apiClient }) => {
    // The first call may take the cold path; the second must hit the memoized
    // path and return the same catalog rather than skipping the alias work in a
    // way that changes the response.
    const first = await apiClient.post(LIST_SOURCES_API_PATH, {
      headers: adminHeaders,
      responseType: 'json',
      body: {},
    });
    const second = await apiClient.post(LIST_SOURCES_API_PATH, {
      headers: adminHeaders,
      responseType: 'json',
      body: {},
    });

    expect(first).toHaveStatusCode(200);
    expect(second).toHaveStatusCode(200);

    const firstBody = first.body as ListSourcesResponse;
    const secondBody = second.body as ListSourcesResponse;
    expect(secondBody.total).toBe(firstBody.total);
    expect(secondBody.sources.map((s) => s.id).sort()).toStrictEqual(
      firstBody.sources.map((s) => s.id).sort()
    );
  });

  apiTest('returns 404 when updating a source that does not exist', async ({ apiClient }) => {
    const res = await apiClient.patch(
      SOURCE_BY_ID_API_PATH.replace('{sourceId}', 'does-not-exist-source'),
      {
        headers: adminHeaders,
        responseType: 'json',
        body: { enabled: false },
      }
    );

    expect(res).toHaveStatusCode(404);
    expect((res.body as { message: string }).message).toContain('not found');
  });

  apiTest(
    'denies a read-only Security user write access to the source catalog',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(SECURITY_READ_ONLY_ROLE);
      const readOnlyHeaders = {
        ...testData.TI_HEADERS,
        ...cookieHeader,
      };

      // Read is allowed for this role: it holds the base `securitySolution`
      // privilege that THREAT_INTEL_READ_AUTHZ requires.
      const readRes = await apiClient.post(LIST_SOURCES_API_PATH, {
        headers: readOnlyHeaders,
        responseType: 'json',
        body: {},
      });
      expect(readRes).toHaveStatusCode(200);

      // Write must be refused: THREAT_INTEL_WRITE_AUTHZ additionally requires
      // RULES_API_ALL, because writing here changes detection behavior.
      const writeRes = await apiClient.patch(
        SOURCE_BY_ID_API_PATH.replace('{sourceId}', 'any-source'),
        {
          headers: readOnlyHeaders,
          responseType: 'json',
          body: { enabled: false },
        }
      );
      expect(writeRes).toHaveStatusCode(403);
    }
  );
});
