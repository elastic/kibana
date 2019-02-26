/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { Features } from '../../common/features';
import {
  GetUICapabilitiesFailureReason,
  UICapabilitiesService,
} from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';
const features = new Features();

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('navLinks', () => {
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
            expect(uiCapabilities.value).to.have.property('navLinks');
            for (const [, enabled] of Object.entries(uiCapabilities.value!.navLinks)) {
              expect(enabled).to.be(true);
            }
            break;
          case 'foo_all':
          case 'foo_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            // only management should be enabled in this situation
            for (const [navLinkId, enabled] of Object.entries(uiCapabilities.value!.navLinks)) {
              if (
                navLinkId === features.management.navLinkId ||
                navLinkId === features.foo.navLinkId
              ) {
                expect(enabled).to.be(true);
              } else {
                expect(enabled).to.be(false);
              }
            }
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
