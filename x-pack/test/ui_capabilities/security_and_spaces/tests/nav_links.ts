/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { NavLinksBuilder } from '../../common/nav_links_builder';
import { FeaturesService } from '../../common/services';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { UserAtSpaceScenarios } from '../scenarios';

export default function navLinksTests({ getService }: FtrProviderContext) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');
  const featuresService: FeaturesService = getService('features');

  describe('navLinks', () => {
    let navLinksBuilder: NavLinksBuilder;
    before(async () => {
      const features = await featuresService.get();
      navLinksBuilder = new NavLinksBuilder(features);
    });

    UserAtSpaceScenarios.forEach((scenario) => {
      it(`${scenario.id}`, async () => {
        const { user, space } = scenario;

        const uiCapabilities = await uiCapabilitiesService.get({
          credentials: { username: user.username, password: user.password },
          spaceId: space.id,
        });
        switch (scenario.id) {
          case 'superuser at everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.all());
            break;
          case 'global_all at everything_space':
          case 'dual_privileges_all at everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.except('monitoring')
            );
            break;
          case 'everything_space_all at everything_space':
          case 'global_read at everything_space':
          case 'dual_privileges_read at everything_space':
          case 'everything_space_read at everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.except(
                'monitoring',
                'enterpriseSearch',
                'enterpriseSearchContent',
                'appSearch',
                'workplaceSearch',
              )
            );
            break;
          case 'foo_all at everything_space':
          case 'foo_read at everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(
              navLinksBuilder.only('kibana', 'foo', 'management')
            );
            break;
          case 'superuser at nothing_space':
          case 'global_all at nothing_space':
          case 'global_read at nothing_space':
          case 'foo_all at nothing_space':
          case 'foo_read at nothing_space':
          case 'dual_privileges_all at nothing_space':
          case 'dual_privileges_read at nothing_space':
          case 'nothing_space_all at nothing_space':
          case 'nothing_space_read at nothing_space':
          case 'no_kibana_privileges at everything_space':
          case 'no_kibana_privileges at nothing_space':
          case 'legacy_all at everything_space':
          case 'legacy_all at nothing_space':
          case 'everything_space_all at nothing_space':
          case 'everything_space_read at nothing_space':
          case 'nothing_space_all at everything_space':
          case 'nothing_space_read at everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('navLinks');
            expect(uiCapabilities.value!.navLinks).to.eql(navLinksBuilder.only('management'));
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
