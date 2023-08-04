/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import { CASES_URL } from '@kbn/cases-plugin/common';
import { Case } from '@kbn/cases-plugin/common/types/domain';
import { CasePostRequest, CasesFindResponse } from '@kbn/cases-plugin/common/types/api';
import type SuperTest from 'supertest';

export interface User {
  username: string;
  password: string;
  description?: string;
  roles: string[];
}

export const superUser: User = {
  username: 'superuser',
  password: 'superuser',
  roles: ['superuser'],
};

export const setupAuth = ({
  apiCall,
  headers,
  auth,
}: {
  apiCall: SuperTest.Test;
  headers: Record<string, unknown>;
  auth?: { user: User; space: string | null } | null;
}): SuperTest.Test => {
  if (!Object.hasOwn(headers, 'Cookie') && auth != null) {
    return apiCall.auth(auth.user.username, auth.user.password);
  }

  return apiCall;
};

export const getSpaceUrlPrefix = (spaceId: string | undefined | null) => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

export const deleteAllCaseItems = async (es: Client) => {
  await Promise.all([
    deleteCasesByESQuery(es),
    deleteCasesUserActions(es),
    deleteComments(es),
    deleteConfiguration(es),
    deleteMappings(es),
  ]);
};

export const deleteCasesUserActions = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: 'type:cases-user-actions',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteCasesByESQuery = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: 'type:cases',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteComments = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: 'type:cases-comments',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteConfiguration = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: 'type:cases-configure',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteMappings = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: 'type:cases-connector-mappings',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const createCase = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  params: CasePostRequest,
  expectedHttpCode: number = 200,
  auth: { user: User; space: string | null } | null = { user: superUser, space: null },
  headers: Record<string, unknown> = {}
): Promise<Case> => {
  const apiCall = supertest.post(`${CASES_URL}`);

  setupAuth({ apiCall, headers, auth });

  const response = await apiCall
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .set(headers)
    .send(params)
    .expect(expectedHttpCode);

  return response.body;
};

export const findCases = async ({
  supertest,
  query = {},
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  query?: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CasesFindResponse> => {
  const { body: res } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/_find`)
    .auth(auth.user.username, auth.user.password)
    .query({ sortOrder: 'asc', ...query })
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .send()
    .expect(expectedHttpCode);

  return res;
};

export const getCase = async ({
  supertest,
  caseId,
  includeComments = false,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  includeComments?: boolean;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<Case> => {
  const { body: theCase } = await supertest
    .get(
      `${getSpaceUrlPrefix(auth?.space)}${CASES_URL}/${caseId}?includeComments=${includeComments}`
    )
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return theCase;
};
