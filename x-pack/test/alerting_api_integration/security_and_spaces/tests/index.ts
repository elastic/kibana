/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { isCustomRoleSpecification } from '../../common/types';
import { Spaces, Users } from '../scenarios';

export async function setupSpacesAndUsers(
  spacesService: ReturnType<FtrProviderContext['getService']>,
  securityService: ReturnType<FtrProviderContext['getService']>
) {
  for (const space of Spaces) {
    await spacesService.create(space);
  }

  for (const user of Users) {
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
          elasticsearch: role.elasticsearch,
        });
      }
    }
  }
}

export async function tearDownUsers(securityService: ReturnType<FtrProviderContext['getService']>) {
  for (const user of Users) {
    await securityService.user.delete(user.username);

    const roles = [...(user.role ? [user.role] : []), ...(user.roles ? user.roles : [])];
    for (const role of roles) {
      if (isCustomRoleSpecification(role)) {
        await securityService.role.delete(role.name);
      }
    }
  }
}

// eslint-disable-next-line import/no-default-export
export default function alertingApiIntegrationTests({
  loadTestFile,
  getService,
}: FtrProviderContext) {
  describe('alerting api integration security and spaces enabled', function () {
    this.tags('ciGroup5');

    loadTestFile(require.resolve('./actions'));
    loadTestFile(require.resolve('./alerting'));
  });
}
