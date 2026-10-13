/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { expect } from '@kbn/scout-security/api';
import type { Brief } from '../../../../common/api/entity_analytics/executive_brief/common.gen';
import {
  EXECUTIVE_BRIEF_TAGS,
  HIGH_RISK_ENTITY_BRIEF,
  SEEDED_ENTITY,
  SUBMIT_BRIEF_TOOL_NAME,
} from '../fixtures/constants';
import { apiTest } from '../fixtures';
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

/** A `clear` verdict below its `watch` assessment: a structural problem only the model can fix. */
const VERDICT_BELOW_ASSESSMENT_BRIEF: Brief = {
  ...HIGH_RISK_ENTITY_BRIEF,
  verdict: { ...HIGH_RISK_ENTITY_BRIEF.verdict, level: 'clear' },
};

apiTest.describe(
  'Executive brief - composing a brief from findings',
  { tag: EXECUTIVE_BRIEF_TAGS },
  () => {
    let headers: Record<string, string>;
    let connectorId: string;
    let llmProxy: LlmProxy;

    apiTest.beforeAll(async ({ apiServices, samlAuth, esClient, log }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = cookieHeader;
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
      async ({ entityAnalyticsApi }) => {
        const llmCall = mockSubmitBrief(llmProxy);

        const response = await entityAnalyticsApi.generateExecutiveBrief(
          { body: { range: '7d', connectorId } },
          { headers }
        );
        expect(response).toHaveStatusCode(200);
        expect(response.body.id).toBeDefined();
        expect(response.body.status).toBe('pending');

        const jobId = response.body.id;
        const document = await waitForBriefJob({ entityAnalyticsApi, headers, jobId });
        await llmCall;

        expect(document.job).toMatchObject({ id: jobId, status: 'succeeded' });
        expect(document.report?.verdict).toStrictEqual(HIGH_RISK_ENTITY_BRIEF.verdict);
        expect(document.report?.assessments).toStrictEqual(HIGH_RISK_ENTITY_BRIEF.assessments);
        expect(document.metadata).toMatchObject({
          period: { range: '7d' },
          connectorId,
          verification: { lowered: 0, repaired: false },
          signals: { high_risk_entities: { status: 'ok' } },
        });
        // Entities are Entity Store records keyed by EUID; facts reference them by EUID.
        expect(Object.keys(document.report?.entities ?? {})).toStrictEqual([SEEDED_ENTITY.id]);
        expect(document.report?.entities[SEEDED_ENTITY.id]).toMatchObject({
          entity: {
            id: SEEDED_ENTITY.id,
            name: SEEDED_ENTITY.name,
            risk: { calculated_level: SEEDED_ENTITY.riskLevel },
          },
        });
        expect(document.report?.facts).toStrictEqual([
          expect.objectContaining({
            id: 1,
            signalId: 'high_risk_entities',
            severity: 'high',
            entityIds: [SEEDED_ENTITY.id],
            source: { type: 'entity', id: SEEDED_ENTITY.id },
          }),
        ]);

        // One LLM call, with the brief tool forced.
        expect(llmProxy.interceptedRequests).toHaveLength(1);
        expect(llmProxy.interceptedRequests[0].requestBody.tool_choice).toMatchObject({
          function: { name: SUBMIT_BRIEF_TOOL_NAME },
        });
      }
    );

    apiTest(
      'a second POST replaces the job in progress, and the replaced run writes nothing',
      async ({ entityAnalyticsApi }) => {
        const replacedBrief: Brief = {
          ...HIGH_RISK_ENTITY_BRIEF,
          verdict: { ...HIGH_RISK_ENTITY_BRIEF.verdict, headline: 'From the replaced run' },
        };
        const held = holdSubmitBrief(llmProxy, replacedBrief);

        const first = await entityAnalyticsApi.generateExecutiveBrief(
          { body: { range: '7d', connectorId } },
          { headers }
        );
        expect(first).toHaveStatusCode(200);
        await held.waitForCall();

        // While the first job is in flight, its status has no duration yet.
        const inFlight = await entityAnalyticsApi.getExecutiveBriefStatus({ headers });
        expect(inFlight.body).toMatchObject({ id: first.body.id, status: 'running' });
        expect(inFlight.body.took).toBeUndefined();

        const secondCall = mockSubmitBrief(llmProxy);
        const second = await entityAnalyticsApi.generateExecutiveBrief(
          { body: { range: '24h', connectorId } },
          { headers }
        );
        expect(second).toHaveStatusCode(200);
        expect(second.body.id).not.toBe(first.body.id);

        const document = await waitForBriefJob({
          entityAnalyticsApi,
          headers,
          jobId: second.body.id,
        });
        await secondCall;
        expect(document.job.status).toBe('succeeded');
        expect(document.metadata?.period.range).toBe('24h');

        // The replaced run gets its answer now, finds the newer job at its next write, and stops.
        // Keep reading for a few seconds so a late write from it would be seen.
        await held.release();
        expect(llmProxy.interceptedRequests).toHaveLength(2);
        for (let read = 0; read < 6; read++) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const after = await waitForBriefJob({
            entityAnalyticsApi,
            headers,
            jobId: second.body.id,
          });
          expect(after.report?.verdict?.headline).toBe(HIGH_RISK_ENTITY_BRIEF.verdict.headline);
          expect(after.metadata?.period.range).toBe('24h');
        }
      }
    );

    apiTest(
      'sends a structural problem back to the model once and stores the repaired brief',
      async ({ entityAnalyticsApi }) => {
        mockSubmitBrief(llmProxy, VERDICT_BELOW_ASSESSMENT_BRIEF);
        mockSubmitBrief(llmProxy, HIGH_RISK_ENTITY_BRIEF);

        const response = await entityAnalyticsApi.generateExecutiveBrief(
          { body: { range: '7d', connectorId } },
          { headers }
        );
        expect(response).toHaveStatusCode(200);

        const document = await waitForBriefJob({
          entityAnalyticsApi,
          headers,
          jobId: response.body.id,
        });
        expect(document.job.status).toBe('succeeded');
        expect(document.report?.verdict).toStrictEqual(HIGH_RISK_ENTITY_BRIEF.verdict);
        expect(document.metadata?.verification?.repaired).toBe(true);

        // The repair answers the rejected tool call with the problems.
        expect(llmProxy.interceptedRequests).toHaveLength(2);
        const repairMessages = llmProxy.interceptedRequests[1].requestBody.messages;
        expect(repairMessages[repairMessages.length - 1]).toMatchObject({ role: 'tool' });
      }
    );

    apiTest(
      'fails with llm_output when the repaired brief is still invalid, keeping the previous brief',
      async ({ entityAnalyticsApi }) => {
        mockSubmitBrief(llmProxy, HIGH_RISK_ENTITY_BRIEF);
        const previous = await entityAnalyticsApi.generateExecutiveBrief(
          { body: { range: '7d', connectorId } },
          { headers }
        );
        expect(previous).toHaveStatusCode(200);
        const previousDocument = await waitForBriefJob({
          entityAnalyticsApi,
          headers,
          jobId: previous.body.id,
        });
        expect(previousDocument.job.status).toBe('succeeded');

        llmProxy.clear();
        mockSubmitBrief(llmProxy, VERDICT_BELOW_ASSESSMENT_BRIEF);
        mockSubmitBrief(llmProxy, VERDICT_BELOW_ASSESSMENT_BRIEF);
        const response = await entityAnalyticsApi.generateExecutiveBrief(
          { body: { range: '24h', connectorId } },
          { headers }
        );
        expect(response).toHaveStatusCode(200);

        const document = await waitForBriefJob({
          entityAnalyticsApi,
          headers,
          jobId: response.body.id,
        });
        expect(document.job).toMatchObject({
          status: 'failed',
          error: { code: 'llm_output' },
        });
        expect(llmProxy.interceptedRequests).toHaveLength(2);
        // The last successful brief is still served.
        expect(document.report).toStrictEqual(previousDocument.report);
        expect(document.metadata).toStrictEqual(previousDocument.metadata);
      }
    );

    apiTest(
      'links name mentions to the entity and drops assessments that mention unknown entities',
      async ({ entityAnalyticsApi }) => {
        mockSubmitBrief(llmProxy, {
          verdict: {
            ...HIGH_RISK_ENTITY_BRIEF.verdict,
            summary: `{{ user.name ${SEEDED_ENTITY.name} }} is at high risk.`,
          },
          assessments: {
            threats: HIGH_RISK_ENTITY_BRIEF.assessments.threats,
            response: {
              level: 'watch',
              summary: '{{ entity.id user:not-in-evidence }} needs a response.',
              factIds: [1],
            },
          },
        });

        const response = await entityAnalyticsApi.generateExecutiveBrief(
          { body: { range: '7d', connectorId } },
          { headers }
        );
        expect(response).toHaveStatusCode(200);

        const document = await waitForBriefJob({
          entityAnalyticsApi,
          headers,
          jobId: response.body.id,
        });
        expect(document.job.status).toBe('succeeded');
        expect(document.report?.verdict?.summary).toBe(
          `{{ entity.id ${SEEDED_ENTITY.id} }} is at high risk.`
        );
        expect(Object.keys(document.report?.assessments ?? {})).toStrictEqual(['threats']);
        expect(document.metadata?.verification).toMatchObject({
          dropped: { citation: 1 },
          repaired: false,
        });
      }
    );
  }
);
