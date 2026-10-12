/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, SamlAuth } from '@kbn/scout-security';
import { apiTest, ELASTIC_INTERNAL_ORIGIN_HEADER, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { SECURITY_ENTITY_ATTACHMENT_TYPE, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { API_VERSIONS } from '../../../../../../common/constants';
import { ENTITY_CASE_COUNTS_INTERNAL_URL } from '../../../../../../common/entity_analytics/entity_analytics/constants';

const HEADERS = {
  'kbn-xsrf': 'scout',
  'elastic-api-version': API_VERSIONS.internal.v1,
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
};

const OTHER_SPACE_ID = 'scout-entity-case-counts';
const CASE_TAG = 'scout-entity-case-counts';
const ENTITY_ID = 'host:scout-case-counts-1';
const ENTITY_WITHOUT_CASES = 'host:scout-case-counts-none';

type CasesApi = ApiServicesFixture['cases'];
type CommentParams = Parameters<CasesApi['comments']['create']>[1];

// The Scout cases client types comments with the legacy attachment union, which predates
// unified reference attachments like `security.entity`.
const ENTITY_ATTACHMENT = {
  type: SECURITY_ENTITY_ATTACHMENT_TYPE,
  attachmentId: ENTITY_ID,
  metadata: { entityName: 'scout-case-counts-1', entityType: 'host' },
  owner: SECURITY_SOLUTION_OWNER,
} as unknown as CommentParams;

/** Creates a Security case in the space with the entity attached; returns its id. */
const createCaseWithEntity = async (cases: CasesApi, spaceId?: string): Promise<string> => {
  const { data: created } = await cases.create(
    {
      title: `Scout entity case counts – ${spaceId ?? 'default'}`,
      description: 'Created by the entity case counts API test',
      tags: [CASE_TAG],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: false, extractObservables: false },
      owner: SECURITY_SOLUTION_OWNER,
    },
    spaceId
  );
  await cases.comments.create(created.id, ENTITY_ATTACHMENT, spaceId);
  return created.id;
};

/**
 * Logs in as a user with only the Kibana `feature` privileges. Scout keeps one custom role,
 * so each test logs in right before its request.
 */
const asUserWith = async (samlAuth: SamlAuth, feature: Record<string, string[]>) =>
  (
    await samlAuth.asInteractiveUser({
      elasticsearch: { cluster: [] },
      kibana: [{ base: [], feature, spaces: ['*'] }],
    })
  ).cookieHeader;

const CASES_READER = { siemV5: ['read'], securitySolutionCasesV3: ['read'] };

/** The request of the counts of both entities, with a user's cookie. */
const buildRequest = (cookieHeader: Record<string, string>) => ({
  headers: { ...cookieHeader, ...HEADERS },
  responseType: 'json' as const,
  body: { entity_ids: [ENTITY_ID, ENTITY_WITHOUT_CASES] },
});

apiTest.describe(
  'Entity case counts',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.spaces.create({ id: OTHER_SPACE_ID, name: OTHER_SPACE_ID });
      // Default space: the entity in two cases, one of them with two attachments.
      const caseId = await createCaseWithEntity(apiServices.cases);
      await apiServices.cases.comments.create(caseId, ENTITY_ATTACHMENT);
      await createCaseWithEntity(apiServices.cases);
      // The other space: one case.
      await createCaseWithEntity(apiServices.cases, OTHER_SPACE_ID);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.cases.cleanup.deleteCasesByTags([CASE_TAG]);
      await apiServices.spaces.delete(OTHER_SPACE_ID);
    });

    apiTest(
      'counts the distinct cases of each entity in the space',
      async ({ apiClient, samlAuth }) => {
        const response = await apiClient.post(
          ENTITY_CASE_COUNTS_INTERNAL_URL,
          buildRequest(await asUserWith(samlAuth, CASES_READER))
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ [ENTITY_ID]: 2 });
      }
    );

    apiTest('counts only the cases of the request space', async ({ apiClient, samlAuth }) => {
      const response = await apiClient.post(
        `/s/${OTHER_SPACE_ID}${ENTITY_CASE_COUNTS_INTERNAL_URL}`,
        buildRequest(await asUserWith(samlAuth, CASES_READER))
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ [ENTITY_ID]: 1 });
    });

    apiTest(
      'returns no counts to a user who cannot read Security cases',
      async ({ apiClient, samlAuth }) => {
        const response = await apiClient.post(
          ENTITY_CASE_COUNTS_INTERNAL_URL,
          buildRequest(await asUserWith(samlAuth, { siemV5: ['read'] }))
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({});
      }
    );

    apiTest('is forbidden without entity analytics access', async ({ apiClient, samlAuth }) => {
      const response = await apiClient.post(
        ENTITY_CASE_COUNTS_INTERNAL_URL,
        buildRequest(await asUserWith(samlAuth, { securitySolutionCasesV3: ['read'] }))
      );

      expect(response).toHaveStatusCode(403);
    });
  }
);
