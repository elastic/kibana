/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const { find } = getService('testSubjects');

  describe('The Endpoint app', function() {
    beforeEach(async function() {
      await common.navigateToApp('endpoint');
    });

    it("welcomes the user with 'Hello World'", async function() {
      await find('welcomeMessage');
    });
  });
}
