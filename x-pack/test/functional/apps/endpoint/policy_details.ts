/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'endpoint']);
  const testSubjects = getService('testSubjects');

  describe.only('Endpoint Policy Details', function() {
    this.tags(['ciGroup7']);

    it('loads the Policy Details Page', async () => {
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/policy/123');
      await testSubjects.existOrFail('policyDetailsViewTitle');

      const policyDetailsNotFoundTitle = await testSubjects.getVisibleText('policyDetailsName');
      expect(policyDetailsNotFoundTitle).to.equal('policy with some protections 123');
    });
  });
}
