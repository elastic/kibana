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
export default function devToolsTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('dev_tools', () => {
    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          username: scenario.username,
          password: scenario.password,
        });
        switch (scenario.username) {
          // these users have a read/write view of Dev Tools
          case 'superuser':
          case 'all':
          case 'dual_privileges_all':
          case 'dev_tools_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('dev_tools');
            expect(uiCapabilities.value!.dev_tools).to.eql({
              show: true,
            });
            break;
          // these users have a read-only view of Dev Tools
          // for the time being, this is functionally equivalent to the read/write view
          case 'dual_privileges_read':
          case 'dev_tools_all':
          case 'dev_tools_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('dev_tools');
            expect(uiCapabilities.value!.dev_tools).to.eql({
              show: true,
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
            expect(uiCapabilities.value).to.have.property('dev_tools');
            expect(uiCapabilities.value!.dev_tools).to.eql({
              show: false,
            });
        }
      });
    });
  });
}
