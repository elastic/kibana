/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_URL } from '@kbn/cases-plugin/common';
import { Case, CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import {
  CasePostRequest,
  CasesFindResponse,
  CasesPatchRequest,
} from '@kbn/cases-plugin/common/types/api';
import type SuperTest from 'supertest';
import { ToolingLog } from '@kbn/tooling-log';
import { User } from '../authentication/types';

import { superUser } from '../authentication/users';
import { getSpaceUrlPrefix, setupAuth } from './helpers';
import { waitFor } from '../../../../common/utils/security_solution/detections_response';

export const createCase = async (
  supertest: SuperTest.Agent,
  params: CasePostRequest,
  expectedHttpCode: number = 200,
  auth: { user: User; space: string | null } | null = { user: superUser, space: null },
  headers: Record<string, string | string[]> = {}
): Promise<Case> => {
  const apiCall = supertest.post(`${getSpaceUrlPrefix(auth?.space)}${CASES_URL}`);

  void setupAuth({ apiCall, headers, auth });

  const { body: theCase } = await apiCall
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'foo')
    .set(headers)
    .send(params)
    .expect(expectedHttpCode);

  return theCase;
};

export const waitForCases = async (supertest: SuperTest.Agent, log: ToolingLog): Promise<void> => {
  await waitFor(
    async () => {
      const response = await getCases(supertest);
      const cases = response;
      return cases != null && cases.cases.length > 0 && cases?.cases[0]?.totalAlerts > 0;
    },
    'waitForCaseToAttachAlert',
    log
  );
};

export const getCases = async (
  supertest: SuperTest.Agent,
  expectedHttpCode: number = 200,
  headers: Record<string, string | string[]> = {}
): Promise<CasesFindResponse> => {
  const { body: theCase } = await supertest
    .get(`${CASES_URL}/_find`)
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'foo')
    .set('elastic-api-version', '2023-10-31')
    .set(headers)
    .expect(expectedHttpCode);

  return theCase;
};

/**
 * Sends a delete request for the specified case IDs.
 */
export const deleteCases = async ({
  supertest,
  caseIDs,
  expectedHttpCode = 204,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseIDs: string[];
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}) => {
  const { body } = await supertest
    .delete(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}`)
    .auth(auth.user.username, auth.user.password)
    // we need to json stringify here because just passing in the array of case IDs will cause a 400 with Kibana
    // not being able to parse the array correctly. The format ids=["1", "2"] seems to work, which stringify outputs.
    .query({ ids: JSON.stringify(caseIDs) })
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return body;
};

export const updateCaseStatus = async ({
  supertest,
  caseId,
  version = '2',
  status = 'open' as CaseStatuses,
  expectedHttpCode = 204,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  version: string;
  status?: CaseStatuses;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}) => {
  const updateRequest: CasesPatchRequest = {
    cases: [
      {
        status,
        version,
        id: caseId,
      },
    ],
  };

  const { body: updatedCase } = await supertest
    .patch(`${getSpaceUrlPrefix(auth?.space)}${CASES_URL}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'xxx')
    .send(updateRequest)
    .expect(expectedHttpCode);
  return updatedCase;
};

export const updateCaseAssignee = async ({
  supertest,
  caseId,
  version = '2',
  assigneeId,
  expectedHttpCode = 204,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  version?: string;
  assigneeId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}) => {
  const updateRequest: CasesPatchRequest = {
    cases: [
      {
        version,
        assignees: [{ uid: assigneeId }],
        id: caseId,
      },
    ],
  };

  const { body: updatedCase } = await supertest
    .patch(`${getSpaceUrlPrefix(auth?.space)}${CASES_URL}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'xxx')
    .send(updateRequest)
    .expect(expectedHttpCode);
  return updatedCase;
};
