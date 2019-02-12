/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { UICapabilities } from 'ui/capabilities';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { SpaceScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('graph', () => {
    SpaceScenarios.forEach(scenario => {
      it(`${scenario.name}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get(null, scenario.id);
        const capabilities: UICapabilities = uiCapabilities.value as UICapabilities;
        switch (scenario.id) {
          case 'everything_space':
          case 'apm_disabled_space':
          case 'advanced_settings_disabled_space':
          case 'canvas_disabled_space':
          case 'dashboard_disabled_space':
          case 'dev_tools_disabled_space':
          case 'discover_disabled_space':
          case 'maps_disabled_space':
          case 'infrastructure_disabled_space':
          case 'logs_disabled_space':
          case 'ml_disabled_space':
          case 'monitoring_disabled_space':
          case 'timelion_disabled_space':
          case 'uptime_disabled_space':
          case 'visualize_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(capabilities).to.have.property('graph');
            expect(capabilities!.graph).to.eql({
              save: true,
              delete: true,
            });
            break;
          case 'nothing_space':
          case 'graph_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(capabilities).to.have.property('graph');
            expect(capabilities!.graph).to.eql({
              delete: false,
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
