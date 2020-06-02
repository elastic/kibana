/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { TestSubjects } from '../../../../../test/functional/services/test_subjects';

export function AppSearchPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects') as TestSubjects;

  return {
    async navigateToPage() {
      return await PageObjects.common.navigateToApp('app_search');
    },

    async getEngineLinks() {
      const engines = await testSubjects.find('appSearchEngines');
      return await testSubjects.findAllDescendant('engineNameLink', engines);
    },

    async getMetaEngineLinks() {
      const metaEngines = await testSubjects.find('appSearchMetaEngines');
      return await testSubjects.findAllDescendant('engineNameLink', metaEngines);
    },
  };
}
