/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SecurityService } from '../../../common/services';
import { TestInvoker } from '../../../common/types';
import { navLinksBuilder } from '../../common/nav_links_builder';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { isCustomRoleSpecification } from '../../common/types';
import { UserScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: TestInvoker) {
  const securityService: SecurityService = getService('security');
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('navLinks', () => {
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

    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          username: scenario.username,
          password: scenario.password,
        });
        switch (scenario.username) {
          case 'superuser':
          case 'all':
            expect(uiCapabilities).to.have.property('navLinks');
            expect(uiCapabilities!.navLinks).to.eql(navLinksBuilder.all());
            break;
          case 'discover_all':
          case 'discover_read':
            expect(uiCapabilities).to.have.property('navLinks');
            expect(uiCapabilities!.navLinks).to.eql(navLinksBuilder.only('discover', 'management'));
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
