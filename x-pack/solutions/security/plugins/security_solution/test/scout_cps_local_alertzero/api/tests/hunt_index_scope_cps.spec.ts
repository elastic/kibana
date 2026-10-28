/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HuntForThreatResponse,
  HuntIndexScopeResponse,
  HuntWorkerIndexCoverageResponse,
} from '@kbn/alertzero-common';
import { HUNT_INDEX_SCOPE_URL, HUNT_WORKER_INDEX_COVERAGE_URL } from '@kbn/alertzero-common';
import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  HUNT_FOR_THREAT_URL,
  enableAlertZeroInSpace,
  runCleanupSteps,
  setDefaultIndexInSpace,
  spaceUrl,
  withHuntHeaders,
} from '../../../scout_alertzero/api/fixtures';

const RUN = Date.now();
const LINKED_ALIAS = 'linked_local_project';
const LINKED_STREAM = `logs-cps-hunt-${RUN}`;
const ORIGIN_STREAM = `logs-cps-hunt-origin-${RUN}`;
const LINKED_PATTERN = `${LINKED_ALIAS}:logs-cps-hunt-*`;
const CUSTOM_PATTERN = `custom-edr-cps-${RUN}-*`;
const CUSTOM_INDEX = `custom-edr-cps-${RUN}-1`;
const SPACE = `hunt-cps-${RUN}`;
const ORIGIN_SPACE = `hunt-cps-origin-${RUN}`;
// The Hunt routes read with the space's project routing, so the space setting decides what a
// `<project>:<pattern>` expression can reach. Flat world (`PROJECT_ROUTING.ALL` in
// `@kbn/cps-common`) is origin plus every linked project; origin-only cannot resolve the
// expression and the resolve fails with `no_matching_project_exception`.
const PROJECT_ROUTING_ALL = '_alias:*';
const PROJECT_ROUTING_ORIGIN_ONLY = '_alias:_origin';
const HUNT_ROLE_NAME = '_alertzero_threat_hunt';
// TEST-NET-3, never routable; only the linked document carries it.
const LINKED_IOC_IP = '203.0.113.7';

const document = () => ({ '@timestamp': new Date().toISOString(), message: 'scout' });

/**
 * Not covered here, both left to manual checks on QA projects:
 * - The sweep path (the worker itself reading across projects): the local UIAM mock refuses the
 *   service account token exchange (HTTP 403), so the Hunt worker cannot run on this stack.
 * - Rule Tuning and Rule Coverage reading a linked project: Scout cannot create an API key from the
 *   built-in `_alertzero_rule_*` descriptors (a role descriptor parse error), and the Kibana search
 *   routes answer 404 for those sessions.
 *
 * D5: on Serverless, cross-project search authorizes per project with the account's role
 * assignments, so a `<project>:<pattern>` expression needs no `remote_indices` grant. Runs on the
 * two-cluster CPS stack (origin + linked ES, UIAM). The built-in `_alertzero_*` roles are readable
 * through `GET /api/security/role/{name}` there (probed 2026-10-28: 200, reserved), so the role
 * path of the coverage route answers `source: 'role'`.
 */
apiTest.describe.serial(
  'Hunt Watch - index scope and worker coverage across projects',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient, esClient, linkedProject }) => {
      await apiServices.spaces.create({
        id: SPACE,
        name: SPACE,
        projectRouting: PROJECT_ROUTING_ALL,
      });
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = withHuntHeaders(cookieHeader);
      await enableAlertZeroInSpace({ apiClient, headers: adminHeaders, spaceId: SPACE });
      await apiServices.spaces.create({
        id: ORIGIN_SPACE,
        name: ORIGIN_SPACE,
        projectRouting: PROJECT_ROUTING_ORIGIN_ONLY,
      });
      await enableAlertZeroInSpace({ apiClient, headers: adminHeaders, spaceId: ORIGIN_SPACE });
      await setDefaultIndexInSpace({
        apiClient,
        headers: adminHeaders,
        spaceId: ORIGIN_SPACE,
        patterns: ['logs-*', LINKED_PATTERN],
      });
      // Both names match the `logs-*-*` template and become data streams.
      await linkedProject.esClient.index({
        index: LINKED_STREAM,
        document: { ...document(), source: { ip: LINKED_IOC_IP } },
        refresh: true,
      });
      await esClient.index({ index: ORIGIN_STREAM, document: document(), refresh: true });
      await setDefaultIndexInSpace({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE,
        patterns: ['logs-*', CUSTOM_PATTERN],
      });
    });

    apiTest.afterAll(async ({ apiServices, apiClient, esClient, linkedProject }) => {
      await runCleanupSteps([
        {
          name: 'clear the default index',
          run: () =>
            setDefaultIndexInSpace({
              apiClient,
              headers: adminHeaders,
              spaceId: SPACE,
              patterns: undefined,
            }),
        },
        {
          name: 'delete the linked data stream',
          run: () => linkedProject.esClient.indices.deleteDataStream({ name: LINKED_STREAM }),
        },
        {
          name: 'delete the origin data stream',
          run: () => esClient.indices.deleteDataStream({ name: ORIGIN_STREAM }),
        },
        { name: `delete space ${SPACE}`, run: () => apiServices.spaces.delete(SPACE) },
        // Deleting the space deletes its space-scoped config saved object with it.
        {
          name: `delete space ${ORIGIN_SPACE}`,
          run: () => apiServices.spaces.delete(ORIGIN_SPACE),
        },
        {
          name: 'delete the custom index',
          run: () => esClient.indices.delete({ index: CUSTOM_INDEX, ignore_unavailable: true }),
        },
      ]);
    });

    // The Hunt routes scope their Elasticsearch client with the space's project routing, so a
    // `<project>:<pattern>` expression resolves in a space whose routing includes that project.
    apiTest(
      'resolves a linked project pattern through index_scope when the space routes to it',
      async ({ apiClient }) => {
        await setDefaultIndexInSpace({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE,
          patterns: ['logs-*', LINKED_PATTERN],
        });
        try {
          const response = await apiClient.get(spaceUrl(HUNT_INDEX_SCOPE_URL, SPACE), {
            headers: adminHeaders,
            responseType: 'json',
          });
          const coverage = await apiClient.get(spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, SPACE), {
            headers: adminHeaders,
            responseType: 'json',
          });

          const scope = response.body as HuntIndexScopeResponse;
          expect(scope).toMatchObject({ status: 'ok', resolution: 'universe', missing: [] });
          expect(scope.index_patterns).toContain(LINKED_PATTERN);
          const coverageBody = coverage.body as HuntWorkerIndexCoverageResponse;
          expect(coverageBody).toMatchObject({ source: 'role', missing_for_everyone: [] });
          expect(coverageBody.unreadable_by_worker).not.toContain(LINKED_PATTERN);
        } finally {
          // Never leave the linked pattern behind for the role-coverage tests below.
          await setDefaultIndexInSpace({
            apiClient,
            headers: adminHeaders,
            spaceId: SPACE,
            patterns: ['logs-*', CUSTOM_PATTERN],
          });
        }
      }
    );

    // The fix honours the space setting rather than fanning out everywhere: with origin-only
    // routing the resolve still fails with `no_matching_project_exception`.
    apiTest(
      'cannot resolve a linked project pattern in a space routed to the origin only',
      async ({ apiClient }) => {
        const response = await apiClient.get(spaceUrl(HUNT_INDEX_SCOPE_URL, ORIGIN_SPACE), {
          headers: adminHeaders,
          responseType: 'json',
        });
        const coverage = await apiClient.get(
          spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, ORIGIN_SPACE),
          { headers: adminHeaders, responseType: 'json' }
        );

        expect(response.body as HuntIndexScopeResponse).toMatchObject({
          status: 'blocked',
          resolution: 'blocked:discovery_failed',
        });
        expect(coverage.body as HuntWorkerIndexCoverageResponse).toMatchObject({
          source: 'unavailable',
          unavailable_reason: 'discovery_failed',
        });
      }
    );

    // The search path, not only the resolve, reads the linked project. The universe is the
    // linked pattern alone: an unqualified `logs-*` in a flat-world space fans out to the linked
    // project too and would find the document on its own.
    apiTest('finds a Tier 1 IOC hit on the linked project', async ({ apiClient }) => {
      await setDefaultIndexInSpace({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE,
        patterns: [LINKED_PATTERN],
      });
      try {
        const response = await apiClient.post(spaceUrl(HUNT_FOR_THREAT_URL, SPACE), {
          headers: adminHeaders,
          responseType: 'json',
          body: {
            iocs: [{ type: 'ip', value: LINKED_IOC_IP }],
            time_range: { from: 'now-1h', to: 'now' },
          },
        });

        expect(response.statusCode).toBe(200);
        const { result } = response.body as HuntForThreatResponse;
        expect(result).toMatchObject({ status: 'environment_hits_found', has_confirmed_hit: true });
        const linkedIndices = result.per_index
          .map(({ index }) => index)
          .filter((index) => index.startsWith(`${LINKED_ALIAS}:`));
        expect(linkedIndices).not.toHaveLength(0);
        expect(linkedIndices.every((index) => index.includes(LINKED_STREAM))).toBe(true);
        expect(result.per_index.some(({ index }) => index.includes(ORIGIN_STREAM))).toBe(false);
        expect(result.hits[0].index.startsWith(`${LINKED_ALIAS}:`)).toBe(true);
        expect(result.hits[0]).toMatchObject({
          matched: { field: 'source.ip', ioc: { type: 'ip', value: LINKED_IOC_IP } },
        });
      } finally {
        await setDefaultIndexInSpace({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE,
          patterns: ['logs-*', CUSTOM_PATTERN],
        });
      }
    });

    apiTest(
      'answers worker coverage from the role for the built-in Serverless role',
      async ({ apiClient }) => {
        const response = await apiClient.get(spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, SPACE), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body as HuntWorkerIndexCoverageResponse).toMatchObject({
          source: 'role',
          role_name: HUNT_ROLE_NAME,
          is_serverless: true,
          service_account_id: null,
          missing_for_everyone: [CUSTOM_PATTERN],
        });
      }
    );

    apiTest(
      'lists a custom pattern with data that the built-in role cannot read',
      async ({ apiClient, esClient }) => {
        await esClient.index({ index: CUSTOM_INDEX, document: document(), refresh: true });

        const response = await apiClient.get(spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, SPACE), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response.body as HuntWorkerIndexCoverageResponse).toMatchObject({
          unreadable_by_worker: [CUSTOM_PATTERN],
          missing_for_everyone: [],
        });
      }
    );
  }
);
