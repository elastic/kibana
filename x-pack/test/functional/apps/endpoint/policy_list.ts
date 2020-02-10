/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  describe('Endpoint Policy List', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/policy');
    });

    it('loads the Policy List Page', async () => {
      await testSubjects.existOrFail('policyListPage');
    });
    it('displays page title', async () => {
      const policyTitle = await testSubjects.getVisibleText('policyViewTitle');
      expect(policyTitle).to.equal('Policies');
    });
    it('shows policy count total', async () => {
      const policyTotal = await testSubjects.getVisibleText('policyTotalCount');
      expect(policyTotal).to.equal('0 Policies');
    });
    it('includes policy list table', async () => {
      await testSubjects.existOrFail('policyTable');
    });
  });
}
