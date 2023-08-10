/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_URL } from '@kbn/cases-plugin/common';
import { Case } from '@kbn/cases-plugin/common/types/domain';
import { CasePostRequest } from '@kbn/cases-plugin/common/types/api';
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
}

export const getSpaceUrlPrefix = (spaceId: string | undefined | null) => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

export const createCase = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  params: CasePostRequest,
  expectedHttpCode: number = 200,
  auth: { user: User; space: string | null } | null = { user: superUser, space: null },
  headers: Record<string, unknown> = {}
): Promise<Case> => {
  const apiCall = supertest.post(`${getSpaceUrlPrefix(auth?.space)}${CASES_URL}`);

  setupAuth({ apiCall, headers, auth });

  const { body: theCase } = await apiCall
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .set(headers)
    .send(params)
    .expect(expectedHttpCode);

  return theCase;
};
