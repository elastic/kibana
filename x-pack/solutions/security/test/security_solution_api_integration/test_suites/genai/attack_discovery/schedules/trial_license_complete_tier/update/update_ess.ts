/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ATTACK_DISCOVERY_INTERNAL_SCHEDULES } from '@kbn/elastic-assistant-common';
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

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

  describe('@ess Update - ESS', () => {
    let createdSchedule: any;
    const kibanaSpace1 = 'space1';

    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
      await deleteAllAttackDiscoverySchedules({ supertest, log, kibanaSpace: kibanaSpace1 });

      // Create a new enabled schedule with the "super user" credentials
      const apisSuperuser = getAttackDiscoverySchedulesApis({ supertest });
      createdSchedule = await apisSuperuser.create({
        schedule: getSimpleAttackDiscoverySchedule(),
        kibanaSpace: kibanaSpace1,
      });
    });

    describe('Happy path', () => {
      it('should update a schedule by `id` in a non-default space', async () => {
        const apis = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpacesAll,
        });

        const scheduleToUpdate = {
          params: createdSchedule.params,
          schedule: createdSchedule.schedule,
          actions: createdSchedule.actions,
          name: 'Updated Schedule',
        };
        const updatedSchedule = await apis.update({
          id: createdSchedule.id,
          schedule: scheduleToUpdate,
          kibanaSpace: kibanaSpace1,
        });

        expect(updatedSchedule).toEqual(expect.objectContaining(scheduleToUpdate));
      });
    });

    describe('RBAC', () => {
      it('should not be able to update a schedule without `assistant` kibana privileges', async () => {
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: noKibanaPrivileges,
        });

        const scheduleToUpdate = {
          params: createdSchedule.params,
          schedule: createdSchedule.schedule,
          actions: createdSchedule.actions,
          name: 'Updated Schedule',
        };
        const result = await apisNoPrivileges.update({
          id: createdSchedule.id,
          schedule: scheduleToUpdate,
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantAndScheduleKibanaPrivilegesError({
            routeDetails: `PUT ${ATTACK_DISCOVERY_INTERNAL_SCHEDULES}/${createdSchedule.id}`,
          })
        );
      });

      it('should not be able to update a schedule without `update schedule` kibana privileges', async () => {
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpacesAllAttackDiscoveryMinimalAll,
        });

        const scheduleToUpdate = {
          params: createdSchedule.params,
          schedule: createdSchedule.schedule,
          actions: createdSchedule.actions,
          name: 'Updated Schedule',
        };
        const result = await apisNoPrivileges.update({
          id: createdSchedule.id,
          schedule: scheduleToUpdate,
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingScheduleKibanaPrivilegesError({
            routeDetails: `PUT ${ATTACK_DISCOVERY_INTERNAL_SCHEDULES}/${createdSchedule.id}`,
          })
        );
      });

      it('should not be able to update a schedule in a space without kibana privileges for that space', async () => {
        const apisOnlySpace2 = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpace2,
        });

        const scheduleToUpdate = {
          params: createdSchedule.params,
          schedule: createdSchedule.schedule,
          actions: createdSchedule.actions,
          name: 'Updated Schedule',
        };
        const result = await apisOnlySpace2.update({
          id: createdSchedule.id,
          schedule: scheduleToUpdate,
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantAndScheduleKibanaPrivilegesError({
            routeDetails: `PUT ${ATTACK_DISCOVERY_INTERNAL_SCHEDULES}/${createdSchedule.id}`,
          })
        );
      });
    });
  });
};
