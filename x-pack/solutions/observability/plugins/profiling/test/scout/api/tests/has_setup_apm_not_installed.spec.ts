/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { apiTest } from '../../common/fixtures';
import { esResourcesEndpoint } from '../../common/fixtures/constants';

// Failing: See https://github.com/elastic/kibana/issues/253221
apiTest.describe.skip(
  'APM integration not installed but setup completed',
  { tag: tags.stateful.classic },
  () => {
    let viewerApiCreditials: RoleApiCredentials;
    let adminApiCreditials: RoleApiCredentials;

    apiTest.beforeAll(async ({ profilingHelper, profilingSetup, esClient, requestAuth }) => {
      // Ensure the agent policy that the cloud setup attaches the profiler_collector and
      // profiler_symbolizer package policies to exists. Without this, setupResources()
      // returns 500 when this spec runs ahead of (or independently of) has_no_setup.spec.
      await profilingHelper.installPolicies();

      if (!(await profilingSetup.checkStatus()).has_setup) {
        await profilingSetup.setupResources();
      }

      // Remove any profiling data left by other specs (e.g. has_setup_with_data) so
      // has_data evaluates to false regardless of test execution order.
      // Best-effort: shards of freshly-created profiling data-streams may still be
      // initialising after setup, causing `search_phase_execution_exception`.  If the
      // delete fails for that reason there is no data to remove anyway.
      try {
        await esClient.deleteByQuery({
          index: 'profiling-events-*',
          query: { match_all: {} },
          ignore_unavailable: true,
          refresh: true,
        });
      } catch (e) {
        if (!String(e).includes('search_phase_execution_exception')) {
          throw e;
        }
      }

      viewerApiCreditials = await requestAuth.getApiKey('viewer');
      adminApiCreditials = await requestAuth.getApiKey('admin');
    });

    apiTest('Admin user', async ({ apiClient }) => {
      const adminRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...adminApiCreditials.apiKeyHeader,
          'content-type': 'application/json',
          'kbn-xsrf': 'reporting',
        },
      });

      const adminStatus = adminRes.body;
      expect(adminStatus.has_setup).toBe(true);
      expect(adminStatus.has_data).toBe(false);
      expect(adminStatus.pre_8_9_1_data).toBe(false);
    });

    apiTest('Viewer user', async ({ apiClient }) => {
      const readRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...viewerApiCreditials.apiKeyHeader,
          'content-type': 'application/json',
          'kbn-xsrf': 'reporting',
        },
      });

      const readStatus = readRes.body;
      expect(readStatus.has_setup).toBe(true);
      expect(readStatus.has_data).toBe(false);
      expect(readStatus.pre_8_9_1_data).toBe(false);
      expect(readStatus.has_required_role).toBe(false);
    });
  }
);
