/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { GenerateBriefResponse } from '../../../../common/entity_analytics/executive_brief/api';
import {
  BRIEF_ROUTE,
  EXECUTIVE_BRIEF_TAGS,
  HIGH_RISK_ENTITY_BRIEF,
  INTERNAL_HEADERS,
  SEEDED_ENTITY,
  SUBMIT_BRIEF_TOOL_NAME,
} from '../fixtures/constants';
import {
  createBriefConnector,
  deleteAllBriefs,
  deleteBriefConnector,
  deleteSeededEntities,
  holdSubmitBrief,
  mockSubmitBrief,
  seedHighRiskEntity,
  waitForBriefJob,
} from '../fixtures/brief_helpers';

apiTest.describe(
  'Executive brief - composing a brief from findings',
  { tag: EXECUTIVE_BRIEF_TAGS },
  () => {
    let headers: Record<string, string>;
    let connectorId: string;
    let llmProxy: LlmProxy;

    apiTest.beforeAll(async ({ apiServices, samlAuth, esClient, log }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...INTERNAL_HEADERS, ...cookieHeader };
      ({ connectorId, llmProxy } = await createBriefConnector({ apiServices, log }));
      await seedHighRiskEntity(esClient);
    });

    apiTest.beforeEach(async ({ esClient }) => {
      await deleteAllBriefs(esClient);
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await deleteAllBriefs(esClient);
      await deleteSeededEntities(esClient);
      await deleteBriefConnector({ apiServices, connectorId, llmProxy });
    });

    apiTest(
      'generates a verified brief through the LLM and stores it for the caller',
      async ({ apiClient }) => {
        const llmCall = mockSubmitBrief(llmProxy);

        const response = await apiClient.post<GenerateBriefResponse>(BRIEF_ROUTE, {
          headers,
          responseType: 'json',
          body: { range: '7d', connectorId },
        });
        expect(response).toHaveStatusCode(202);
        expect(response.body.job.id).toBeDefined();
        expect(response.body).toMatchObject({ job: { status: 'pending' }, reused: false });

        const jobId = response.body.job.id;
        const document = await waitForBriefJob({ apiClient, headers, jobId });
        await llmCall;

        expect(document.generation).toMatchObject({ jobId, status: 'succeeded' });
        expect(document.report?.period.range).toBe('7d');
        expect(document.report?.verdict).toStrictEqual(HIGH_RISK_ENTITY_BRIEF.verdict);
        expect(document.report?.areas).toStrictEqual(HIGH_RISK_ENTITY_BRIEF.areas);
        expect(document.provenance).toMatchObject({
          connectorId,
          verification: { lowered: 0, repaired: false },
        });
        // Entities are Entity Store records keyed by EUID; facts reference them by EUID.
        expect(Object.keys(document.provenance?.entities ?? {})).toStrictEqual([SEEDED_ENTITY.id]);
        expect(document.provenance?.entities[SEEDED_ENTITY.id]).toMatchObject({
          entity: {
            id: SEEDED_ENTITY.id,
            name: SEEDED_ENTITY.name,
            risk: { calculated_level: SEEDED_ENTITY.riskLevel },
          },
        });
        expect(document.provenance?.facts).toStrictEqual([
          expect.objectContaining({
            id: 'F-1',
            kind: 'high_risk_entity',
            severity: 'high',
            entities: [SEEDED_ENTITY.id],
          }),
        ]);

        // One LLM call, with the brief tool forced.
        expect(llmProxy.interceptedRequests).toHaveLength(1);
        expect(llmProxy.interceptedRequests[0].requestBody.tool_choice).toMatchObject({
          function: { name: SUBMIT_BRIEF_TOOL_NAME },
        });
      }
    );

    apiTest('returns the running job instead of starting a second one', async ({ apiClient }) => {
      const held = holdSubmitBrief(llmProxy);

      const first = await apiClient.post<GenerateBriefResponse>(BRIEF_ROUTE, {
        headers,
        responseType: 'json',
        body: { range: '7d', connectorId },
      });
      expect(first).toHaveStatusCode(202);

      const second = await apiClient.post<GenerateBriefResponse>(BRIEF_ROUTE, {
        headers,
        responseType: 'json',
        body: { range: '24h', connectorId },
      });
      expect(second).toHaveStatusCode(202);
      expect(second.body).toMatchObject({ job: { id: first.body.job.id }, reused: true });

      await held.release();
      const document = await waitForBriefJob({ apiClient, headers, jobId: first.body.job.id });
      expect(document.generation.status).toBe('succeeded');
      expect(document.report?.period.range).toBe('7d');
      expect(llmProxy.interceptedRequests).toHaveLength(1);
    });
  }
);
