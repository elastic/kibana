/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { ATTACK_DISCOVERY_SCHEDULES_BULK_DISABLE } from '@kbn/elastic-assistant-common';
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
import { checkIfScheduleEnabled } from '../../utils/check_schedule_enabled';
import { checkIfScheduleDisabled } from '../../utils/check_schedule_disabled';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@serverless Bulk disable - Serverless', () => {
    let createdSchedule: { id: string };
    const kibanaSpace1 = 'space1';

    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
      await deleteAllAttackDiscoverySchedules({ supertest, log, kibanaSpace: kibanaSpace1 });

      const apisSuperuser = getAttackDiscoverySchedulesApis({ supertest });
      createdSchedule = await apisSuperuser.create({
        schedule: getSimpleAttackDiscoverySchedule({ enabled: true }),
        kibanaSpace: kibanaSpace1,
      });
    });

    describe('Happy path for predefined users', () => {
      const roles = [
        'editor',
        ROLES.t3_analyst,
        ROLES.rule_author,
        ROLES.soc_manager,
        ROLES.detections_admin,
        ROLES.platform_engineer,
      ];

      roles.forEach((role) => {
        it(`should bulk disable schedules in a non-default space with the role "${role}"`, async () => {
          const testAgent = await utils.createSuperTest(role);
          const apis = getAttackDiscoverySchedulesApis({ supertest: testAgent });

          const result = await apis.bulkDisable({
            ids: [createdSchedule.id],
            kibanaSpace: kibanaSpace1,
          });

          expect(result.ids).toEqual([createdSchedule.id]);
          await checkIfScheduleDisabled({
            getService,
            id: createdSchedule.id,
            kibanaSpace: kibanaSpace1,
          });
        });
      });
    });

    describe('RBAC', () => {
      // These roles have `securitySolutionAttackDiscovery: minimal_all`, which grants read-only
      // Attack Discovery access without the schedule management privilege, so they cannot bulk
      // disable schedules (mirroring their read-only Rule privileges).
      const minimalAllRoles = ['viewer', ROLES.t1_analyst, ROLES.t2_analyst];

      minimalAllRoles.forEach((role) => {
        it(`should not be able to bulk disable schedules with the "${role}" role`, async () => {
          const testAgent = await utils.createSuperTest(role);
          const apis = getAttackDiscoverySchedulesApis({ supertest: testAgent });

          const result = await apis.bulkDisable({
            ids: [createdSchedule.id],
            kibanaSpace: kibanaSpace1,
            expectedHttpCode: 403,
          });

          expect(result).toEqual(
            getMissingScheduleKibanaPrivilegesError({
              routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES_BULK_DISABLE}`,
            })
          );

          await checkIfScheduleEnabled({
            getService,
            id: createdSchedule.id,
            kibanaSpace: kibanaSpace1,
          });
        });
      });

      it('should not be able to bulk disable schedules without `assistant` kibana privileges', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(noKibanaPrivileges);
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({ supertest: superTest });

        const result = await apisNoPrivileges.bulkDisable({
          ids: [createdSchedule.id],
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantAndScheduleKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES_BULK_DISABLE}`,
          })
        );

        await checkIfScheduleEnabled({
          getService,
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
        });
      });

      it('should not be able to bulk disable schedules without `update schedule` kibana privileges', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(
          securitySolutionOnlyAllSpacesAllAttackDiscoveryMinimalAll
        );
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({ supertest: superTest });

        const result = await apisNoPrivileges.bulkDisable({
          ids: [createdSchedule.id],
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingScheduleKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES_BULK_DISABLE}`,
          })
        );

        await checkIfScheduleEnabled({
          getService,
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
        });
      });

      it('should not be able to bulk disable schedules in a space without kibana privileges for that space', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(securitySolutionOnlyAllSpace2);
        const apisOnlySpace2 = getAttackDiscoverySchedulesApis({ supertest: superTest });

        const result = await apisOnlySpace2.bulkDisable({
          ids: [createdSchedule.id],
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantAndScheduleKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES_BULK_DISABLE}`,
          })
        );

        await checkIfScheduleEnabled({
          getService,
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
        });
      });
    });
  });
};
