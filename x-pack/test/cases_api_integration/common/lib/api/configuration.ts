/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_CONFIGURE_URL } from '@kbn/cases-plugin/common/constants';
import { ConfigurationRequest } from '@kbn/cases-plugin/common/types/api';
import {
  CaseConnector,
  Configuration,
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
    ...overwrite,
  };
};

export const createConfiguration = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  req: ConfigurationRequest = getConfigurationRequest(),
  expectedHttpCode: number = 200,
  auth: { user: User; space: string | null } | null = { user: superUser, space: null },
  headers: Record<string, unknown> = {}
): Promise<Configuration> => {
  const apiCall = supertest.post(`${getSpaceUrlPrefix(auth?.space)}${CASE_CONFIGURE_URL}`);

  setupAuth({ apiCall, headers, auth });

  const { body: configuration } = await apiCall
    .set('kbn-xsrf', 'true')
    .set(headers)
    .send(req)
    .expect(expectedHttpCode);

  return configuration;
};
