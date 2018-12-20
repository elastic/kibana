/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SpacesService } from '../../../common/services';
import { SecurityService } from '../../../common/services';
import { TestInvoker } from '../../../common/types';
import { navLinksBuilder } from '../../common/nav_links_builder';
import {
  GetUICapabilitiesFailureReason,
  UICapabilitiesService,
} from '../../common/services/ui_capabilities';
import { isCustomRoleSpecification } from '../../common/types';
import { Spaces, UserAtSpaceScenarios, Users } from '../scenarios';

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: TestInvoker) {
  const securityService: SecurityService = getService('security');
  const spacesService: SpacesService = getService('spaces');
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('navLinks', () => {
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

    UserAtSpaceScenarios.forEach(scenario => {
      it(`${scenario.id}`, async () => {
        const { user, space } = scenario;

        const uiCapabilities = await uiCapabilitiesService.get(
          { username: user.username, password: user.password },
          space.id
        );
        switch (scenario.id) {
          case 'superuser_at_space_with_all_features':
          case 'global_all_at_space_with_all_features':
          case 'legacy_all_at_space_with_all_features':
          case 'legacy_read_at_space_with_all_features':
          case 'dual_privileges_all_at_space_with_all_features':
          case 'dual_privileges_read_at_space_with_all_features':
          case 'global_read_at_space_with_all_features':
          case 'space_with_all_features_all_at_space_with_all_features':
          case 'space_with_all_features_read_at_space_with_all_features':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.all());
            break;
          case 'superuser_at_space_with_no_features':
          case 'global_all_at_space_with_no_features':
          case 'legacy_all_at_space_with_no_features':
          case 'legacy_read_at_space_with_no_features':
          case 'dual_privileges_all_at_space_with_no_features':
          case 'dual_privileges_read_at_space_with_no_features':
          case 'global_read_at_space_with_no_features':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.only('management'));
            break;
          case 'space_with_all_features_all_at_space_with_no_features':
          case 'space_with_all_features_read_at_space_with_no_features':
            expect(uiCapabilities.success).to.be(false);
            expect(uiCapabilities.failureReason).to.be(
              GetUICapabilitiesFailureReason.RedirectedToRoot
            );
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
