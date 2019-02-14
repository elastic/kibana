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
export default function navLinksTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('dashboard', () => {
    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          username: scenario.username,
          password: scenario.password,
        });
        switch (scenario.username) {
          // these users have a read/write view of Dashboard
          case 'superuser':
          case 'all':
          case 'dual_privileges_all':
          case 'dashboard_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('dashboard');
            expect(uiCapabilities.value!.dashboard).to.eql({
              createNew: true,
              show: true,
              showWriteControls: true,
            });
            break;
          // these users have a read-only view of Dashboard
          case 'dual_privileges_read':
          case 'dashboard_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('dashboard');
            expect(uiCapabilities.value!.dashboard).to.eql({
              createNew: false,
              show: true,
              showWriteControls: false,
            });
            break;
          // these users have no access to even get the ui capabilities
          case 'legacy_all':
          case 'no_kibana_privileges':
            expect(uiCapabilities.success).to.be(false);
            expect(uiCapabilities.failureReason).to.be(GetUICapabilitiesFailureReason.NotFound);
            break;
          // all other users can't do anything with Dashboard
          default:
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('dashboard');
            expect(uiCapabilities.value!.dashboard).to.eql({
              createNew: false,
              show: false,
              showWriteControls: false,
            });
        }
      });
    });
  });
}
