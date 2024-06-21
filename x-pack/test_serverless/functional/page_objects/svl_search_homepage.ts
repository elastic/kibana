/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlSearchHomePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    async expectToBeOnHomepage() {
      expect(await browser.getCurrentUrl()).contain('/app/elasticsearch/home');
    },
    async expectToNotBeOnHomepage() {
      expect(await browser.getCurrentUrl()).not.contain('/app/elasticsearch/home');
    },
    async expectHomepageHeader() {
      await testSubjects.existOrFail('search-homepage-header', { timeout: 2000 });
    },
  };
}
