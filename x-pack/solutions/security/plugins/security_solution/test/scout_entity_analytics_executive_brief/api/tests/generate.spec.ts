/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { INTERNAL_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  BRIEF_JOB_DEADLINE_MS,
  EXECUTIVE_BRIEF_API_PATH,
  EXECUTIVE_BRIEF_INDEX,
} from '../../../../common/entity_analytics/executive_brief/constants';
import { BRIEF_SIGNAL_IDS, EXECUTIVE_BRIEF_TAGS } from '../fixtures/constants';
import { apiTest } from '../fixtures';
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
      headers = cookieHeader;
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
      async ({ entityAnalyticsApi }) => {
        const response = await entityAnalyticsApi.generateExecutiveBrief(
          { body: { range: '7d', connectorId } },
          { headers }
        );
        expect(response).toHaveStatusCode(200);

        const jobId = response.body.id;
        const document = await waitForBriefJob({ entityAnalyticsApi, headers, jobId });
        expect(document.job).toMatchObject({ id: jobId, status: 'succeeded' });
        expect(document.job.took).toBeGreaterThanOrEqual(0);
        expect(document.report).toStrictEqual({ entities: {}, facts: [] });
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
        const status = await entityAnalyticsApi.getExecutiveBriefStatus({ headers });
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

    apiTest(
      'rejects an unknown connector before starting a job',
      async ({ entityAnalyticsApi }) => {
        const response = await entityAnalyticsApi.generateExecutiveBrief(
          { body: { range: '7d', connectorId: 'executive-brief-missing-connector' } },
          { headers }
        );
        expect(response).toHaveStatusCode(400);
        expect(response.body).toMatchObject({ attributes: { code: 'no_connector' } });

        const read = await entityAnalyticsApi.getExecutiveBrief({ headers });
        expect(read).toHaveStatusCode(404);
        const status = await entityAnalyticsApi.getExecutiveBriefStatus({ headers });
        expect(status).toHaveStatusCode(404);
      }
    );

    apiTest('rejects an invalid range', async ({ apiClient }) => {
      // The generated client only accepts valid bodies.
      const response = await apiClient.post(EXECUTIVE_BRIEF_API_PATH, {
        headers: { 'kbn-xsrf': 'scout', ...INTERNAL_API_HEADERS, ...headers },
        responseType: 'json',
        body: { range: '1y', connectorId },
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('DELETE removes the caller brief', async ({ entityAnalyticsApi }) => {
      await generateBrief({ entityAnalyticsApi, headers, connectorId });

      const deleted = await entityAnalyticsApi.deleteExecutiveBrief({ headers });
      expect(deleted).toHaveStatusCode(200);
      expect(deleted.body).toStrictEqual({ deleted: true });

      const read = await entityAnalyticsApi.getExecutiveBrief({ headers });
      expect(read).toHaveStatusCode(404);

      const deletedAgain = await entityAnalyticsApi.deleteExecutiveBrief({ headers });
      expect(deletedAgain.body).toStrictEqual({ deleted: false });
    });

    apiTest(
      'a running job past its deadline reads as interrupted',
      async ({ apiClient, entityAnalyticsApi, esClient }) => {
        const { jobId } = await generateBrief({ entityAnalyticsApi, headers, connectorId });
        const { docId } = await getBriefDocId({ apiClient, headers, spaceId: 'default' });
        const startedAt = new Date(Date.now() - BRIEF_JOB_DEADLINE_MS - 60_000).toISOString();

        await esClient.update({
          index: EXECUTIVE_BRIEF_INDEX,
          id: docId,
          doc: {
            job: { id: jobId, status: 'running', startedAt, updatedAt: startedAt },
          },
          refresh: true,
        });

        const read = await entityAnalyticsApi.getExecutiveBrief({ headers });
        expect(read).toHaveStatusCode(200);
        // `took` runs to the last stage change, here the start.
        expect(read.body.job).toMatchObject({
          id: jobId,
          status: 'failed',
          took: 0,
          error: { code: 'interrupted' },
        });

        const status = await entityAnalyticsApi.getExecutiveBriefStatus({ headers });
        expect(status.body).toStrictEqual(read.body.job);
      }
    );
  }
);
