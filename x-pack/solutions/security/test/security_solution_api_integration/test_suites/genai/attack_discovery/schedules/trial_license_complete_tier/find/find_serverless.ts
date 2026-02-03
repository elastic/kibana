/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { ATTACK_DISCOVERY_SCHEDULES_FIND } from '@kbn/elastic-assistant-common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createAttackDiscoverySchedules,
  deleteAllAttackDiscoverySchedules,
  enableAttackDiscoverySchedulesFeature,
  getMissingAssistantKibanaPrivilegesError,
} from '../../utils/helpers';
import { getAttackDiscoverySchedulesApis } from '../../utils/apis';
import { noKibanaPrivileges, securitySolutionOnlyAllSpace2 } from '../../../../utils/auth/roles';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@serverless Find - Serverless', () => {
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
        it(`should find schedules in a non-default space with the role "${role}"`, async () => {
          const testAgent = await utils.createSuperTest(role);

          const apis = getAttackDiscoverySchedulesApis({ supertest: testAgent });

          const results = await apis.find({ query: {}, kibanaSpace: kibanaSpace1 });

          expect(results).toEqual({
            data: expect.arrayContaining(createdSchedules),
            total: schedulesCount,
            page: 1,
            per_page: 10,
          });
        });
      });
    });

    describe('RBAC', () => {
      it('should not be able to find schedules without `assistant` kibana privileges', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(noKibanaPrivileges);

        const apisNoPrivileges = getAttackDiscoverySchedulesApis({ supertest: superTest });

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
        const superTest = await utils.createSuperTestWithCustomRole(securitySolutionOnlyAllSpace2);

        const apisOnlySpace2 = getAttackDiscoverySchedulesApis({ supertest: superTest });

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
