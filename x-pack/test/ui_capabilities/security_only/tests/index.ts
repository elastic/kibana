/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { isCustomRoleSpecification } from '../../common/types';
import { UserScenarios } from '../scenarios';

export default function uiCapabilitesTests({ loadTestFile, getService }: FtrProviderContext) {
  const securityService = getService('security');

  describe('ui capabilities', function () {
    this.tags('ciGroup9');

    before(async () => {
      for (const user of UserScenarios) {
        const roles = [...(user.role ? [user.role] : []), ...(user.roles ? user.roles : [])];

        await securityService.user.create(user.username, {
          password: user.password,
          full_name: user.fullName,
          roles: roles.map((role) => role.name),
        });

        for (const role of roles) {
          if (isCustomRoleSpecification(role)) {
            await securityService.role.create(role.name, {
              kibana: role.kibana,
            });
          }
        }
      }
    });

    after(async () => {
      for (const user of UserScenarios) {
        await securityService.user.delete(user.username);

        const roles = [...(user.role ? [user.role] : []), ...(user.roles ? user.roles : [])];
        for (const role of roles) {
          if (isCustomRoleSpecification(role)) {
            await securityService.role.delete(role.name);
          }
        }
      }
    });

    loadTestFile(require.resolve('./catalogue'));
    loadTestFile(require.resolve('./foo'));
    loadTestFile(require.resolve('./nav_links'));
  });
}
