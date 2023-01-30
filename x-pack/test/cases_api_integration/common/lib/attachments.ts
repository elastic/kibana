/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  BulkGetAttachmentsResponse,
  getCaseBulkGetAttachmentsUrl,
} from '@kbn/cases-plugin/common/api';
import { User } from './authentication/types';
import { superUser } from './authentication/users';
import { getSpaceUrlPrefix } from './utils';

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
}): Promise<BulkGetAttachmentsResponse> => {
  const { body: comments } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${getCaseBulkGetAttachmentsUrl(caseId)}`)
    .send({ ids: attachmentIds })
    .set('kbn-xsrf', 'abc')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return comments;
};
