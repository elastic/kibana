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
  const observability = getService('observability');
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

    it('Shows the no data page on load', async () => {
      await PageObjects.common.navigateToActualUrl('observabilityCases');
      await PageObjects.observability.expectNoDataPage();
    });

    describe('observability cases all privileges', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityCases: ['all'],
            logs: ['all'],
          })
        );
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await observability.users.restoreDefaultTestUserRole();
      });

      it('shows observability/cases navlink', async () => {
        await PageObjects.common.navigateToActualUrl('observability');
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Cases');
      });

      it(`landing page shows "Create new case" button`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases');
        await PageObjects.observability.expectCreateCaseButtonEnabled();
      });

      it(`doesn't show read-only badge`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases');
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
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityCases: ['read'],
            logs: ['all'],
          })
        );
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await observability.users.restoreDefaultTestUserRole();
      });

      it('shows observability/cases navlink', async () => {
        await PageObjects.common.navigateToActualUrl('observability');
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Cases');
      });

      it(`landing page shows disabled "Create new case" button`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases');
        await PageObjects.observability.expectCreateCaseButtonMissing();
      });

      it(`shows read-only glasses badge`, async () => {
        await PageObjects.common.navigateToActualUrl('observabilityCases');
        await PageObjects.observability.expectReadOnlyGlassesBadge();
      });

      it(`does not allow a case to be created`, async () => {
        await PageObjects.common.navigateToUrl('observabilityCases', 'create', {
          shouldUseHashForSubUrl: false,
        });

        // expect redirection to observability cases landing
        await PageObjects.observability.expectCreateCaseButtonMissing();
      });

      it(`does not allow a case to be edited`, async () => {
        await PageObjects.common.navigateToUrl(
          'observabilityCases',
          '4c32e6b0-c3c5-11eb-b389-3fadeeafa60f',
          {
            shouldUseHashForSubUrl: false,
          }
        );
        await PageObjects.observability.expectAddCommentButtonMissing();
      });
    });

    describe('no observability privileges', () => {
      before(async () => {
        await observability.users.setTestUserRole({
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [{ spaces: ['*'], base: [], feature: { discover: ['all'] } }],
        });
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
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
