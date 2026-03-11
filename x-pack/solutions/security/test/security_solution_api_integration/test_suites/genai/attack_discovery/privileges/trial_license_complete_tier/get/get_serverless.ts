/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { getAttackDiscoveryMissingPrivilegesApis } from '../../utils/apis';
import {
  allIndexPrivileges,
  noAdhocIndexPrivileges,
  noAttacksIndexPrivileges,
  noIndexPrivileges,
} from '../../utils/roles';

export default ({ getService }: FtrProviderContext) => {
  const utils = getService('securitySolutionUtils');

  describe('@serverless Get Missing Privileges - Serverless', () => {
    describe('Predefined roles', () => {
      const roles = [
        'editor',
        ROLES.rule_author,
        ROLES.soc_manager,
        ROLES.detections_admin,
        ROLES.platform_engineer,
      ];
      roles.forEach((role) => {
        it(`should return empty missing privileges for the role "${role}"`, async () => {
          const testAgent = await utils.createSuperTest(role);

          const apis = getAttackDiscoveryMissingPrivilegesApis({ supertest: testAgent });
          const missingPrivileges = await apis.get({});

          expect(missingPrivileges).toEqual([]);
        });
      });

      it('should return missing privileges for the role "viewer"', async () => {
        const testAgent = await utils.createSuperTest('viewer');

        const apis = getAttackDiscoveryMissingPrivilegesApis({ supertest: testAgent });
        const missingPrivileges = await apis.get({});

        expect(missingPrivileges).toEqual([
          {
            index_name: '.alerts-security.attack.discovery.alerts-default',
            privileges: ['write', 'maintenance'],
          },
          {
            index_name: '.adhoc.alerts-security.attack.discovery.alerts-default',
            privileges: ['write', 'maintenance'],
          },
        ]);
      });

      it(`should return missing privileges for the role "${ROLES.t1_analyst}"`, async () => {
        const testAgent = await utils.createSuperTest(ROLES.t1_analyst);

        const apis = getAttackDiscoveryMissingPrivilegesApis({ supertest: testAgent });
        const missingPrivileges = await apis.get({});

        expect(missingPrivileges).toEqual([
          {
            index_name: '.alerts-security.attack.discovery.alerts-default',
            privileges: ['view_index_metadata'],
          },
          {
            index_name: '.adhoc.alerts-security.attack.discovery.alerts-default',
            privileges: ['read', 'write', 'view_index_metadata', 'maintenance'],
          },
        ]);
      });

      it(`should return missing privileges for the role "${ROLES.t2_analyst}"`, async () => {
        const testAgent = await utils.createSuperTest(ROLES.t2_analyst);

        const apis = getAttackDiscoveryMissingPrivilegesApis({ supertest: testAgent });
        const missingPrivileges = await apis.get({});

        expect(missingPrivileges).toEqual([
          {
            index_name: '.alerts-security.attack.discovery.alerts-default',
            privileges: ['view_index_metadata'],
          },
          {
            index_name: '.adhoc.alerts-security.attack.discovery.alerts-default',
            privileges: ['read', 'write', 'view_index_metadata', 'maintenance'],
          },
        ]);
      });

      it(`should return missing privileges for the role "${ROLES.t3_analyst}"`, async () => {
        const testAgent = await utils.createSuperTest(ROLES.t3_analyst);

        const apis = getAttackDiscoveryMissingPrivilegesApis({ supertest: testAgent });
        const missingPrivileges = await apis.get({});

        expect(missingPrivileges).toEqual([
          {
            index_name: '.alerts-security.attack.discovery.alerts-default',
            privileges: ['view_index_metadata'],
          },
          {
            index_name: '.adhoc.alerts-security.attack.discovery.alerts-default',
            privileges: ['read', 'write', 'view_index_metadata', 'maintenance'],
          },
        ]);
      });
    });

    describe('Custom roles', () => {
      it('should return empty missing privileges for the user with access to all attacks indices', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(allIndexPrivileges);

        const apis = getAttackDiscoveryMissingPrivilegesApis({ supertest: superTest });
        const missingPrivileges = await apis.get({});

        expect(missingPrivileges).toEqual([]);
      });

      it('should return missing privileges for the user with no access to adhoc indices', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(noAdhocIndexPrivileges);

        const apis = getAttackDiscoveryMissingPrivilegesApis({ supertest: superTest });
        const missingPrivileges = await apis.get({});

        expect(missingPrivileges).toEqual([
          {
            index_name: '.adhoc.alerts-security.attack.discovery.alerts-default',
            privileges: ['read', 'write', 'view_index_metadata', 'maintenance'],
          },
        ]);
      });

      it('should return missing privileges for the user with no access to attacks indices', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(noAttacksIndexPrivileges);

        const apis = getAttackDiscoveryMissingPrivilegesApis({ supertest: superTest });
        const missingPrivileges = await apis.get({});

        expect(missingPrivileges).toEqual([
          {
            index_name: '.alerts-security.attack.discovery.alerts-default',
            privileges: ['read', 'write', 'view_index_metadata', 'maintenance'],
          },
        ]);
      });

      it('should return missing privileges for the user with no access to adhoc and attacks indices', async () => {
        const superTest = await utils.createSuperTestWithCustomRole(noIndexPrivileges);

        const apis = getAttackDiscoveryMissingPrivilegesApis({ supertest: superTest });
        const missingPrivileges = await apis.get({});

        expect(missingPrivileges).toEqual([
          {
            index_name: '.alerts-security.attack.discovery.alerts-default',
            privileges: ['read', 'write', 'view_index_metadata', 'maintenance'],
          },
          {
            index_name: '.adhoc.alerts-security.attack.discovery.alerts-default',
            privileges: ['read', 'write', 'view_index_metadata', 'maintenance'],
          },
        ]);
      });
    });
  });
};
