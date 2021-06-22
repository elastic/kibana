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
  const testSubjects = getService('testSubjects');
  describe('observability security feature controls', function () {
    this.tags(['skipFirefox']);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/cases/default');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/cases/default');
    });

    describe('observability cases all privileges', () => {
      before(async () => {
        await security.role.create('cases_observability_all_role', {
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [
            { spaces: ['*'], base: [], feature: { observabilityCases: ['all'], logs: ['all'] } },
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

      it('shows observability/cases navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text).slice(0, 2);
        expect(navLinks).to.eql(['Overview', 'Cases']);
      });

      it(`landing page shows "Create new case" button`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases');
        await PageObjects.observability.expectCreateCaseButtonEnabled();
      });

      it(`doesn't show read-only badge`, async () => {
        await PageObjects.observability.expectNoReadOnlyCallout();
      });

      it(`allows a case to be created`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases');

        await testSubjects.click('createNewCaseBtn');

        await PageObjects.observability.expectCreateCase();
      });

      it(`allows a case to be edited`, async () => {
        await PageObjects.common.navigateToUrl(
          'observabilityCases',
          '4c32e6b0-c3c5-11eb-b389-3fadeeafa60f',
          {
            shouldUseHashForSubUrl: false,
          }
        );
        await PageObjects.observability.expectAddCommentButton();
      });
    });

    describe('observability cases read-only privileges', () => {
      before(async () => {
        await security.role.create('cases_observability_read_role', {
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [
            {
              spaces: ['*'],
              base: [],
              feature: { observabilityCases: ['read'], logs: ['all'] },
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

      it('shows observability/cases navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text).slice(0, 2);
        expect(navLinks).to.eql(['Overview', 'Cases']);
      });

      it(`landing page shows disabled "Create new case" button`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases');
        await PageObjects.observability.expectCreateCaseButtonDisabled();
      });

      it(`shows read-only callout`, async () => {
        await PageObjects.observability.expectReadOnlyCallout();
      });

      it(`does not allow a case to be created`, async () => {
        await PageObjects.common.navigateToUrl('observabilityCases', 'create', {
          shouldUseHashForSubUrl: false,
        });

        // expect redirection to observability cases landing
        await PageObjects.observability.expectCreateCaseButtonDisabled();
      });

      it(`does not allow a case to be edited`, async () => {
        await PageObjects.common.navigateToUrl(
          'observabilityCases',
          '4c32e6b0-c3c5-11eb-b389-3fadeeafa60f',
          {
            shouldUseHashForSubUrl: false,
          }
        );
        await PageObjects.observability.expectAddCommentButtonDisabled();
      });
    });

    describe('no observability privileges', () => {
      before(async () => {
        await security.role.create('no_observability_privileges_role', {
          elasticsearch: { cluster: [], indices: [], run_as: [] },
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
        await PageObjects.common.navigateToActualUrl('observabilityCases');
        await PageObjects.observability.expectForbidden();
      });

      it.skip(`create new case returns a 403`, async () => {
        await PageObjects.common.navigateToUrl('observabilityCases', 'create', {
          shouldUseHashForSubUrl: false,
        });
        await PageObjects.observability.expectForbidden();
      });
    });
  });
}
