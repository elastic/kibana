/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityService } from '../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { isCustomRoleSpecification } from '../../common/types';
import { UserScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function uiCapabilitesTests({
  loadTestFile,
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const securityService: SecurityService = getService('security');

  describe('ui capabilities', function() {
    this.tags('ciGroup5');

    before(async () => {
      for (const user of UserScenarios) {
        await securityService.user.create(user.username, {
          password: user.password,
          full_name: user.fullName,
          roles: [user.role.name],
        });
        if (isCustomRoleSpecification(user.role)) {
          await securityService.role.create(user.role.name, {
            kibana: user.role.kibana,
          });
        }
      }
    });

    after(async () => {
      for (const user of UserScenarios) {
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
