/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { TestSubjects } from '../../../../test/functional/services/common';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';

export function AppSearchPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects') as TestSubjects;

  return {
    async navigateToPage(): Promise<void> {
      return await PageObjects.common.navigateToApp('enterprise_search/app_search');
    },

    async getEngineLinks(): Promise<WebElementWrapper[]> {
      const engines = await testSubjects.find('appSearchEngines');
      return await testSubjects.findAllDescendant('engineNameLink', engines);
    },

    async getMetaEngineLinks(): Promise<WebElementWrapper[]> {
      const metaEngines = await testSubjects.find('appSearchMetaEngines');
      return await testSubjects.findAllDescendant('engineNameLink', metaEngines);
    },
  };
}
