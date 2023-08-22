/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import { CASES_URL } from '@kbn/cases-plugin/common';
import { Case, CaseSeverity, CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import type { CasePostRequest } from '@kbn/cases-plugin/common/types/api';
import { ConnectorTypes } from '@kbn/cases-plugin/common/types/domain';
import { CasesFindResponse } from '@kbn/cases-plugin/common/types/api';

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

export const defaultUser = { email: null, full_name: null, username: 'elastic' };
/**
 * A null filled user will occur when the security plugin is disabled
 */
export const nullUser = { email: null, full_name: null, username: null };

export const postCaseReq: CasePostRequest = {
  description: 'This is a brand new case of a bad meanie defacing data',
  title: 'Super Bad Observability Issue',
  tags: ['defacement'],
  severity: CaseSeverity.LOW,
  connector: {
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
    fields: null,
  },
  settings: {
    syncAlerts: true,
  },
  owner: 'observability',
  assignees: [],
};

/**
 * Return a request for creating a case.
 */
export const getPostCaseRequest = (req?: Partial<CasePostRequest>): CasePostRequest => ({
  ...postCaseReq,
  ...req,
});

export const postCaseResp = (
  id?: string | null,
  req: CasePostRequest = postCaseReq
): Partial<Case> => ({
  ...req,
  ...(id != null ? { id } : {}),
  comments: [],
  duration: null,
  severity: req.severity ?? CaseSeverity.LOW,
  totalAlerts: 0,
  totalComment: 0,
  closed_by: null,
  created_by: defaultUser,
  external_service: null,
  status: CaseStatuses.open,
  updated_by: null,
  category: null,
});

const findCommon = {
  page: 1,
  per_page: 20,
  total: 0,
  count_open_cases: 0,
  count_closed_cases: 0,
  count_in_progress_cases: 0,
};

export const findCasesResp: CasesFindResponse = {
  ...findCommon,
  cases: [],
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
