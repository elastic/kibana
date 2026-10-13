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
import type {
  AttentionLevel,
  Brief,
} from '../../../../common/entity_analytics/executive_brief/brief';
import { BRIEF_ROUTE, EXECUTIVE_BRIEF_TAGS, INTERNAL_HEADERS } from '../fixtures/constants';
import {
  createAttackDiscoveryIndex,
  createBriefConnector,
  deleteAllBriefs,
  deleteAttackDiscoveries,
  deleteAttackDiscoveryIndex,
  deleteBriefConnector,
  getCurrentUser,
  mockSubmitBrief,
  seedAttackDiscoveries,
  waitForBriefJob,
} from '../fixtures/brief_helpers';

/** A model answer that cites the first discovery at `level` in the verdict and one area. */
const discoveryBrief = (level: AttentionLevel): Brief => ({
  verdict: {
    level,
    headline: 'Attack Discovery found activity worth reviewing',
    summary: 'A discovered attack is open and worth reviewing.',
    evidence: ['F-1'],
  },
  areas: [
    {
      id: 'threats',
      level,
      summary: 'A discovered attack is open.',
      evidence: ['F-1'],
    },
  ],
});

apiTest.describe(
  'Executive brief - attack discoveries as evidence',
  { tag: EXECUTIVE_BRIEF_TAGS },
  () => {
    let headers: Record<string, string>;
    let username: string;
    let connectorId: string;
    let llmProxy: LlmProxy;

    apiTest.beforeAll(async ({ apiClient, apiServices, samlAuth, esClient, log }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...INTERNAL_HEADERS, ...cookieHeader };
      ({ username } = await getCurrentUser({ apiClient, headers }));
      ({ connectorId, llmProxy } = await createBriefConnector({ apiServices, log }));
      await createAttackDiscoveryIndex(esClient);
    });

    apiTest.beforeEach(async ({ esClient }) => {
      await deleteAllBriefs(esClient);
      await deleteAttackDiscoveries(esClient);
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await deleteAllBriefs(esClient);
      await deleteAttackDiscoveries(esClient);
      await deleteAttackDiscoveryIndex(esClient);
      await deleteBriefConnector({ apiServices, connectorId, llmProxy });
    });

    apiTest(
      "uses the caller's own and shared discoveries, never another user's private one",
      async ({ apiClient, esClient }) => {
        await seedAttackDiscoveries(esClient, [
          {
            id: 'ad-private-other',
            title: 'Private discovery of another analyst',
            alertIds: ['alert-a'],
            riskScore: 70,
            users: ['another-analyst'],
          },
          { id: 'ad-shared', title: 'Shared discovery', alertIds: ['alert-b'], riskScore: 60 },
          {
            id: 'ad-own',
            title: 'Discovery owned by the caller',
            alertIds: ['alert-c'],
            riskScore: 50,
            users: [username],
          },
        ]);
        mockSubmitBrief(llmProxy, discoveryBrief('watch'));

        const response = await apiClient.post<GenerateBriefResponse>(BRIEF_ROUTE, {
          headers,
          responseType: 'json',
          body: { range: '7d', connectorId },
        });
        expect(response).toHaveStatusCode(202);

        const document = await waitForBriefJob({ apiClient, headers, jobId: response.body.job.id });
        expect(document.generation.status).toBe('succeeded');
        const discoveryIds = (document.provenance?.facts ?? [])
          .filter(({ kind }) => kind === 'attack_discovery')
          .map(({ source }) => source?.id)
          .sort();
        expect(discoveryIds).toStrictEqual(['ad-own', 'ad-shared']);
      }
    );

    apiTest(
      'collapses regenerated discoveries with overlapping alerts into the highest-risk one',
      async ({ apiClient, esClient }) => {
        await seedAttackDiscoveries(esClient, [
          {
            id: 'ad-first-run',
            title: 'Credential theft (first run)',
            alertIds: ['alert-1', 'alert-2', 'alert-3'],
            riskScore: 80,
          },
          {
            id: 'ad-second-run',
            title: 'Credential theft (second run)',
            alertIds: ['alert-1', 'alert-2', 'alert-3', 'alert-4'],
            riskScore: 60,
          },
        ]);
        mockSubmitBrief(llmProxy, discoveryBrief('watch'));

        const response = await apiClient.post<GenerateBriefResponse>(BRIEF_ROUTE, {
          headers,
          responseType: 'json',
          body: { range: '7d', connectorId },
        });
        expect(response).toHaveStatusCode(202);

        const document = await waitForBriefJob({ apiClient, headers, jobId: response.body.job.id });
        expect(document.generation.status).toBe('succeeded');
        expect(document.provenance?.facts).toStrictEqual([
          expect.objectContaining({
            id: 'F-1',
            kind: 'attack_discovery',
            severity: 'critical',
            numbers: { alerts: 3 },
            source: expect.objectContaining({ id: 'ad-first-run' }),
          }),
        ]);
      }
    );

    apiTest(
      'caps the attention level at what a low-severity discovery supports',
      async ({ apiClient, esClient }) => {
        await seedAttackDiscoveries(esClient, [
          { id: 'ad-low', title: 'Unusual logon', alertIds: ['alert-low'], riskScore: 10 },
        ]);
        mockSubmitBrief(llmProxy, discoveryBrief('urgent'));

        const response = await apiClient.post<GenerateBriefResponse>(BRIEF_ROUTE, {
          headers,
          responseType: 'json',
          body: { range: '7d', connectorId },
        });
        expect(response).toHaveStatusCode(202);

        const document = await waitForBriefJob({ apiClient, headers, jobId: response.body.job.id });
        expect(document.generation.status).toBe('succeeded');
        expect(document.provenance?.facts).toStrictEqual([
          expect.objectContaining({ id: 'F-1', severity: 'low' }),
        ]);
        expect(document.report?.verdict?.level).toBe('watch');
        expect(document.report?.areas?.map(({ level }) => level)).toStrictEqual(['watch']);
        expect(document.provenance?.verification?.lowered).toBeGreaterThanOrEqual(1);
      }
    );
  }
);
