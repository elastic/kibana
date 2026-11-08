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
import { CaseStatuses } from '@kbn/cases-components';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/server';
import { API_VERSIONS } from '../../../../../../common/constants';
import { ENTITY_CASE_COUNTS_INTERNAL_URL } from '../../../../../../common/entity_analytics/entity_analytics/constants';

const HEADERS = {
  'kbn-xsrf': 'scout',
  'elastic-api-version': API_VERSIONS.internal.v1,
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
};

const OTHER_SPACE_ID = 'scout-entity-case-counts';
const GROUP_SPACE_ID = 'scout-entity-case-counts-groups';
const CASE_TAG = 'scout-entity-case-counts';
const ENTITY_ID = 'host:scout-case-counts-1';
const ENTITY_WITHOUT_CASES = 'host:scout-case-counts-none';
const ENTITY_WITH_CLOSED_CASE = 'host:scout-case-counts-closed';
const GROUP_HEAD = 'host:scout-case-counts-head';
const GROUP_ALIAS = 'host:scout-case-counts-alias';
const GROUP_ENTITY_INDEX = getEntitiesAlias(ENTITY_LATEST, GROUP_SPACE_ID);

type CasesApi = ApiServicesFixture['cases'];
type CommentParams = Parameters<CasesApi['comments']['create']>[1];

// The Scout cases client types comments with the legacy attachment union, which predates
// unified reference attachments like `security.entity`.
const buildEntityAttachment = (entityId: string) =>
  ({
    type: SECURITY_ENTITY_ATTACHMENT_TYPE,
    attachmentId: entityId,
    metadata: { entityName: entityId, entityType: 'host' },
    owner: SECURITY_SOLUTION_OWNER,
  } as unknown as CommentParams);

interface CaseOptions {
  entityId?: string;
  status?: CaseStatuses;
  spaceId?: string;
}

/** Creates a Security case in the space with the entity attached; returns its id. */
const createCaseWithEntity = async (
  cases: CasesApi,
  { entityId = ENTITY_ID, status = CaseStatuses.open, spaceId }: CaseOptions = {}
): Promise<string> => {
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
  const { data: attached } = await cases.comments.create(
    created.id,
    buildEntityAttachment(entityId),
    spaceId
  );
  if (status !== CaseStatuses.open) {
    await cases.update([{ id: created.id, version: attached.version, status }], spaceId);
  }
  return created.id;
};

/**
 * Logs in as a user with only the Kibana `feature` privileges. Scout keeps one custom role,
 * so each test logs in right before its request.
 */
const asUserWith = async (
  samlAuth: SamlAuth,
  feature: Record<string, string[]>,
  indices: Array<{ names: string[]; privileges: string[] }> = []
) =>
  (
    await samlAuth.asInteractiveUser({
      elasticsearch: { cluster: [], indices },
      kibana: [{ base: [], feature, spaces: ['*'] }],
    })
  ).cookieHeader;

const CASES_READER = { siemV5: ['read'], securitySolutionCasesV3: ['read'] };

/** The request of the counts of every test entity, with a user's cookie. */
const buildRequest = (cookieHeader: Record<string, string>) => ({
  headers: { ...cookieHeader, ...HEADERS },
  responseType: 'json' as const,
  body: { entity_ids: [ENTITY_ID, ENTITY_WITHOUT_CASES, ENTITY_WITH_CLOSED_CASE] },
});

apiTest.describe(
  'Entity case counts',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    apiTest.beforeAll(async ({ apiServices, esClient }) => {
      await apiServices.spaces.create({ id: OTHER_SPACE_ID, name: OTHER_SPACE_ID });
      // Default space: the entity in two open cases, one of them with two attachments, one in
      // progress and one closed. The other entity only in a closed case.
      const caseId = await createCaseWithEntity(apiServices.cases);
      await apiServices.cases.comments.create(caseId, buildEntityAttachment(ENTITY_ID));
      await createCaseWithEntity(apiServices.cases);
      await createCaseWithEntity(apiServices.cases, { status: CaseStatuses['in-progress'] });
      await createCaseWithEntity(apiServices.cases, { status: CaseStatuses.closed });
      await createCaseWithEntity(apiServices.cases, {
        entityId: ENTITY_WITH_CLOSED_CASE,
        status: CaseStatuses.closed,
      });
      // The other space: one case.
      await createCaseWithEntity(apiServices.cases, { spaceId: OTHER_SPACE_ID });
      await apiServices.spaces.create({ id: GROUP_SPACE_ID, name: GROUP_SPACE_ID });
      // A group in its own space: the main entity and its alias share a case, and the alias has its own.
      const sharedCaseId = await createCaseWithEntity(apiServices.cases, {
        entityId: GROUP_HEAD,
        spaceId: GROUP_SPACE_ID,
      });
      await apiServices.cases.comments.create(
        sharedCaseId,
        buildEntityAttachment(GROUP_ALIAS),
        GROUP_SPACE_ID
      );
      await createCaseWithEntity(apiServices.cases, {
        entityId: GROUP_ALIAS,
        spaceId: GROUP_SPACE_ID,
      });
      // The space has its own entity index, which no entity store uses.
      await esClient.indices.create({
        index: GROUP_ENTITY_INDEX,
        mappings: {
          properties: {
            'entity.id': { type: 'keyword' },
            'entity.relationships.resolution.resolved_to': { type: 'keyword' },
          },
        },
      });
      await esClient.index({
        index: GROUP_ENTITY_INDEX,
        refresh: 'wait_for',
        document: {
          'entity.id': GROUP_ALIAS,
          'entity.relationships.resolution.resolved_to': GROUP_HEAD,
        },
      });
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await apiServices.cases.cleanup.deleteCasesByTags([CASE_TAG]);
      await esClient.indices.delete({ index: GROUP_ENTITY_INDEX, ignore_unavailable: true });
      await apiServices.spaces.delete(OTHER_SPACE_ID);
      await apiServices.spaces.delete(GROUP_SPACE_ID);
    });

    apiTest(
      'counts the distinct open and in-progress cases of each entity in the space',
      async ({ apiClient, samlAuth }) => {
        const response = await apiClient.post(
          ENTITY_CASE_COUNTS_INTERNAL_URL,
          buildRequest(await asUserWith(samlAuth, CASES_READER))
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ [ENTITY_ID]: 3 });
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
      'counts the distinct cases of an entity and its members, a shared case once',
      async ({ apiClient, samlAuth }) => {
        const cookieHeader = await asUserWith(samlAuth, CASES_READER, [
          { names: [GROUP_ENTITY_INDEX], privileges: ['read'] },
        ]);
        const countOf = async (body: object) => {
          const response = await apiClient.post(
            `/s/${GROUP_SPACE_ID}${ENTITY_CASE_COUNTS_INTERNAL_URL}`,
            { headers: { ...cookieHeader, ...HEADERS }, responseType: 'json' as const, body }
          );
          expect(response).toHaveStatusCode(200);
          return response.body;
        };

        // Alone, the main entity has the shared case; with its alias, also the alias' case, the shared one counted once.
        expect(await countOf({ entity_ids: [GROUP_HEAD] })).toStrictEqual({ [GROUP_HEAD]: 1 });
        expect(await countOf({ entity_ids: [GROUP_HEAD], include_members: true })).toStrictEqual({
          [GROUP_HEAD]: 2,
        });
      }
    );

    apiTest('is forbidden without Security cases access', async ({ apiClient, samlAuth }) => {
      const response = await apiClient.post(
        ENTITY_CASE_COUNTS_INTERNAL_URL,
        buildRequest(await asUserWith(samlAuth, { siemV5: ['read'] }))
      );

      expect(response).toHaveStatusCode(403);
    });

    apiTest('is forbidden without entity analytics access', async ({ apiClient, samlAuth }) => {
      const response = await apiClient.post(
        ENTITY_CASE_COUNTS_INTERNAL_URL,
        buildRequest(await asUserWith(samlAuth, { securitySolutionCasesV3: ['read'] }))
      );

      expect(response).toHaveStatusCode(403);
    });
  }
);
