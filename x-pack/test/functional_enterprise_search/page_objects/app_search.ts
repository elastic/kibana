/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { TestSubjects } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../ftr_provider_context';

export function AppSearchPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects') as TestSubjects;

  return {
    async navigateToPage(): Promise<void> {
      return await PageObjects.common.navigateToApp('enterprise_search/app_search');
    },

    async getEngineLinks(): Promise<WebElementWrapper[]> {
      const engines = await testSubjects.find('appSearchEngines');
      return await testSubjects.findAllDescendant('EngineNameLink', engines);
    },

    async getMetaEngineLinks(): Promise<WebElementWrapper[]> {
      const metaEngines = await testSubjects.find('appSearchMetaEngines');
      return await testSubjects.findAllDescendant('EngineNameLink', metaEngines);
    },
  };
}
