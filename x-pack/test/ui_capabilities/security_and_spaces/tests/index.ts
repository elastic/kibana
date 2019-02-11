/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesService } from '../../../common/services';
import { SecurityService } from '../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { isCustomRoleSpecification } from '../../common/types';
import { Spaces, Users } from '../scenarios';

// tslint:disable:no-default-export
export default function uiCapabilitesTests({
  loadTestFile,
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const securityService: SecurityService = getService('security');
  const spacesService: SpacesService = getService('spaces');

  describe('ui capabilities', function() {
    this.tags('ciGroup5');

    before(async () => {
      for (const space of Spaces) {
        await spacesService.create(space);
      }

      for (const user of Users) {
        const roles = [...(user.role ? [user.role] : []), ...(user.roles ? user.roles : [])];

        await securityService.user.create(user.username, {
          password: user.password,
          full_name: user.fullName,
          roles: roles.map(role => role.name),
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
      for (const space of Spaces) {
        await spacesService.delete(space.id);
      }

      for (const user of Users) {
        await securityService.user.delete(user.username);

        const roles = [...(user.role ? [user.role] : []), ...(user.roles ? user.roles : [])];
        for (const role of roles) {
          if (isCustomRoleSpecification(role)) {
            await securityService.role.delete(role.name);
          }
        }
      }
    });

    loadTestFile(require.resolve('./advanced_settings'));
    loadTestFile(require.resolve('./canvas'));
    loadTestFile(require.resolve('./dashboard'));
    loadTestFile(require.resolve('./discover'));
    loadTestFile(require.resolve('./maps'));
    loadTestFile(require.resolve('./nav_links'));
    loadTestFile(require.resolve('./timelion'));
  });
}
