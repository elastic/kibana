/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function IndexManagementPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async sectionHeadingText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async reloadIndicesButton() {
      return await testSubjects.find('reloadIndicesButton');
    },
    async changeTabs(tab: 'indicesTab' | 'templatesTab') {
      return await testSubjects.click(tab);
    },
  };
}
