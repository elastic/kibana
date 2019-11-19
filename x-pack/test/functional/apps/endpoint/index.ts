/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  describe('The Endpoint app', function() {
    this.tags('ciGroup7');

    beforeEach(async function() {
      await pageObjects.common.navigateToApp('endpoint');
    });

    it("welcomes the user with 'Hello World'", async function() {
      await testSubjects.find('welcomeTitle');
    });
  });
}
