/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type {
  BriefResponse,
  BriefStatusResponse,
  GenerateBriefResponse,
} from '../../../../common/entity_analytics/executive_brief/api';
import {
  BRIEF_STALE_HEARTBEAT_MS,
  EXECUTIVE_BRIEF_INDEX,
} from '../../../../common/entity_analytics/executive_brief/constants';
import {
  BRIEF_ROUTE,
  BRIEF_SIGNAL_IDS,
  EXECUTIVE_BRIEF_TAGS,
  INTERNAL_HEADERS,
  briefStatusRoute,
} from '../fixtures/constants';
import {
  createBriefConnector,
  deleteAllBriefs,
  deleteBriefConnector,
  generateBrief,
  getBriefDocId,
  waitForBriefJob,
} from '../fixtures/brief_helpers';

apiTest.describe(
  'Executive brief - POST, GET and DELETE /internal/entity_analytics/executive_brief',
  { tag: EXECUTIVE_BRIEF_TAGS },
  () => {
    let headers: Record<string, string>;
    let connectorId: string;
    let llmProxy: LlmProxy;

    apiTest.beforeAll(async ({ apiServices, samlAuth, log }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...INTERNAL_HEADERS, ...cookieHeader };
      ({ connectorId, llmProxy } = await createBriefConnector({ apiServices, log }));
    });

    apiTest.beforeEach(async ({ esClient }) => {
      await deleteAllBriefs(esClient);
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await deleteAllBriefs(esClient);
      await deleteBriefConnector({ apiServices, connectorId, llmProxy });
    });

    apiTest(
      'with no findings, records what was checked without calling the LLM',
      async ({ apiClient }) => {
        const response = await apiClient.post<GenerateBriefResponse>(BRIEF_ROUTE, {
          headers,
          responseType: 'json',
          body: { range: '7d', connectorId },
        });
        expect(response).toHaveStatusCode(202);

        const jobId = response.body.job.id;
        const document = await waitForBriefJob({ apiClient, headers, jobId });
        expect(document.job).toMatchObject({ id: jobId, status: 'succeeded' });
        expect(document.job.took).toBeGreaterThanOrEqual(0);
        expect(document.report).toStrictEqual({ entities: {}, facts: [], links: [] });
        expect(document.metadata?.tokens).toBeUndefined();
        expect(document.metadata?.verification).toBeUndefined();
        // Signals are keyed by id, each with only its status and duration.
        const signals = document.metadata?.signals ?? {};
        expect(Object.keys(signals).sort()).toStrictEqual([...BRIEF_SIGNAL_IDS].sort());
        Object.values(signals).forEach((run) => {
          expect(Object.keys(run).sort()).toStrictEqual(['status', 'took']);
          expect(run.took).toBeGreaterThanOrEqual(0);
        });
        expect(llmProxy.interceptedRequests).toHaveLength(0);

        // The status route returns the same job, flat: no job, report or metadata keys.
        const status = await apiClient.get<BriefStatusResponse>(briefStatusRoute(), {
          headers,
          responseType: 'json',
        });
        expect(status).toHaveStatusCode(200);
        expect(Object.keys(status.body).sort()).toStrictEqual([
          'id',
          'startedAt',
          'status',
          'took',
          'updatedAt',
        ]);
        expect(status.body).toStrictEqual(document.job);
        expect(status.body).toMatchObject({ id: jobId, status: 'succeeded' });
      }
    );

    apiTest('rejects an unknown connector before starting a job', async ({ apiClient }) => {
      const response = await apiClient.post(BRIEF_ROUTE, {
        headers,
        responseType: 'json',
        body: { range: '7d', connectorId: 'executive-brief-missing-connector' },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.attributes).toMatchObject({ code: 'no_connector' });

      const read = await apiClient.get(BRIEF_ROUTE, { headers, responseType: 'json' });
      expect(read).toHaveStatusCode(404);
      const status = await apiClient.get(briefStatusRoute(), { headers, responseType: 'json' });
      expect(status).toHaveStatusCode(404);
    });

    apiTest('rejects an invalid range', async ({ apiClient }) => {
      const response = await apiClient.post(BRIEF_ROUTE, {
        headers,
        responseType: 'json',
        body: { range: '1y', connectorId },
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('DELETE removes the caller brief', async ({ apiClient }) => {
      await generateBrief({ apiClient, headers, connectorId });

      const deleted = await apiClient.delete(BRIEF_ROUTE, { headers, responseType: 'json' });
      expect(deleted).toHaveStatusCode(200);
      expect(deleted.body).toStrictEqual({ deleted: true });

      const read = await apiClient.get(BRIEF_ROUTE, { headers, responseType: 'json' });
      expect(read).toHaveStatusCode(404);

      const deletedAgain = await apiClient.delete(BRIEF_ROUTE, { headers, responseType: 'json' });
      expect(deletedAgain.body).toStrictEqual({ deleted: false });
    });

    apiTest(
      'a running job that stopped sending heartbeats reads as interrupted',
      async ({ apiClient, esClient }) => {
        const { jobId } = await generateBrief({ apiClient, headers, connectorId });
        const { docId } = await getBriefDocId({ apiClient, headers, spaceId: 'default' });
        const lastBeat = new Date(Date.now() - 2 * BRIEF_STALE_HEARTBEAT_MS).toISOString();

        await esClient.update({
          index: EXECUTIVE_BRIEF_INDEX,
          id: docId,
          doc: {
            job: { id: jobId, status: 'running', started_at: lastBeat, heartbeat_at: lastBeat },
          },
          refresh: true,
        });

        const read = await apiClient.get<BriefResponse>(BRIEF_ROUTE, {
          headers,
          responseType: 'json',
        });
        expect(read).toHaveStatusCode(200);
        // `took` runs to the last heartbeat, here the start.
        expect(read.body.job).toMatchObject({
          id: jobId,
          status: 'failed',
          took: 0,
          error: { code: 'interrupted' },
        });

        const status = await apiClient.get<BriefStatusResponse>(briefStatusRoute(), {
          headers,
          responseType: 'json',
        });
        expect(status.body).toStrictEqual(read.body.job);
      }
    );
  }
);
