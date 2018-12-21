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
          case 'legacy_all':
          case 'legacy_read':
          case 'dual_privileges_all':
          case 'dual_privileges_read':
          case 'no_kibana_privileges': // we're stuck with this one until post 7.0
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.all());
            break;
          case 'apm_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('apm', 'management')
            );
            break;
          case 'canvas_all':
          case 'canvas_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('canvas', 'management')
            );
            break;
          case 'dashboard_all':
          case 'dashboard_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('dashboard', 'management')
            );
            break;

          case 'dev_tools_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('devTools', 'management')
            );
            break;
          case 'discover_all':
          case 'discover_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('discover', 'management')
            );
            break;
          case 'graph_all':
          case 'graph_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('graph', 'management')
            );
            break;
          case 'gis_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('gis', 'management')
            );
            break;
          case 'infrastructure_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('infrastructure', 'management')
            );
            break;
          case 'logs_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('logs', 'management')
            );
            break;
          case 'ml_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.only('ml', 'management'));
            break;
          case 'monitoring_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('monitoring', 'management')
            );
            break;
          case 'timelion_all':
          case 'timelion_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('timelion', 'management')
            );
            break;
          case 'visualize_all':
          case 'visualize_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('visualize', 'management')
            );
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
