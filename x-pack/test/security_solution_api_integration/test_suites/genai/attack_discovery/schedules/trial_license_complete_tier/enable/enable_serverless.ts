/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { ATTACK_DISCOVERY_SCHEDULES } from '@kbn/elastic-assistant-common';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllAttackDiscoverySchedules,
  enableAttackDiscoverySchedulesFeature,
  getMissingAssistantKibanaPrivilegesError,
} from '../../utils/helpers';
import { getAttackDiscoverySchedulesApis } from '../../utils/apis';
import { getSimpleAttackDiscoverySchedule } from '../../mocks';
import { noKibanaPrivileges, securitySolutionOnlyAllSpace2 } from '../../../../utils/auth/roles';
import { checkIfScheduleDisabled } from '../../utils/check_schedule_disabled';
import { checkIfScheduleEnabled } from '../../utils/check_schedule_enabled';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@serverless Enable - Serverless', () => {
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
        schedule: getSimpleAttackDiscoverySchedule({ enabled: false }),
        kibanaSpace: kibanaSpace1,
      });
    });

    describe('Happy path for predefined users', () => {
      const roles = [
        'viewer',
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
        it(`should enable a schedule in a non-default space with the role "${role}"`, async () => {
          const testAgent = await utils.createSuperTest(role);

          const apis = getAttackDiscoverySchedulesApis({ supertest: testAgent });

          await apis.enable({ id: createdSchedule.id, kibanaSpace: kibanaSpace1 });

          checkIfScheduleEnabled({
            getService,
            id: createdSchedule.id,
            kibanaSpace: kibanaSpace1,
          });
        });
      });
    });

    describe('RBAC', () => {
      it('should not be able to enable a schedule without `assistant` kibana privileges', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(noKibanaPrivileges);

        const apisNoPrivileges = getAttackDiscoverySchedulesApis({ supertest: superTest });

        const result = await apisNoPrivileges.enable({
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES}/${createdSchedule.id}/_enable`,
          })
        );

        checkIfScheduleDisabled({ getService, id: createdSchedule.id, kibanaSpace: kibanaSpace1 });
      });

      it('should not be able to enable a schedule in a space without kibana privileges for that space', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(securitySolutionOnlyAllSpace2);

        const apisOnlySpace2 = getAttackDiscoverySchedulesApis({ supertest: superTest });

        const result = await apisOnlySpace2.enable({
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES}/${createdSchedule.id}/_enable`,
          })
        );

        checkIfScheduleDisabled({ getService, id: createdSchedule.id, kibanaSpace: kibanaSpace1 });
      });
    });
  });
};
