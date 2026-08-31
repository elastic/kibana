/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  LEAD_GENERATION_ROUTES,
  INTERNAL_HEADERS,
  LEAD_GENERATION_TAGS,
} from '../../fixtures/lead_generation_constants';
import { cleanupLeadsIndex, DEFAULT_SPACE_ID } from '../../fixtures/lead_generation_helpers';
import {
  createLeadGenerationConnector,
  cleanupLeadGenerationConnector,
  waitForLeadGenerationExecution,
  mockSynthesisResponse,
} from '../../fixtures/lead_generation_llm_helpers';
import { seedRiskyUserEntity, cleanupEntity } from '../../fixtures/lead_generation_entity_helpers';
import { ENTITY_STORE_ROUTES, PUBLIC_HEADERS } from '../../fixtures/maintainers/constants';
import {
  waitForEntityStoreRunning,
  clearEntityStoreIndices,
} from '../../fixtures/maintainers/helpers';

apiTest.describe(
  'Lead Generation - POST /internal/entity_analytics/leads/generate',
  { tag: LEAD_GENERATION_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;
    let connectorId: string;
    let llmProxy: LlmProxy;

    let publicHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, apiServices, esClient, samlAuth, log }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };
      publicHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };

      await clearEntityStoreIndices(esClient);
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: publicHeaders,
        responseType: 'json',
        body: {},
      });
      await waitForEntityStoreRunning(apiClient, publicHeaders);

      ({ connectorId, llmProxy } = await createLeadGenerationConnector({ apiServices, log }));

      await apiClient.post(LEAD_GENERATION_ROUTES.ENABLE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { connectorId },
      });
    });

    apiTest.beforeEach(async ({ esClient }) => {
      await cleanupLeadsIndex(esClient, DEFAULT_SPACE_ID);
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ apiClient, esClient, apiServices }) => {
      await cleanupLeadsIndex(esClient, DEFAULT_SPACE_ID);
      await apiClient.post(LEAD_GENERATION_ROUTES.DISABLE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      await cleanupLeadGenerationConnector({ apiServices, connectorId, llmProxy });
      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: publicHeaders,
        responseType: 'json',
        body: {},
      });
      await clearEntityStoreIndices(esClient);
    });

    apiTest(
      'quiet environment: zero qualifying candidates produces zero leads without calling the LLM',
      async ({ apiClient }) => {
        const generateResponse = await apiClient.post(LEAD_GENERATION_ROUTES.GENERATE, {
          headers: defaultHeaders,
          responseType: 'json',
          body: { connectorId },
        });
        expect(generateResponse).toHaveStatusCode(200);

        const status = await waitForLeadGenerationExecution({
          apiClient,
          headers: defaultHeaders,
          executionUuid: generateResponse.body.executionUuid,
        });

        expect(status.totalLeads ?? 0).toBe(0);
        expect(llmProxy.interceptedRequests).toHaveLength(0);
      }
    );

    apiTest(
      'repeat-run dedup: an unchanged candidate refreshes the existing lead without calling the LLM again',
      async ({ apiClient, esClient }) => {
        const euid = `user:generate-spec-dedup-${uuidv4()}`;
        await seedRiskyUserEntity(esClient, { euid });

        try {
          // First run: no existing lead for this entity, so it legitimately
          // creates one via a real synthesis call to the (proxied) connector.
          const synthesisCall = llmProxy.interceptors.userMessage({
            response: mockSynthesisResponse(),
          });
          const first = await apiClient.post(LEAD_GENERATION_ROUTES.GENERATE, {
            headers: defaultHeaders,
            responseType: 'json',
            body: { connectorId },
          });
          await synthesisCall;
          await waitForLeadGenerationExecution({
            apiClient,
            headers: defaultHeaders,
            executionUuid: first.body.executionUuid,
          });
          expect(llmProxy.interceptedRequests).toHaveLength(1);

          const afterFirst = await apiClient.get(LEAD_GENERATION_ROUTES.GET_LEADS, {
            headers: defaultHeaders,
            responseType: 'json',
          });
          expect(afterFirst.body.leads).toHaveLength(1);
          const leadId = afterFirst.body.leads[0].id;

          llmProxy.clear();
          const second = await apiClient.post(LEAD_GENERATION_ROUTES.GENERATE, {
            headers: defaultHeaders,
            responseType: 'json',
            body: { connectorId },
          });
          await waitForLeadGenerationExecution({
            apiClient,
            headers: defaultHeaders,
            executionUuid: second.body.executionUuid,
          });

          const afterSecond = await apiClient.get(LEAD_GENERATION_ROUTES.GET_LEADS, {
            headers: defaultHeaders,
            responseType: 'json',
          });
          expect(afterSecond.body.leads).toHaveLength(1);
          expect(afterSecond.body.leads[0].id).toBe(leadId);
          expect(llmProxy.interceptedRequests).toHaveLength(0);
        } finally {
          await cleanupEntity(esClient, euid);
        }
      }
    );

    apiTest(
      'dismissal survives decay: unchanged evidence on a dismissed lead stays dismissed without calling the LLM',
      async ({ apiClient, esClient }) => {
        const euid = `user:generate-spec-skip-${uuidv4()}`;
        await seedRiskyUserEntity(esClient, { euid });

        try {
          const synthesisCall = llmProxy.interceptors.userMessage({
            response: mockSynthesisResponse(),
          });
          const first = await apiClient.post(LEAD_GENERATION_ROUTES.GENERATE, {
            headers: defaultHeaders,
            responseType: 'json',
            body: { connectorId },
          });
          await synthesisCall;
          await waitForLeadGenerationExecution({
            apiClient,
            headers: defaultHeaders,
            executionUuid: first.body.executionUuid,
          });

          const afterFirst = await apiClient.get(LEAD_GENERATION_ROUTES.GET_LEADS, {
            headers: defaultHeaders,
            responseType: 'json',
          });
          const leadId = afterFirst.body.leads[0].id;
          await apiClient.post(LEAD_GENERATION_ROUTES.DISMISS(leadId), {
            headers: defaultHeaders,
            responseType: 'json',
            body: {},
          });

          // Re-run with unchanged evidence: a dismissed lead whose evidence
          // has neither escalated nor decayed should classify as `skip`.
          llmProxy.clear();
          const second = await apiClient.post(LEAD_GENERATION_ROUTES.GENERATE, {
            headers: defaultHeaders,
            responseType: 'json',
            body: { connectorId },
          });
          await waitForLeadGenerationExecution({
            apiClient,
            headers: defaultHeaders,
            executionUuid: second.body.executionUuid,
          });

          const dismissed = await apiClient.get(
            `${LEAD_GENERATION_ROUTES.GET_LEADS}?status=dismissed`,
            { headers: defaultHeaders, responseType: 'json' }
          );
          const dismissedIds: string[] = dismissed.body.leads.map((l: { id: string }) => l.id);
          expect(dismissedIds).toContain(leadId);
          expect(llmProxy.interceptedRequests).toHaveLength(0);
        } finally {
          await cleanupEntity(esClient, euid);
        }
      }
    );
  }
);
