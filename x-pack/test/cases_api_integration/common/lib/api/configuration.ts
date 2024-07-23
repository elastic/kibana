/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_CONFIGURE_URL } from '@kbn/cases-plugin/common/constants';
import {
  ConfigurationPatchRequest,
  ConfigurationRequest,
} from '@kbn/cases-plugin/common/types/api';
import {
  CaseConnector,
  Configuration,
  Configurations,
  ConnectorTypes,
} from '@kbn/cases-plugin/common/types/domain';
import type SuperTest from 'supertest';
import { User } from '../authentication/types';

import { superUser } from '../authentication/users';
import { getSpaceUrlPrefix, setupAuth } from './helpers';

type ConfigRequestParams = Partial<CaseConnector> & {
  overrides?: Record<string, unknown>;
};

export const getConfigurationRequest = ({
  id = 'none',
  name = 'none',
  type = ConnectorTypes.none,
  fields = null,
  overrides,
}: ConfigRequestParams = {}): ConfigurationRequest => {
  return {
    connector: {
      id,
      name,
      type,
      fields,
    } as CaseConnector,
    closure_type: 'close-by-user',
    owner: 'securitySolutionFixture',
    customFields: [],
    templates: [],
    ...overrides,
  };
};

export const getConfigurationOutput = (update = false, overwrite = {}): Partial<Configuration> => {
  return {
    ...getConfigurationRequest(),
    error: null,
    mappings: [],
    created_by: { email: null, full_name: null, username: 'elastic' },
    updated_by: update ? { email: null, full_name: null, username: 'elastic' } : null,
    customFields: [],
    ...overwrite,
  };
};

export const createConfiguration = async (
  supertest: SuperTest.Agent,
  req: ConfigurationRequest = getConfigurationRequest(),
  expectedHttpCode: number = 200,
  auth: { user: User; space: string | null } | null = { user: superUser, space: null },
  headers: Record<string, string | string[]> = {}
): Promise<Configuration> => {
  const apiCall = supertest.post(`${getSpaceUrlPrefix(auth?.space)}${CASE_CONFIGURE_URL}`);

  setupAuth({ apiCall, headers, auth });

  const { body: configuration } = await apiCall
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'foo')
    .set(headers)
    .send(req)
    .expect(expectedHttpCode);

  return configuration;
};

export const getConfiguration = async ({
  supertest,
  query = { owner: 'securitySolutionFixture' },
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  query?: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<Configurations> => {
  const { body: configuration } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASE_CONFIGURE_URL}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .query(query)
    .expect(expectedHttpCode);

  return configuration;
};

export const updateConfiguration = async (
  supertest: SuperTest.Agent,
  id: string,
  req: ConfigurationPatchRequest,
  expectedHttpCode: number = 200,
  auth: { user: User; space: string | null } | null = { user: superUser, space: null },
  headers: Record<string, string | string[]> = {}
): Promise<Configuration> => {
  const apiCall = supertest.patch(`${getSpaceUrlPrefix(auth?.space)}${CASE_CONFIGURE_URL}/${id}`);

  setupAuth({ apiCall, headers, auth });

  const { body: configuration } = await apiCall
    .set('kbn-xsrf', 'true')
    .set(headers)
    .send(req)
    .expect(expectedHttpCode);

  return configuration;
};
