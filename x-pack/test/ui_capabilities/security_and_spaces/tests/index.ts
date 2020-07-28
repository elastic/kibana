/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { FeaturesService } from '../../common/services';
import { isCustomRoleSpecification } from '../../common/types';
import { Spaces, Users } from '../scenarios';

export default function uiCapabilitiesTests({ loadTestFile, getService }: FtrProviderContext) {
  const securityService = getService('security');
  const spacesService = getService('spaces');
  const featuresService: FeaturesService = getService('features');

  describe('ui capabilities', function () {
    this.tags('ciGroup9');

    before(async () => {
      const features = await featuresService.get();
      for (const space of Spaces) {
        const disabledFeatures =
          space.disabledFeatures === '*' ? Object.keys(features) : space.disabledFeatures;
        await spacesService.create({
          ...space,
          disabledFeatures,
        });
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

    loadTestFile(require.resolve('./catalogue'));
    loadTestFile(require.resolve('./foo'));
    loadTestFile(require.resolve('./nav_links'));
  });
}
