/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects([
    'common',
    'observability',
    'error',
    'security',
    'spaceSelector',
  ]);
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');
  const testSubjects = getService('testSubjects');
  describe('wowzeroni', function () {
    this.tags(['skipFirefox']);
    before(async () => {
      await esArchiver.load('cases/default');
    });

    after(async () => {
      await esArchiver.unload('cases/default');
    });

    describe('global observability all privileges', () => {
      before(async () => {
        await security.role.create('cases_observability_all_role', {
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [
            { spaces: ['*'], base: [], feature: { 'observability-cases': ['all'], logs: ['all'] } },
          ],
        });

        await security.user.create('cases_observability_all_user', {
          password: 'cases_observability_all_user-password',
          roles: ['cases_observability_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'cases_observability_all_user',
          'cases_observability_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await Promise.all([
          security.role.delete('cases_observability_all_role'),
          security.user.delete('cases_observability_all_user'),
        ]);
      });
      const delay = (ms) => new Promise((res) => setTimeout(res, ms));

      it('shows observability/cases navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text).slice(0, 2);
        expect(navLinks).to.eql(['Overview', 'Cases']);
      });

      it(`landing page shows "Create new case" button`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases');
        await PageObjects.observability.expectCreateCaseButtonEnabled();
      });

      it.skip(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it(`allows a case to be created`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases');

        await testSubjects.click('createNewCaseBtn');

        await PageObjects.observability.expectCreateCase();
      });

      it.only(`allows a workpad to be edited`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases');
        await delay(3000000);
        await PageObjects.observability.expectAddElementButton();
      });
    });

    describe('global observability read-only privileges', () => {
      before(async () => {
        await security.role.create('cases_observability_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                observability: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('cases_observability_read_user', {
          password: 'cases_observability_read_user-password',
          roles: ['cases_observability_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'cases_observability_read_user',
          'cases_observability_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('cases_observability_read_role');
        await security.user.delete('cases_observability_read_user');
      });

      it('shows observability navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Overview', 'Observability']);
      });

      it(`landing page shows disabled "Create new workpad" button`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.observability.expectCreateWorkpadButtonDisabled();
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`does not allow a workpad to be created`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases', 'workpad/create', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });

        // expect redirection to observability landing
        await PageObjects.observability.expectCreateWorkpadButtonDisabled();
      });

      it(`does not allow a workpad to be edited`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'observability',
          'workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31',
          {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          }
        );

        await PageObjects.observability.expectNoAddElementButton();
      });
    });

    describe('no observability privileges', () => {
      before(async () => {
        await security.role.create('no_observability_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('no_observability_privileges_user', {
          password: 'no_observability_privileges_user-password',
          roles: ['no_observability_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_observability_privileges_user',
          'no_observability_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_observability_privileges_role');
        await security.user.delete('no_observability_privileges_user');
      });

      it(`returns a 403`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        PageObjects.error.expectForbidden();
      });

      it(`create new workpad returns a 403`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases', 'workpad/create', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        PageObjects.error.expectForbidden();
      });
    });
  });
}
