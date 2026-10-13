/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { expect } from '@kbn/scout-security/api';
import {
  BRIEF_RETENTION_MS,
  EXECUTIVE_BRIEF_INDEX,
} from '../../../../common/entity_analytics/executive_brief/constants';
import { EXECUTIVE_BRIEF_TAGS } from '../fixtures/constants';
import { apiTest } from '../fixtures';
import {
  createBriefConnector,
  deleteAllBriefs,
  deleteBriefConnector,
  generateBrief,
  getBriefDocId,
} from '../fixtures/brief_helpers';

apiTest.describe('Executive brief - retention', { tag: EXECUTIVE_BRIEF_TAGS }, () => {
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
    'a generated brief expires 30 days after it was generated',
    async ({ entityAnalyticsApi }) => {
      await generateBrief({ entityAnalyticsApi, headers, connectorId });

      const read = await entityAnalyticsApi.getExecutiveBrief({ headers });
      expect(read).toHaveStatusCode(200);
      const { metadata, expiresAt } = read.body;
      expect(metadata?.generatedAt).toBeDefined();
      expect(Date.parse(expiresAt) - Date.parse(metadata?.generatedAt ?? '')).toBe(
        BRIEF_RETENTION_MS
      );
    }
  );

  apiTest(
    'an expired brief reads as not found, even before cleanup runs',
    async ({ apiClient, entityAnalyticsApi, esClient }) => {
      await generateBrief({ entityAnalyticsApi, headers, connectorId });
      const { docId } = await getBriefDocId({ apiClient, headers, spaceId: 'default' });

      await esClient.update({
        index: EXECUTIVE_BRIEF_INDEX,
        id: docId,
        doc: { expiresAt: new Date(Date.now() - 60_000).toISOString() },
        refresh: true,
      });

      const read = await entityAnalyticsApi.getExecutiveBrief({ headers });
      expect(read).toHaveStatusCode(404);
    }
  );
});
