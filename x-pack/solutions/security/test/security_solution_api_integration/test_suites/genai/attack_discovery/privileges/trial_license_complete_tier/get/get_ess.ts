/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../utils/auth';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { getAttackDiscoveryMissingPrivilegesApis } from '../../utils/apis';
import { roles } from '../../utils/roles';
import {
  users,
  allIndexPrivilegesUser,
  noAdhocIndexPrivilegesUser,
  noAttacksIndexPrivilegesUser,
  noIndexPrivilegesUser,
} from '../../utils/users';

export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('@ess Get Missing Privileges - ESS', () => {
    before(async () => {
      await createUsersAndRoles(getService, users, roles);
    });

    after(async () => {
      await deleteUsersAndRoles(getService, users, roles);
    });

    it('should return empty missing privileges for the user with access to all attacks indices', async () => {
      const apis = getAttackDiscoveryMissingPrivilegesApis({
        supertest: supertestWithoutAuth,
        user: allIndexPrivilegesUser,
      });

      const missingPrivileges = await apis.get({});

      expect(missingPrivileges).toEqual([]);
    });

    it('should return missing privileges for the user with no access to adhoc indices', async () => {
      const apis = getAttackDiscoveryMissingPrivilegesApis({
        supertest: supertestWithoutAuth,
        user: noAdhocIndexPrivilegesUser,
      });

      const missingPrivileges = await apis.get({});

      expect(missingPrivileges).toEqual([
        {
          index_name: '.adhoc.alerts-security.attack.discovery.alerts-default',
          privileges: ['read', 'write', 'view_index_metadata', 'maintenance'],
        },
      ]);
    });

    it('should return missing privileges for the user with no access to attacks indices', async () => {
      const apis = getAttackDiscoveryMissingPrivilegesApis({
        supertest: supertestWithoutAuth,
        user: noAttacksIndexPrivilegesUser,
      });

      const missingPrivileges = await apis.get({});

      expect(missingPrivileges).toEqual([
        {
          index_name: '.alerts-security.attack.discovery.alerts-default',
          privileges: ['read', 'write', 'view_index_metadata', 'maintenance'],
        },
      ]);
    });

    it('should return missing privileges for the user with no access to adhoc and attacks indices', async () => {
      const apis = getAttackDiscoveryMissingPrivilegesApis({
        supertest: supertestWithoutAuth,
        user: noIndexPrivilegesUser,
      });

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
};
