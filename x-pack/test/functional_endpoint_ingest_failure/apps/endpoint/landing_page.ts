/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  describe('home page', function () {
    const pageObjects = getPageObjects(['common']);
    const testSubjects = getService('testSubjects');

    before(async () => {
      await pageObjects.common.navigateToApp('endpoint');
    });

    it('displays an error toast', async () => {
      await testSubjects.existOrFail('euiToastHeader');
    });
  });
};
