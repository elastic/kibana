/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_INTERNAL_MISSING_PRIVILEGES,
} from '@kbn/elastic-assistant-common';

import { routeWithNamespace } from '@kbn/detections-response-ftr-services';
import type { User } from '../../../utils/auth/types';

const configureTest = (test: SuperTest.Test, user: User | undefined) => {
  const configuredTest = test
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');
  if (user) {
    configuredTest.auth(user.username, user.password);
  }
  return configuredTest;
};

export const getAttackDiscoveryMissingPrivilegesApis = ({
  user,
  supertest,
}: {
  supertest: SuperTest.Agent;
  user?: User;
}) => {
  return {
    /**
     * Gets an Attack Discovery missing privileges
     */
    get: async ({
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(ATTACK_DISCOVERY_INTERNAL_MISSING_PRIVILEGES, kibanaSpace);
      const configuredTest = configureTest(supertest.get(route), user);
      const response = await configuredTest.expect(expectedHttpCode);

      return response.body;
    },
  };
};
