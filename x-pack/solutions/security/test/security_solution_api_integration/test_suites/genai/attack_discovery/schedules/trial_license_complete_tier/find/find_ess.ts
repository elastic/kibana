/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ATTACK_DISCOVERY_SCHEDULES_FIND } from '@kbn/elastic-assistant-common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createAttackDiscoverySchedules,
  deleteAllAttackDiscoverySchedules,
  enableAttackDiscoverySchedulesFeature,
  getMissingAssistantKibanaPrivilegesError,
} from '../../utils/helpers';
import { getAttackDiscoverySchedulesApis } from '../../utils/apis';
import { noKibanaPrivileges, secOnlySpace2, secOnlySpacesAll } from '../../../../utils/auth/users';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

  describe('@ess Find - ESS', () => {
    let createdSchedules: any[];
    const schedulesCount = 5;
    const kibanaSpace1 = 'space1';

    before(async () => {
      await enableAttackDiscoverySchedulesFeature(supertest);
    });

    beforeEach(async () => {
      await deleteAllAttackDiscoverySchedules({ supertest, log });
      await deleteAllAttackDiscoverySchedules({ supertest, log, kibanaSpace: kibanaSpace1 });

      const { createdSchedules: schedules } = await createAttackDiscoverySchedules({
        count: schedulesCount,
        supertest,
        kibanaSpace: kibanaSpace1,
      });
      createdSchedules = schedules;
    });

    describe('Happy path', () => {
      it('should find schedules in a non-default space', async () => {
        const apis = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpacesAll,
        });
        const results = await apis.find({ query: {}, kibanaSpace: kibanaSpace1 });

        expect(results).toEqual({
          data: expect.arrayContaining(createdSchedules),
          total: schedulesCount,
          page: 1,
          per_page: 10,
        });
      });
    });

    describe('RBAC', () => {
      it('should not be able to find schedules without `assistant` kibana privileges', async () => {
        const apisNoPrivileges = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: noKibanaPrivileges,
        });

        const result = await apisNoPrivileges.find({
          query: {},
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantKibanaPrivilegesError({
            routeDetails: `GET ${ATTACK_DISCOVERY_SCHEDULES_FIND}`,
          })
        );
      });

      it('should not be able to find schedules in a space without kibana privileges for that space', async () => {
        const apisOnlySpace2 = getAttackDiscoverySchedulesApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpace2,
        });

        const result = await apisOnlySpace2.find({
          query: {},
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantKibanaPrivilegesError({
            routeDetails: `GET ${ATTACK_DISCOVERY_SCHEDULES_FIND}`,
          })
        );
      });
    });
  });
};
