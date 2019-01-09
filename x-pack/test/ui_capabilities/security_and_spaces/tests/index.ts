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
        await securityService.user.create(user.username, {
          password: user.password,
          full_name: user.fullName,
          roles: [user.role.name],
        });
        if (isCustomRoleSpecification(user.role)) {
          await securityService.role.create(user.role.name, {
            elasticsearch: user.role.elasticsearch,
            kibana: user.role.kibana,
          });
        }
      }
    });

    after(async () => {
      for (const space of Spaces) {
        await spacesService.delete(space.id);
      }

      for (const user of Users) {
        await securityService.user.delete(user.username);
        if (isCustomRoleSpecification(user.role)) {
          await securityService.role.delete(user.role.name);
        }
      }
    });

    loadTestFile(require.resolve('./nav_links'));
    loadTestFile(require.resolve('./discover'));
  });
}
