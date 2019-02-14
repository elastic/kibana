/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from 'x-pack/test/types/providers';

// tslint:disable no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'security']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('security feature controls', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    describe('global registered all privileges', () => {
      before(async () => {
        await security.role.create('global_registered_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                'functional-tests-feature': ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_registered_all_user', {
          password: 'global_registered_all_user-password',
          roles: ['global_registered_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.logout();

        await PageObjects.security.login(
          'global_registered_all_user',
          'global_registered_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_registered_all_role'),
          security.user.delete('global_registered_all_user'),
          PageObjects.security.logout(),
        ]);
      });

      it('shows Registered and Unregistered App navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Registered App', 'Unregistered App', 'Management']);
      });

      it(`allows navigation to registered app`, async () => {
        await PageObjects.common.navigateToActualUrl('registeredApp', '', {
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('ft-registered-app');
      });

      it(`allows navigation to unregistered app`, async () => {
        await PageObjects.common.navigateToActualUrl('unregisteredApp', '', {
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('ft-unregistered-app');
      });
    });
  });
}
