/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

import { USER } from '../../../../functional/services/ml/security_common';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'error']);
  const ml = getService('ml');

  const testUsers = [{ user: USER.ML_UNAUTHORIZED, discoverAvailable: true }];

  describe('for user with no ML access', function () {
    for (const testUser of testUsers) {
      describe(`(${testUser.user})`, function () {
        before(async () => {
          await ml.securityUI.loginAs(testUser.user);
        });

        after(async () => {
          // NOTE: Logout needs to happen before anything else to avoid flaky behavior
          await ml.securityUI.logout();
        });

        it('should not allow access to the ML app', async () => {
          await ml.testExecution.logTestStep('should not load the ML overview page');
          await PageObjects.common.navigateToUrl('ml', '', {
            shouldLoginIfPrompted: false,
            ensureCurrentUrl: false,
          });

          await PageObjects.error.expectForbidden();
        });

        it('should not display the ML entry in Kibana app menu', async () => {
          await ml.testExecution.logTestStep('should open the Kibana app menu');
          await ml.navigation.navigateToKibanaHome();
          await ml.navigation.openKibanaNav();

          await ml.testExecution.logTestStep('should not display the ML nav link');
          await ml.navigation.assertKibanaNavMLEntryNotExists();
        });

        it('should not allow access to the Stack Management ML page', async () => {
          await ml.testExecution.logTestStep(
            'should load the stack management with the ML menu item being absent'
          );
          await ml.navigation.navigateToStackManagement({ expectMlLink: false });
        });
      });
    }
  });
}
