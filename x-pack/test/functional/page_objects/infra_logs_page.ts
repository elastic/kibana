/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import testSubjSelector from '@kbn/test-subj-selector';
// import moment from 'moment';

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export function InfraLogsPageProvider({
  getPageObjects,
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common']);

  return {
    async navigateTo() {
      await pageObjects.common.navigateToApp('infraLogs');
    },

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
