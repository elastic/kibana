/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import testSubjSelector from '@kbn/test-subj-selector';
// import moment from 'moment';

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export function InfraLogsPageProvider({ getService }: KibanaFunctionalTestDefaultProviders) {
  const testSubjects = getService('testSubjects');
  // const find = getService('find');
  // const browser = getService('browser');

  return {
    async getLogStream() {
      return await testSubjects.find('logStream');
    },

    async getNoLogsIndicesPrompt() {
      return await testSubjects.find('noLogsIndicesPrompt');
    },

    async openSourceConfigurationFlyout() {
      await testSubjects.click('configureSourceButton');
      await testSubjects.exists('sourceConfigurationFlyout');
    },
  };
}
