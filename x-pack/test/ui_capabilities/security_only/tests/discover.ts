/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { UICapabilities } from 'ui/capabilities';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import {
  GetUICapabilitiesFailureReason,
  UICapabilitiesService,
} from '../../common/services/ui_capabilities';
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

        const capabilities: UICapabilities = uiCapabilities.value as UICapabilities;

        switch (scenario.username) {
          // these users have a read/write view of Discover
          case 'superuser':
          case 'all':
          case 'dual_privileges_all':
          case 'discover_all':
            expect(uiCapabilities.success).to.be(true);
            expect(capabilities).to.have.property('discover');
            expect(capabilities!.discover).to.eql({
              show: true,
              save: true,
            });
            expect(capabilities.catalogue.discover).to.eql(true);
            break;
          // these users have a read-only view of Discover
          case 'dual_privileges_read':
          case 'discover_read':
            expect(uiCapabilities.success).to.be(true);
            expect(capabilities).to.have.property('discover');
            expect(capabilities!.discover).to.eql({
              show: true,
              save: false,
            });
            expect(capabilities.catalogue.discover).to.eql(true);
            break;
          // these users have no access to even get the ui capabilities
          case 'no_kibana_privileges':
          case 'legacy_all':
            expect(uiCapabilities.success).to.be(false);
            expect(uiCapabilities.failureReason).to.be(GetUICapabilitiesFailureReason.NotFound);
            break;
          // all other users can't do anything with Discover
          default:
            expect(uiCapabilities.success).to.be(true);
            expect(capabilities).to.have.property('discover');
            expect(capabilities!.discover).to.eql({
              show: false,
              save: false,
            });
            expect(capabilities.catalogue.discover).to.eql(false);
            break;
        }
      });
    });
  });
}
