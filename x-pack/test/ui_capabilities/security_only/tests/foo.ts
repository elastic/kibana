/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';
import { assertDeeplyFalse } from '../../common/lib/assert_deeply_false';

// eslint-disable-next-line import/no-default-export
export default function fooTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('foo', () => {
    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          credentials: {
            username: scenario.username,
            password: scenario.password,
          },
        });

        expect(uiCapabilities.success).to.be(true);
        expect(uiCapabilities.value).to.have.property('foo');

        switch (scenario.username) {
          // these users have a read/write view of Foo
          case 'superuser':
          case 'all':
          case 'dual_privileges_all':
          case 'foo_all':
            expect(uiCapabilities.value!.foo).to.eql({
              create: true,
              edit: true,
              delete: true,
              show: true,
            });
            break;
          // these users have a read-only view of Foo
          case 'read':
          case 'dual_privileges_read':
          case 'foo_read':
            expect(uiCapabilities.value!.foo).to.eql({
              create: false,
              edit: false,
              delete: false,
              show: true,
            });
            break;
          // these users have no access to any ui capabilities
          case 'legacy_all':
          case 'no_kibana_privileges':
            assertDeeplyFalse(uiCapabilities.value!.foo);
            break;
          // all other users can't do anything with Foo
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
