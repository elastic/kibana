/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { replaceParams } from '@kbn/openapi-common/shared';
import { ATTACK_DISCOVERY_SCHEDULES_BY_ID } from '@kbn/elastic-assistant-common';
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
  securitySolutionOnlyAllSpace2,
  securitySolutionOnlyAllSpacesAllAttackDiscoveryMinimalAll,
} from '../../../../utils/auth/roles';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@serverless Update - Serverless', () => {
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

    describe('Happy path for predefined users', () => {
      const roles = [
        'editor',
        ROLES.t1_analyst,
        ROLES.t2_analyst,
        ROLES.t3_analyst,
        ROLES.rule_author,
        ROLES.soc_manager,
        ROLES.detections_admin,
        ROLES.platform_engineer,
      ];

      roles.forEach((role) => {
        it(`should update a schedule in a non-default space with the role "${role}"`, async () => {
          const testAgent = await utils.createSuperTest(role);

          const apis = getAttackDiscoverySchedulesApis({ supertest: testAgent });

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
    });

    describe('RBAC', () => {
      it('should not be able to update a schedule with the "viewer" role', async () => {
        const testAgent = await utils.createSuperTest('viewer');

        const apis = getAttackDiscoverySchedulesApis({ supertest: testAgent });

        const scheduleToUpdate = {
          params: createdSchedule.params,
          schedule: createdSchedule.schedule,
          actions: createdSchedule.actions,
          name: 'Updated Schedule',
        };
        const result = await apis.update({
          id: createdSchedule.id,
          schedule: scheduleToUpdate,
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingScheduleKibanaPrivilegesError({
            routeDetails: `PUT ${replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, {
              id: createdSchedule.id,
            })}`,
          })
        );
      });

      it('should not be able to update a schedule without `assistant` kibana privileges', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(noKibanaPrivileges);

        const apisNoPrivileges = getAttackDiscoverySchedulesApis({ supertest: superTest });

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
            routeDetails: `PUT ${replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, {
              id: createdSchedule.id,
            })}`,
          })
        );
      });

      it('should not be able to update a schedule without `update schedule` kibana privileges', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(
          securitySolutionOnlyAllSpacesAllAttackDiscoveryMinimalAll
        );

        const apisNoPrivileges = getAttackDiscoverySchedulesApis({ supertest: superTest });

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
            routeDetails: `PUT ${replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, {
              id: createdSchedule.id,
            })}`,
          })
        );
      });

      it('should not be able to update a schedule in a space without kibana privileges for that space', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(securitySolutionOnlyAllSpace2);

        const apisOnlySpace2 = getAttackDiscoverySchedulesApis({ supertest: superTest });

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
            routeDetails: `PUT ${replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, {
              id: createdSchedule.id,
            })}`,
          })
        );
      });
    });
  });
};
