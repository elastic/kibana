/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HuntIndexScopeResponse,
  HuntWorkerIndexCoverageResponse,
} from '@kbn/alertzero-common';
import { HUNT_INDEX_SCOPE_URL, HUNT_WORKER_INDEX_COVERAGE_URL } from '@kbn/alertzero-common';
import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
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
// Flat world: origin plus every linked project (`PROJECT_ROUTING.ALL` in `@kbn/cps-common`). A space
// with origin-only routing cannot resolve a `<project>:<pattern>` expression: the resolve fails
// with `no_matching_project_exception` and the hunt scope stays blocked.
const PROJECT_ROUTING_ALL = '_alias:*';
const HUNT_ROLE_NAME = '_alertzero_threat_hunt';

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
      // Both names match the `logs-*-*` template and become data streams.
      await linkedProject.esClient.index({
        index: LINKED_STREAM,
        document: document(),
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
        {
          name: 'delete the custom index',
          run: () => esClient.indices.delete({ index: CUSTOM_INDEX, ignore_unavailable: true }),
        },
      ]);
    });

    // Known limitation, pinned here so a fix has to update it: the Hunt resolve uses the plain
    // current-user client, which sends no project routing, so a `<project>:<pattern>` expression
    // cannot match the linked project even in a space whose routing includes it. The scope stays
    // blocked and the worker coverage answers `unavailable` / `discovery_failed`.
    apiTest(
      'cannot yet resolve a linked project pattern through index_scope',
      async ({ apiClient }) => {
        await setDefaultIndexInSpace({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE,
          patterns: ['logs-*', LINKED_PATTERN],
        });

        const response = await apiClient.get(spaceUrl(HUNT_INDEX_SCOPE_URL, SPACE), {
          headers: adminHeaders,
          responseType: 'json',
        });
        const coverage = await apiClient.get(spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, SPACE), {
          headers: adminHeaders,
          responseType: 'json',
        });
        await setDefaultIndexInSpace({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE,
          patterns: ['logs-*', CUSTOM_PATTERN],
        });

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
