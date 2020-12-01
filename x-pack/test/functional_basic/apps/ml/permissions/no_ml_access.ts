/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

import { USER } from '../../../../functional/services/ml/security_common';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'error']);
  const ml = getService('ml');

  const testUsers = [USER.ML_UNAUTHORIZED, USER.ML_UNAUTHORIZED_SPACES];

  describe('for user with no ML access', function () {
    for (const user of testUsers) {
      describe(`(${user})`, function () {
        before(async () => {
          await ml.securityUI.loginAs(user);
        });

        after(async () => {
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

        it('should not display the ML file data vis link on the Kibana home page', async () => {
          await ml.testExecution.logTestStep('should load the Kibana home page');
          await ml.navigation.navigateToKibanaHome();

          await ml.testExecution.logTestStep('should not display the ML file data vis link');
          await ml.commonUI.assertKibanaHomeFileDataVisLinkNotExists();
        });

        it('should not display the ML entry in Kibana app menu', async () => {
          await ml.testExecution.logTestStep('should open the Kibana app menu');
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
