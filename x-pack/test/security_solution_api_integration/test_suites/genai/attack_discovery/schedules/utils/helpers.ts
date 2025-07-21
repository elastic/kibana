/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import {
  API_VERSIONS,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  countDownTest,
  routeWithNamespace,
} from '../../../../../../common/utils/security_solution';
import { getAttackDiscoverySchedulesApis } from './apis';
import { getSimpleAttackDiscoverySchedule } from '../mocks';

export const enableAttackDiscoverySchedulesFeature = async (supertest: SuperTest.Agent) => {
  const response = await supertest
    .put('/internal/core/_settings')
    .set('elastic-api-version', '1')
    .set('kbn-xsrf', 'some-xsrf-token')
    .set('x-elastic-internal-origin', 'kibana')
    .send({
      'feature_flags.overrides': {
        'securitySolution.assistantAttackDiscoverySchedulingEnabled': true,
      },
    })
    .expect(200, { ok: true });

  return response.body;
};

export const createAttackDiscoverySchedules = async ({
  count,
  kibanaSpace = 'default',
  supertest,
}: {
  count: number;
  kibanaSpace?: string;
  supertest: SuperTest.Agent;
}) => {
  const scheduleToCreate = new Array(count)
    .fill(0)
    .map((_, index) => getSimpleAttackDiscoverySchedule({ name: `Test Schedule - ${index}` }));
  const createdSchedules = await Promise.all(
    scheduleToCreate.map((schedule) => {
      const attackApis = getAttackDiscoverySchedulesApis({ supertest });
      return attackApis.create({ schedule, kibanaSpace });
    })
  );
  return { scheduleToCreate, createdSchedules };
};

export const deleteAllAttackDiscoverySchedules = async ({
  kibanaSpace = 'default',
  log,
  supertest,
}: {
  kibanaSpace?: string;
  log: ToolingLog;
  supertest: SuperTest.Agent;
}): Promise<void> => {
  const attackApis = getAttackDiscoverySchedulesApis({ supertest });
  await countDownTest(
    async () => {
      const bulkDeleteRoute = routeWithNamespace(
        '/internal/alerting/rules/_bulk_delete',
        kibanaSpace
      );
      await supertest
        .patch(bulkDeleteRoute)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .send({
          filter: `alert.attributes.alertTypeId:${ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID}`,
        });

      const { data, total } = await attackApis.find({
        query: { page: 0, perPage: 100 },
        kibanaSpace,
      });

      await Promise.all(
        (data as Array<{ id: string }>).map(({ id }) => {
          return attackApis.delete({ id, kibanaSpace });
        })
      );

      return {
        passed: total - data.length === 0,
      };
    },
    'deleteAllAttackDiscoverySchedules',
    log,
    50,
    1000
  );
};

export const getScheduleNotFoundError = (scheduleId: string) => {
  return {
    message: { error: `Saved object [alert/${scheduleId}] not found`, success: false },
    status_code: 404,
  };
};

export const getScheduleBadRequestError = (attributeName: string) => {
  return {
    error: 'Bad Request',
    message: `[request body]: ${attributeName}: Required`,
    statusCode: 400,
  };
};
