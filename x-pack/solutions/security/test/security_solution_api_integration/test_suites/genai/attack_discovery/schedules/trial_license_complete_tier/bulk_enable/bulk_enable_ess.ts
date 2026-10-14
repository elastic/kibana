/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ATTACK_DISCOVERY_SCHEDULES_BULK_ENABLE } from '@kbn/elastic-assistant-common';
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

  describe('@ess Bulk enable - ESS', () => {
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
        schedule: getSimpleAttackDiscoverySchedule(),
        kibanaSpace: kibanaSpace1,
      });
    });

    describe('Happy path', () => {
      it('should bulk enable schedules in a non-default space', async () => {
        const apis = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpacesAll,
        });

        const result = await apis.bulkEnable({
          ids: [createdSchedule.id],
          kibanaSpace: kibanaSpace1,
        });

        expect(result.ids).toEqual([createdSchedule.id]);
        await checkIfScheduleEnabled({
          getService,
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
        });
      });
    });

    describe('RBAC', () => {
      it('should not be able to bulk enable schedules without `assistant` kibana privileges', async () => {
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: noKibanaPrivileges,
        });

        const result = await apisNoPrivileges.bulkEnable({
          ids: [createdSchedule.id],
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantAndScheduleKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES_BULK_ENABLE}`,
          })
        );

        await checkIfScheduleDisabled({
          getService,
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
        });
      });

      it('should not be able to bulk enable schedules without `update schedule` kibana privileges', async () => {
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpacesAllAttackDiscoveryMinimalAll,
        });

        const result = await apisNoPrivileges.bulkEnable({
          ids: [createdSchedule.id],
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingScheduleKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES_BULK_ENABLE}`,
          })
        );

        await checkIfScheduleDisabled({
          getService,
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
        });
      });

      it('should not be able to bulk enable schedules in a space without kibana privileges for that space', async () => {
        const apisOnlySpace2 = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpace2,
        });

        const result = await apisOnlySpace2.bulkEnable({
          ids: [createdSchedule.id],
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantAndScheduleKibanaPrivilegesError({
            routeDetails: `POST ${ATTACK_DISCOVERY_SCHEDULES_BULK_ENABLE}`,
          })
        );

        await checkIfScheduleDisabled({
          getService,
          id: createdSchedule.id,
          kibanaSpace: kibanaSpace1,
        });
      });
    });
  });
};
