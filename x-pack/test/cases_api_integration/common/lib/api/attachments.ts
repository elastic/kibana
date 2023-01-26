/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { CASES_INTERNAL_URL, CASES_URL } from '@kbn/cases-plugin/common/constants';
import {
  BulkGetCommentsResponse,
  CaseResponse,
  CommentRequest,
} from '@kbn/cases-plugin/common/api';
import { User } from '../authentication/types';
import { superUser } from '../authentication/users';
import { getSpaceUrlPrefix, setupAuth } from './helpers';

export const bulkGetAttachments = async ({
  supertest,
  attachmentIds,
  caseId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  attachmentIds: string[];
  caseId: string;
  auth?: { user: User; space: string | null };
  expectedHttpCode?: number;
}): Promise<BulkGetCommentsResponse> => {
  const { body: comments } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${CASES_INTERNAL_URL}/${caseId}/attachments/_bulk_get`)
    .send({ ids: attachmentIds })
    .set('kbn-xsrf', 'abc')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return comments;
};

export const createComment = async ({
  supertest,
  caseId,
  params,
  auth = { user: superUser, space: null },
  expectedHttpCode = 200,
  headers = {},
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  params: CommentRequest;
  auth?: { user: User; space: string | null } | null;
  expectedHttpCode?: number;
  headers?: Record<string, unknown>;
}): Promise<CaseResponse> => {
  const apiCall = supertest.post(
    `${getSpaceUrlPrefix(auth?.space)}${CASES_URL}/${caseId}/comments`
  );

  setupAuth({ apiCall, headers, auth });

  const { body: theCase } = await apiCall
    .set('kbn-xsrf', 'true')
    .set(headers)
    .send(params)
    .expect(expectedHttpCode);

  return theCase;
};
