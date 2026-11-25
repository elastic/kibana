/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, ELASTIC_INTERNAL_ORIGIN_HEADER, tags } from '@kbn/scout-security';
import type { ApiClientFixture, EsClient } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  API_VERSIONS as ENTITY_STORE_API_VERSIONS,
  AI_SUMMARY_RESOLVED_GROUP_VARIANT_ID,
  ENTITY_STORE_ROUTES,
  ENTITY_METADATA,
  ENTITY_SCHEMA_VERSION_V2,
  getEntityIndexPattern,
} from '@kbn/entity-store/common';
import { API_VERSIONS } from '../../../../../../common/constants';
import { ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL } from '../../../../../../common/entity_analytics/entity_analytics/constants';

const BASE_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
};

const INTERNAL_HEADERS = {
  ...BASE_HEADERS,
  'elastic-api-version': API_VERSIONS.internal.v1,
};

const PUBLIC_HEADERS = {
  ...BASE_HEADERS,
  'elastic-api-version': ENTITY_STORE_API_VERSIONS.public.v1,
};

// Bare datastream name — what the metadata client reads/writes and what we refresh/clean up.
const METADATA_DATA_STREAM = getEntityIndexPattern({
  schemaVersion: ENTITY_SCHEMA_VERSION_V2,
  dataset: ENTITY_METADATA,
  namespace: 'default',
});

const TEST_ENTITY_ID = 'user:scout-ai-summary-variants@test';
const TEST_ENTITY_TYPE = 'user';

const SINGLE_HIGHLIGHT = { title: 'Single entity', text: 'Summary of one entity.' };
const RESOLVED_HIGHLIGHT = { title: 'Resolution group', text: 'Summary of the whole group.' };

const readUrl = (mode?: string): string => {
  const params = new URLSearchParams({ entityId: TEST_ENTITY_ID, entityType: TEST_ENTITY_TYPE });
  if (mode) {
    params.set('mode', mode);
  }
  return `${ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL}?${params.toString()}`;
};

const buildSummaryBody = ({
  highlight,
  riskScore,
  variantId,
}: {
  highlight: { title: string; text: string };
  riskScore: number;
  variantId?: string;
}) => ({
  entityId: TEST_ENTITY_ID,
  entityType: TEST_ENTITY_TYPE,
  summary: {
    highlights: [highlight],
    recommended_actions: null,
    generated_at: Date.now(),
    staleness: { enabled_signals: ['risk_score'], snapshot: { risk_score: riskScore } },
    ...(variantId ? { variant_id: variantId } : {}),
  },
});

/**
 * The flyout keeps two independent persisted summaries per entity: the single-entity one
 * (untagged) and the resolution-group one (`Ai_summary.variant_id: resolved`). The read is
 * "latest wins", so without the variant filter a fresh group summary would shadow the
 * single-entity one and vice versa. This spec writes both, in both orders, and proves each
 * mode reads back only its own document.
 */
apiTest.describe(
  'Entity AI Summary variants (single vs resolved)',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    const persist = async (
      apiClient: ApiClientFixture,
      esClient: EsClient,
      body: ReturnType<typeof buildSummaryBody>
    ) => {
      const write = await apiClient.post(ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL, {
        headers: adminHeaders,
        responseType: 'json',
        body,
      });
      expect(write).toHaveStatusCode(200);
      expect(write.body).toMatchObject({ created: true });
      // The append write uses refresh:false; make the doc searchable before reading it back.
      await esClient.indices.refresh({ index: METADATA_DATA_STREAM });
    };

    apiTest.beforeAll(async ({ samlAuth, apiClient, esClient }) => {
      const admin = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...admin.cookieHeader, ...INTERNAL_HEADERS };

      // The write runs as kibana_system, which can append to but not auto-create the
      // metadata datastream — install the Entity Store first.
      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: { ...admin.cookieHeader, ...PUBLIC_HEADERS },
        responseType: 'json',
        body: {},
      });
      expect([200, 201]).toContain(install.statusCode);

      // Single-entity summary first, then the group summary — the group doc is newer, so a
      // read without the variant filter would return it for single mode.
      await persist(
        apiClient,
        esClient,
        buildSummaryBody({ highlight: SINGLE_HIGHLIGHT, riskScore: 20 })
      );
      await persist(
        apiClient,
        esClient,
        buildSummaryBody({
          highlight: RESOLVED_HIGHLIGHT,
          riskScore: 80,
          variantId: AI_SUMMARY_RESOLVED_GROUP_VARIANT_ID,
        })
      );
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient
        .deleteByQuery({
          index: METADATA_DATA_STREAM,
          query: { term: { 'entity.id': TEST_ENTITY_ID } },
          refresh: true,
          conflicts: 'proceed',
        })
        .catch(() => {
          // Datastream may not exist yet on a clean box; safe to ignore.
        });
    });

    apiTest(
      'reads the single-entity summary when mode is omitted, even though the group summary is newer',
      async ({ apiClient }) => {
        const read = await apiClient.get(readUrl(), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(read).toHaveStatusCode(200);
        expect(read.body).toMatchObject({
          canRead: true,
          summary: {
            highlights: [SINGLE_HIGHLIGHT],
            staleness: { snapshot: { risk_score: 20 } },
          },
        });
        expect('variant_id' in read.body.summary).toBe(false);
      }
    );

    apiTest('mode=single reads the same document as the default', async ({ apiClient }) => {
      const read = await apiClient.get(readUrl('single'), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(read).toHaveStatusCode(200);
      expect(read.body.summary).toMatchObject({ highlights: [SINGLE_HIGHLIGHT] });
    });

    apiTest('mode=resolved reads only the resolution-group summary', async ({ apiClient }) => {
      const read = await apiClient.get(readUrl('resolved'), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(read).toHaveStatusCode(200);
      expect(read.body).toMatchObject({
        canRead: true,
        summary: {
          highlights: [RESOLVED_HIGHLIGHT],
          staleness: { snapshot: { risk_score: 80 } },
          variant_id: AI_SUMMARY_RESOLVED_GROUP_VARIANT_ID,
        },
      });
    });

    apiTest(
      'a newer single-entity summary does not shadow the resolution-group one',
      async ({ apiClient, esClient }) => {
        const newerSingle = { title: 'Single entity (newer)', text: 'Regenerated.' };
        await persist(
          apiClient,
          esClient,
          buildSummaryBody({ highlight: newerSingle, riskScore: 25 })
        );

        const single = await apiClient.get(readUrl(), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(single).toHaveStatusCode(200);
        expect(single.body.summary).toMatchObject({ highlights: [newerSingle] });

        const resolved = await apiClient.get(readUrl('resolved'), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(resolved).toHaveStatusCode(200);
        expect(resolved.body.summary).toMatchObject({
          highlights: [RESOLVED_HIGHLIGHT],
          variant_id: AI_SUMMARY_RESOLVED_GROUP_VARIANT_ID,
        });
      }
    );

    apiTest('rejects an unknown mode with 400', async ({ apiClient }) => {
      const read = await apiClient.get(readUrl('group'), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(read).toHaveStatusCode(400);
    });
  }
);
