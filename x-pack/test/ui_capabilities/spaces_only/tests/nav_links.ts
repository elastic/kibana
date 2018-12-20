/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SpacesService } from '../../../common/services';
import { TestInvoker } from '../../../common/types';
import { navLinksBuilder } from '../../common/nav_links_builder';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { SpaceScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: TestInvoker) {
  const spacesService: SpacesService = getService('spaces');
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('navLinks', () => {
    before(async () => {
      for (const space of SpaceScenarios) {
        await spacesService.create(space);
      }
    });

    after(async () => {
      for (const space of SpaceScenarios) {
        await spacesService.delete(space.id);
      }
    });

    SpaceScenarios.forEach(scenario => {
      it(`${scenario.name}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get(null, scenario.id);
        switch (scenario.id) {
          case 'everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.all());
            break;
          case 'nothing_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.only('management'));
            break;
          case 'advanced_settings_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.all());
            break;
          case 'apm_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('apm'));
            break;
          case 'canvas_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('canvas'));
            break;
          case 'dashboard_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('dashboard'));
            break;
          case 'dev_tools_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('devTools'));
            break;
          case 'discover_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('discover'));
            break;
          case 'graph_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('graph'));
            break;
          case 'infrastructure_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('infrastructure'));
            break;
          case 'logs_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('logs'));
            break;
          case 'ml_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('ml'));
            break;
          case 'monitoring_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('monitoring'));
            break;
          case 'timelion_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('timelion'));
            break;
          case 'visualize_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.except('timelion'));
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
