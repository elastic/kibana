/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import testSubjSelector from '@kbn/test-subj-selector';
// import Keys from 'leadfoot/keys';
// import moment from 'moment';

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export function CodeHomePageProvider({ getService }: KibanaFunctionalTestDefaultProviders) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');

  return {
    async fillImportRepositoryUrlInputBox() {
      return await testSubjects.setValue(
        'importRepositoryUrlInputBox',
        'https://github.com/Microsoft/TypeScript-Node-Starter'
      );
    },

    async clickImportRepositoryButton() {
      log.info('Click import repository button.');
      return await testSubjects.click('importRepositoryButton');
    },

    async clickDeleteRepositoryButton() {
      log.info('Click delete repository button.');
      return await testSubjects.click('deleteRepositoryButton');
    },
  };
}
