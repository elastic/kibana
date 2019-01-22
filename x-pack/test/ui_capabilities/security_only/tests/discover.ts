/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('discover', () => {
    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          username: scenario.username,
          password: scenario.password,
        });
        switch (scenario.username) {
          // these users have a read/write view of Discover
          case 'no_kibana_privileges': // we're stuck with this one until post 7.0
          case 'superuser':
          case 'all':
          case 'legacy_all':
          case 'legacy_read':
          case 'dual_privileges_all':
          case 'discover_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('discover');
            expect(uiCapabilities.value!.discover).to.eql({
              show: true,
              save: true,
            });
            break;
          // these users have a read-only view of Discover
          case 'dual_privileges_read':
          case 'discover_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('discover');
            expect(uiCapabilities.value!.discover).to.eql({
              show: true,
              save: false,
            });
            break;
          // these users can't do anything with Discover
          case 'apm_all':
          case 'canvas_all':
          case 'canvas_read':
          case 'dashboard_all':
          case 'dashboard_read':
          case 'dev_tools_all':
          case 'graph_all':
          case 'graph_read':
          case 'gis_all':
          case 'gis_read':
          case 'infrastructure_all':
          case 'logs_all':
          case 'ml_all':
          case 'monitoring_all':
          case 'timelion_all':
          case 'timelion_read':
          case 'uptime_all':
          case 'visualize_all':
          case 'visualize_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('discover');
            expect(uiCapabilities.value!.discover).to.eql({
              show: false,
              save: false,
            });
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
