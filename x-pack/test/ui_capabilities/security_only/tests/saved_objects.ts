/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { savedObjectsBuilder } from '../../common/saved_objects_builder';
import {
  GetUICapabilitiesFailureReason,
  UICapabilitiesService,
} from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function savedObjectsTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('savedObjects', () => {
    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          username: scenario.username,
          password: scenario.password,
        });
        switch (scenario.username) {
          case 'superuser':
          case 'all':
          case 'dual_privileges_all':
          case 'dual_privileges_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(savedObjectsBuilder.all());
            break;
          case 'apm_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('apm', 'management')
            );
            break;
          case 'advancedSettings_all':
          case 'advancedSettings_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('management')
            );
            break;
          case 'canvas_all':
          case 'canvas_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('canvas', 'management')
            );
            break;
          case 'dashboard_all':
          case 'dashboard_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('dashboard', 'management')
            );
            break;

          case 'dev_tools_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('dev_tools', 'management')
            );
            break;
          case 'discover_all':
          case 'discover_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('discover', 'management')
            );
            break;
          case 'graph_all':
          case 'graph_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('graph', 'management')
            );
            break;
          case 'maps_all':
          case 'maps_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('maps', 'management')
            );
            break;
          case 'infrastructure_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('infrastructure', 'management')
            );
            break;
          case 'logs_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('logs', 'management')
            );
            break;
          case 'ml_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('ml', 'management')
            );
            break;
          case 'monitoring_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('monitoring', 'management')
            );
            break;
          case 'timelion_all':
          case 'timelion_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('timelion', 'management')
            );
            break;
          case 'uptime_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('uptime', 'management')
            );
            break;
          case 'visualize_all':
          case 'visualize_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjects');
            expect(uiCapabilities.value!.savedObjects).to.eql(
              savedObjectsBuilder.only('visualize', 'management')
            );
            break;
          case 'no_kibana_privileges':
          case 'legacy_all':
            expect(uiCapabilities.success).to.be(false);
            expect(uiCapabilities.failureReason).to.be(GetUICapabilitiesFailureReason.NotFound);
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
