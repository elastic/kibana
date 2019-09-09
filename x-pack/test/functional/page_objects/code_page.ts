/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import testSubjSelector from '@kbn/test-subj-selector';
// import Keys from 'leadfoot/keys';
// import moment from 'moment';

import { FtrProviderContext } from '../ftr_provider_context';

export function CodeHomePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const queryBar = getService('queryBar');

  return {
    async fillImportRepositoryUrlInputBox(repoUrl: string) {
      return await testSubjects.setValue('importRepositoryUrlInputBox', repoUrl);
    },

    async fillSearchQuery(query: string) {
      // return await testSubjects.setValue('queryInput', query);
      await queryBar.setQuery(query);
    },

    async submitSearchQuery() {
      await queryBar.submitQuery();
    },

    async clickImportRepositoryButton() {
      log.info('Click import repository button.');
      return await testSubjects.click('importRepositoryButton');
    },

    async clickIndexRepositoryButton() {
      log.info('Click index repository button.');
      return await testSubjects.click('indexRepositoryButton');
    },

    async clickDeleteRepositoryButton() {
      log.info('Click delete repository button.');
      return await testSubjects.click('deleteRepositoryButton');
    },
  };
}
