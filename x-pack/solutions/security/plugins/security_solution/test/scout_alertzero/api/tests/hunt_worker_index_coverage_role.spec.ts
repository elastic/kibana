/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntWorkerIndexCoverageResponse } from '@kbn/alertzero-common';
import { HUNT_WORKER_INDEX_COVERAGE_URL } from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/api';
import {
  ALERTZERO_READ_NO_SECURITY_ROLE,
  ALERTZERO_READ_ONLY_ROLE,
  apiTest,
  enableAlertZeroInSpace,
  runCleanupSteps,
  setDefaultIndexInSpace,
  spaceUrl,
  tags,
  withHuntHeaders,
} from '../fixtures';

const RUN = Date.now();
const SPACE = `hunt-cov-role-${RUN}`;
const LOGS_STREAM = `logs-scout-${RUN}`;
const CUSTOM_PATTERN = `custom-edr-a-${RUN}-*`;
const CUSTOM_INDEX = `custom-edr-a-${RUN}-1`;

const document = () => ({ '@timestamp': new Date().toISOString(), message: 'scout' });

/**
 * The Hunt worker's index coverage route, role path (the worker has never run), against the
 * shipped `alertzero_threat_hunt` role and a live `_resolve/index`: a change to the role or to
 * the glob logic that breaks the contract fails CI rather than a manual run.
 *
 * No assertion says the role covers a CCS pattern. That depends on the Elasticsearch build
 * carrying the remote grant, which this suite cannot assume; the stateful cluster here has no
 * remote configured, so `alias:pattern` is only used for the discovery_failed case.
 */
apiTest.describe(
  'Hunt Watch - worker index coverage, role path',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient, esClient }) => {
      await apiServices.spaces.create({ id: SPACE, name: SPACE });
      await apiServices.spaces.setSolutionView({ id: SPACE, solution: 'security' });
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = withHuntHeaders(cookieHeader);
      await enableAlertZeroInSpace({ apiClient, headers: adminHeaders, spaceId: SPACE });
      // A fresh Scout cluster has no `logs-*` data stream; the name matches the `logs-*-*` template.
      await esClient.index({ index: LOGS_STREAM, document: document(), refresh: true });
      await setDefaultIndexInSpace({
        apiClient,
        headers: adminHeaders,
        spaceId: SPACE,
        patterns: ['logs-*', CUSTOM_PATTERN],
      });
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await runCleanupSteps([
        { name: `delete space ${SPACE}`, run: () => apiServices.spaces.delete(SPACE) },
        {
          name: 'delete the logs data stream',
          run: () => esClient.indices.deleteDataStream({ name: LOGS_STREAM }),
        },
        {
          name: 'delete the custom index',
          run: () => esClient.indices.delete({ index: CUSTOM_INDEX, ignore_unavailable: true }),
        },
      ]);
    });

    apiTest('reads the role for an admin', async ({ apiClient }) => {
      const response = await apiClient.get(spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, SPACE), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body as HuntWorkerIndexCoverageResponse).toMatchObject({
        source: 'role',
        role_name: 'alertzero_threat_hunt',
        service_account_id: null,
        unreadable_by_worker: [],
        missing_for_everyone: [CUSTOM_PATTERN],
      });
    });

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

    apiTest(
      'is role_unreadable for a caller without read_security',
      async ({ samlAuth, apiClient, esClient }) => {
        await esClient.index({ index: CUSTOM_INDEX, document: document(), refresh: true });
        const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTZERO_READ_NO_SECURITY_ROLE);

        const response = await apiClient.get(spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, SPACE), {
          headers: withHuntHeaders(cookieHeader),
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body as HuntWorkerIndexCoverageResponse).toMatchObject({
          source: 'unavailable',
          unavailable_reason: 'role_unreadable',
          unreadable_by_worker: [],
          missing_for_everyone: [],
        });
      }
    );

    apiTest(
      'is caller_unreadable for a caller with no index privileges',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTZERO_READ_ONLY_ROLE);

        const response = await apiClient.get(spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, SPACE), {
          headers: withHuntHeaders(cookieHeader),
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body as HuntWorkerIndexCoverageResponse).toMatchObject({
          source: 'unavailable',
          unavailable_reason: 'caller_unreadable',
          unreadable_by_worker: [],
          missing_for_everyone: [],
        });
      }
    );

    apiTest(
      'is discovery_failed when a pattern names a remote that is not configured',
      async ({ apiClient }) => {
        const universe = ['logs-*', 'nope_remote:logs-*'];
        await setDefaultIndexInSpace({
          apiClient,
          headers: adminHeaders,
          spaceId: SPACE,
          patterns: universe,
        });

        const response = await apiClient.get(spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, SPACE), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body as HuntWorkerIndexCoverageResponse).toMatchObject({
          source: 'unavailable',
          unavailable_reason: 'discovery_failed',
          missing_for_everyone: universe,
          unreadable_by_worker: [],
        });
      }
    );
  }
);
