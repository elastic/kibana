/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint']);
  const testSubjects = getService('testSubjects');

  describe('Endpoint landing page', function () {
    this.tags('ciGroup7');
    before(async () => {
      await pageObjects.common.navigateToApp('endpoint');
    });

    it('Loads the endpoint app', async () => {
      const welcomeEndpointMessage = await pageObjects.endpoint.welcomeEndpointTitle();
      expect(welcomeEndpointMessage).to.be('Hello World');
    });

    it('Does not display a toast indicating that the ingest manager failed to initialize', async () => {
      await testSubjects.missingOrFail('euiToastHeader');
    });
  });
};
