/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const navigateToApp = common.navigateToApp.bind(common);

  const { find } = getService('testSubjects');

  describe('The Endpoint app', function() {
    beforeEach(async function() {
      await navigateToApp('endpoint');
    });

    it("welcomes the user with 'Hello World'", async function() {
      await find('welcomeMessage');
    });
  });
}
