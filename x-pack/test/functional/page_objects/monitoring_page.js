/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function MonitoringPageProvider({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return new class MonitoringPage {
    async navigateTo() {
      await PageObjects.common.navigateToApp('monitoring');
    }

    async getAccessDeniedMessage() {
      return testSubjects.getVisibleText('accessDeniedTitle');
    }

    async clickBreadcrumb(subj) {
      return testSubjects.click(subj);
    }

    async assertTableNoData(subj) {
      await retry.try(async () => {
        if (!await testSubjects.exists(subj)) {
          throw new Error('Expected to find the no data message');
        }
      });
    }

    async tableGetRows(subj) {
      const table = await testSubjects.find(subj);
      return table.findAllByTagName('tr');
    }

    async tableSetFilter(subj, text) {
      return await testSubjects.setValue(subj, text);
    }

    async tableClearFilter(subj) {
      return await testSubjects.setValue(subj, ' \uE003'); // space and backspace to trigger onChange event
    }
  };
}
