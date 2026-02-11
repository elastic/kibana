/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ATTACK_DISCOVERY_SCHEDULES } from '@kbn/elastic-assistant-common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllAttackDiscoverySchedules,
  enableAttackDiscoverySchedulesFeature,
  getMissingAssistantAndScheduleKibanaPrivilegesError,
  getMissingScheduleKibanaPrivilegesError,
} from '../../utils/helpers';
import { getAttackDiscoverySchedulesApis } from '../../utils/apis';
import { getSimpleAttackDiscoverySchedule } from '../../mocks';
import {
  noKibanaPrivileges,
  secOnlySpace2,
  secOnlySpacesAll,
  secOnlySpacesAllAttackDiscoveryMinimalAll,
} from '../../../../utils/auth/users';
import { checkIfScheduleExists } from '../../utils/check_schedule_exists';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

  describe('@ess Create - ESS', () => {
    const kibanaSpace1 = 'space1';

    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
      await deleteAllAttackDiscoverySchedules({ supertest, log, kibanaSpace: kibanaSpace1 });
    });

    describe('Happy path', () => {
      it('should create a new schedule in a non-default space', async () => {
        const apis = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpacesAll,
        });

        const schedule = await apis.create({
          schedule: getSimpleAttackDiscoverySchedule(),
          kibanaSpace: kibanaSpace1,
        });

        const mockSchedule = getSimpleAttackDiscoverySchedule();
        const { name, enabled, schedule: mockInterval, actions, params } = mockSchedule;
        expect(schedule).toEqual(
          expect.objectContaining({
            actions,
            created_by: secOnlySpacesAll.username,
            enabled,
            name,
            params: expect.objectContaining({
              alerts_index_pattern: params.alerts_index_pattern,
              api_config: params.api_config,
              end: params.end,
              size: params.size,
              start: params.start,
            }),
            schedule: mockInterval,
            updated_by: secOnlySpacesAll.username,
          })
        );

        await checkIfScheduleExists({ getService, id: schedule.id, kibanaSpace: kibanaSpace1 });
      });
    });

    describe('RBAC', () => {
      it('should not be able to create a schedule without `assistant` kibana privileges', async () => {
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: noKibanaPrivileges,
        });

        const result = await apisNoPrivileges.create({
          schedule: getSimpleAttackDiscoverySchedule(),
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantAndScheduleKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES}`,
          })
        );
      });

      it('should not be able to create a schedule without `update schedule` kibana privileges', async () => {
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpacesAllAttackDiscoveryMinimalAll,
        });

        const result = await apisNoPrivileges.create({
          schedule: getSimpleAttackDiscoverySchedule(),
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingScheduleKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES}`,
          })
        );
      });

      it('should not be able to create a schedule in a space without kibana privileges for that space', async () => {
        const apisOnlySpace2 = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpace2,
        });

        const result = await apisOnlySpace2.create({
          schedule: getSimpleAttackDiscoverySchedule(),
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantAndScheduleKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES}`,
          })
        );
      });
    });
  });
};
