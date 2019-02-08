/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import {
  GetUICapabilitiesFailureReason,
  UICapabilitiesService,
} from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function advancedSettingsTests({
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('advancedSettings', () => {
    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          username: scenario.username,
          password: scenario.password,
        });
        switch (scenario.username) {
          // these users have a read/write view of Advanced Settings
          case 'superuser':
          case 'all':
          case 'dual_privileges_all':
          case 'advancedSettings_all':
          case 'apm_user_and_all':
          case 'machine_learning_admin_and_all':
          case 'machine_learning_user_and_all':
          case 'monitoring_user_and_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('advancedSettings');
            expect(uiCapabilities.value!.advancedSettings).to.eql({
              save: true,
            });
            break;
          // these users have a read-only view of Advanced Settings
          case 'dual_privileges_read':
          case 'advancedSettings_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('advancedSettings');
            expect(uiCapabilities.value!.advancedSettings).to.eql({
              save: false,
            });
            break;
          // these users can't do anything with Advanced Settings
          case 'apm_user':
          case 'canvas_all':
          case 'canvas_read':
          case 'dev_tools_read':
          case 'dashboard_all':
          case 'dashboard_read':
          case 'discover_all':
          case 'discover_read':
          case 'graph_all':
          case 'graph_read':
          case 'maps_all':
          case 'maps_read':
          case 'infrastructure_read':
          case 'logs_read':
          case 'machine_learning_admin':
          case 'machine_learning_user':
          case 'monitoring_user':
          case 'timelion_all':
          case 'timelion_read':
          case 'uptime_read':
          case 'visualize_all':
          case 'visualize_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('advancedSettings');
            expect(uiCapabilities.value!.advancedSettings).to.eql({
              save: false,
            });
            break;
          case 'legacy_all':
          case 'no_kibana_privileges':
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
