/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { NavLinksBuilder } from '../../common/nav_links_builder';
import { FeaturesService } from '../../common/services';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';

// eslint-disable-next-line import/no-default-export
export default function navLinksTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');
  const featuresService: FeaturesService = getService('features');

  describe('navLinks', () => {
    let navLinksBuilder: NavLinksBuilder;
    before(async () => {
      const features = await featuresService.get();
      navLinksBuilder = new NavLinksBuilder(features);
    });

    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          credentials: {
            username: scenario.username,
            password: scenario.password,
          },
          navLinks: navLinksBuilder.all(),
        });
        expect(uiCapabilities.success).to.be(true);
        expect(uiCapabilities.value).to.have.property('navLinks');

        switch (scenario.username) {
          case 'superuser':
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.all());
            break;
          case 'all':
          case 'read':
          case 'dual_privileges_all':
          case 'dual_privileges_read':
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.except('ml', 'monitoring')
            );
            break;
          case 'foo_all':
          case 'foo_read':
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('management', 'foo')
            );
            break;
          // these users have no access to any navLinks except management
          // which is not a navLink that ever gets disabled.
          case 'legacy_all':
          case 'no_kibana_privileges':
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.only('management'));
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
