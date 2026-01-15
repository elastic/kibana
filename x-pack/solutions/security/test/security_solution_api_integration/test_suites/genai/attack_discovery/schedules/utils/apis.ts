/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { replaceParams } from '@kbn/openapi-common/shared';
import type {
  AttackDiscoveryApiScheduleCreateProps,
  AttackDiscoveryApiScheduleUpdateProps,
  FindAttackDiscoverySchedulesRequestQuery,
} from '@kbn/elastic-assistant-common';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_SCHEDULES,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE,
  ATTACK_DISCOVERY_SCHEDULES_FIND,
} from '@kbn/elastic-assistant-common';

import { routeWithNamespace } from '@kbn/detections-response-ftr-services';
import type { User } from '../../../utils/auth/types';

const configureTest = (test: SuperTest.Test, user: User | undefined) => {
  const configuredTest = test
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1);
  if (user) {
    configuredTest.auth(user.username, user.password);
  }
  return configuredTest;
};

export const getAttackDiscoverySchedulesApis = ({
  user,
  supertest,
}: {
  supertest: SuperTest.Agent;
  user?: User;
}) => {
  return {
    /**
     * Creates an Attack Discovery Schedule
     * @param param0
     * @returns
     */
    create: async ({
      schedule,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      schedule: Partial<AttackDiscoveryApiScheduleCreateProps>;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(ATTACK_DISCOVERY_SCHEDULES, kibanaSpace);
      const configuredTest = configureTest(supertest.post(route), user);
      const response = await configuredTest.send(schedule).expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Finds Attack Discovery Schedules
     * @param param0
     * @returns
     */
    find: async ({
      query,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      query: FindAttackDiscoverySchedulesRequestQuery;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(ATTACK_DISCOVERY_SCHEDULES_FIND, kibanaSpace);
      const configuredTest = configureTest(supertest.get(route), user);
      const response = await configuredTest.query(query).expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Gets an Attack Discovery Schedule
     */
    get: async ({
      id,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      id: string;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(
        replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
        kibanaSpace
      );
      const configuredTest = configureTest(supertest.get(route), user);
      const response = await configuredTest.expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Updates an Attack Discovery Schedule
     */
    update: async ({
      id,
      schedule,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      id: string;
      schedule: Partial<AttackDiscoveryApiScheduleUpdateProps>;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(
        replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
        kibanaSpace
      );
      const configuredTest = configureTest(supertest.put(route), user);
      const response = await configuredTest.send(schedule).expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Deletes an Attack Discovery Schedule
     */
    delete: async ({
      id,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      id: string;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(
        replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id }),
        kibanaSpace
      );
      const configuredTest = configureTest(supertest.delete(route), user);
      const response = await configuredTest.expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Enables an Attack Discovery Schedule
     */
    enable: async ({
      id,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      id: string;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(
        replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE, { id }),
        kibanaSpace
      );
      const configuredTest = configureTest(supertest.post(route), user);
      const response = await configuredTest.expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Disables an Attack Discovery Schedule
     */
    disable: async ({
      id,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      id: string;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(
        replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE, { id }),
        kibanaSpace
      );
      const configuredTest = configureTest(supertest.post(route), user);
      const response = await configuredTest.expect(expectedHttpCode);

      return response.body;
    },
  };
};
