/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint']);

  describe('Home page', function() {
    this.tags(['skipCloud']);
    before(async () => {
      await pageObjects.common.navigateToApp('endpoint');
    });

    it('Loads the app', async () => {
      const welcomeMessage = await pageObjects.endpoint.welcomeEndpointMessage();
      expect(welcomeMessage).to.be('Welcome to Endpoint!');
    });
  });
};
