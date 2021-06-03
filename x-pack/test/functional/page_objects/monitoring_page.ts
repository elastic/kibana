/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function MonitoringPageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'security', 'login']);
  const testSubjects = getService('testSubjects');
  return new (class MonitoringPage {
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
