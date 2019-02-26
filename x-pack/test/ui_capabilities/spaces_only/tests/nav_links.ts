/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { Features } from '../../common/features';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { SpaceScenarios } from '../scenarios';
const features = new Features();

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('navLinks', () => {
    SpaceScenarios.forEach(scenario => {
      it(`${scenario.name}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get(null, scenario.id);
        switch (scenario.id) {
          case 'everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            for (const [, enabled] of Object.entries(uiCapabilities.value!.navLinks)) {
              expect(enabled).to.be(true);
            }
            break;
          case 'nothing_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            // only management should be enabled in this situation
            for (const [navLinkId, enabled] of Object.entries(uiCapabilities.value!.navLinks)) {
              if (navLinkId === features.management.navLinkId) {
                expect(enabled).to.be(true);
              } else {
                expect(enabled).to.be(false);
              }
            }
            break;
          case 'foo_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            // only management should be enabled in this situation
            for (const [navLinkId, enabled] of Object.entries(uiCapabilities.value!.navLinks)) {
              if (navLinkId === features.foo.navLinkId) {
                expect(enabled).to.be(false);
              } else {
                expect(enabled).to.be(true);
              }
            }
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
