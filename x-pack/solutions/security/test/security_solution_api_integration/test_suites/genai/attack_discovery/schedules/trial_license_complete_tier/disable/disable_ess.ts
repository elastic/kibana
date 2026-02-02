/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { replaceParams } from '@kbn/openapi-common/shared';
import { ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE } from '@kbn/elastic-assistant-common';
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
import { checkIfScheduleEnabled } from '../../utils/check_schedule_enabled';
import { checkIfScheduleDisabled } from '../../utils/check_schedule_disabled';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

  describe('@ess Disable - ESS', () => {
    let createdSchedule: any;
    const kibanaSpace1 = 'space1';

    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
      await deleteAllAttackDiscoverySchedules({ supertest, log, kibanaSpace: kibanaSpace1 });

      // Create a new disabled schedule with the "super user" credentials
      const apisSuperuser = getAttackDiscoverySchedulesApis({ supertest });
      createdSchedule = await apisSuperuser.create({
        schedule: getSimpleAttackDiscoverySchedule({ enabled: true }),
        kibanaSpace: kibanaSpace1,
      });
    });

    describe('Happy path', () => {
      it('should disable a schedule by `id` in a non-default space', async () => {
        // Disable schedule by a non-superuser with access to `spec1`
        const apis = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpacesAll,
        });
        await apis.disable({
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
        });

        await checkIfScheduleDisabled({
          getService,
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
        });
      });
    });

    describe('RBAC', () => {
      it('should not be able to disable a schedule without `assistant` kibana privileges', async () => {
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: noKibanaPrivileges,
        });

        const result = await apisNoPrivileges.disable({
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantAndScheduleKibanaPrivilegesError({
            routeDetails: `POST ${replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE, {
              id: createdSchedule.id,
            })}`,
          })
        );

        checkIfScheduleEnabled({ getService, id: createdSchedule.id, kibanaSpace: kibanaSpace1 });
      });

      it('should not be able to disable a schedule without `update schedule` kibana privileges', async () => {
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpacesAllAttackDiscoveryMinimalAll,
        });

        const result = await apisNoPrivileges.disable({
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingScheduleKibanaPrivilegesError({
            routeDetails: `POST ${replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE, {
              id: createdSchedule.id,
            })}`,
          })
        );

        checkIfScheduleEnabled({ getService, id: createdSchedule.id, kibanaSpace: kibanaSpace1 });
      });

      it('should not be able to disable a schedule in a space without kibana privileges for that space', async () => {
        const apisOnlySpace2 = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpace2,
        });

        const result = await apisOnlySpace2.disable({
          id: createdSchedule.id,
          kibanaSpace: 'space1',
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantAndScheduleKibanaPrivilegesError({
            routeDetails: `POST ${replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE, {
              id: createdSchedule.id,
            })}`,
          })
        );

        checkIfScheduleEnabled({ getService, id: createdSchedule.id, kibanaSpace: kibanaSpace1 });
      });
    });
  });
};
