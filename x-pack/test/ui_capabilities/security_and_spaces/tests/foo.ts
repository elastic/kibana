/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import {
  GetUICapabilitiesFailureReason,
  UICapabilitiesService,
} from '../../common/services/ui_capabilities';
import { UserAtSpaceScenarios } from '../scenarios';

// eslint-disable-next-line import/no-default-export
export default function fooTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('foo', () => {
    UserAtSpaceScenarios.forEach(scenario => {
      it(`${scenario.id}`, async () => {
        const { user, space } = scenario;

        const uiCapabilities = await uiCapabilitiesService.get({
          credentials: { username: user.username, password: user.password },
          spaceId: space.id,
        });
        switch (scenario.id) {
          // these users have a read/write view
          case 'superuser at everything_space':
          case 'global_all at everything_space':
          case 'dual_privileges_all at everything_space':
          case 'everything_space_all at everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('foo');
            expect(uiCapabilities.value!.foo).to.eql({
              create: true,
              edit: true,
              delete: true,
              show: true,
            });
            break;
          // these users have a read only view
          case 'global_read at everything_space':
          case 'dual_privileges_read at everything_space':
          case 'everything_space_read at everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('foo');
            expect(uiCapabilities.value!.foo).to.eql({
              create: false,
              edit: false,
              delete: false,
              show: true,
            });
            break;
          // the nothing_space has no features enabled, so even if we have
          // privileges to perform these actions, we won't be able to
          case 'superuser at nothing_space':
          case 'global_all at nothing_space':
          case 'global_read at nothing_space':
          case 'dual_privileges_all at nothing_space':
          case 'dual_privileges_read at nothing_space':
          case 'nothing_space_all at nothing_space':
          case 'nothing_space_read at nothing_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('foo');
            expect(uiCapabilities.value!.foo).to.eql({
              create: false,
              edit: false,
              delete: false,
              show: false,
            });
            break;
          // if we don't have access at the space itself, we're
          // redirected to the space selector and the ui capabilities
          // are largely irrelevant because they won't be consumed
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
