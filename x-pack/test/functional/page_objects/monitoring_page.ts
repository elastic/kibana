/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function MonitoringPageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'security', 'login']);
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  return new (class MonitoringPage {
    async navigateTo(useSuperUser = false) {
      // always create this because our tear down tries to delete it
      await security.user.create('basic_monitoring_user', {
        password: 'monitoring_user_password',
        roles: ['monitoring_user', 'kibana_admin'],
        full_name: 'basic monitoring',
      });

      if (!useSuperUser) {
        await PageObjects.security.forceLogout();
        await PageObjects.login.login('basic_monitoring_user', 'monitoring_user_password');
      }
      await PageObjects.common.navigateToApp('monitoring');
    }

    async getAccessDeniedMessage() {
      return testSubjects.getVisibleText('accessDeniedTitle');
    }

    async clickBreadcrumb(subj: string) {
      return testSubjects.click(subj);
    }

    async assertTableNoData(subj: string) {
      if (!(await testSubjects.exists(subj))) {
        throw new Error('Expected to find the no data message');
      }
    }

    async tableGetRows(subj: string) {
      const table = await testSubjects.find(subj);
      return table.findAllByTagName('tr');
    }

    async tableGetRowsFromContainer(subj: string) {
      const table = await testSubjects.find(subj);
      const tbody = await table.findByTagName('tbody');
      return tbody.findAllByTagName('tr');
    }

    async tableSetFilter(subj: string, text: string) {
      await testSubjects.setValue(subj, text);
      await PageObjects.common.pressEnterKey();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async tableClearFilter(subj: string) {
      return await testSubjects.setValue(subj, ' \uE003'); // space and backspace to trigger onChange event
    }
  })();
}
