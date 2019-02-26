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
import { UserAtSpaceScenarios } from '../scenarios';
const features = new Features();

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('navLinks', () => {
    UserAtSpaceScenarios.forEach(scenario => {
      it(`${scenario.id}`, async () => {
        const { user, space } = scenario;

        const uiCapabilities = await uiCapabilitiesService.get(
          { username: user.username, password: user.password },
          space.id
        );
        switch (scenario.id) {
          case 'superuser at everything_space':
          case 'global_all at everything_space':
          case 'dual_privileges_all at everything_space':
          case 'dual_privileges_read at everything_space':
          case 'global_read at everything_space':
          case 'everything_space_all at everything_space':
          case 'everything_space_read at everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            for (const [, enabled] of Object.entries(uiCapabilities.value!.navLinks)) {
              expect(enabled).to.be(true);
            }
            break;
          case 'superuser at nothing_space':
          case 'global_all at nothing_space':
          case 'dual_privileges_all at nothing_space':
          case 'dual_privileges_read at nothing_space':
          case 'global_read at nothing_space':
          case 'nothing_space_all at nothing_space':
          case 'nothing_space_read at nothing_space':
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
          case 'no_kibana_privileges at everything_space':
          case 'no_kibana_privileges at nothing_space':
          case 'legacy_all at everything_space':
          case 'legacy_all at nothing_space':
          case 'everything_space_all at nothing_space':
          case 'everything_space_read at nothing_space':
          case 'nothing_space_all at everything_space':
          case 'nothing_space_read at everything_space':
            expect(uiCapabilities.success).to.be(false);
            expect(uiCapabilities.failureReason).to.be(
              GetUICapabilitiesFailureReason.RedirectedToRoot
            );
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
