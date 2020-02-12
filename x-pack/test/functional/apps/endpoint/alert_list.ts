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

  describe('Endpoint Alert List', function() {
    this.tags(['ciGroup7']);
    before(async () => {
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/alerts');
    });

    it('loads the Alert List Page', async () => {
      await testSubjects.existOrFail('alertListPage');
    });
    it('includes Alert list data grid', async () => {
      await testSubjects.existOrFail('alertListGrid');
    });
    it('has correct table headers', async () => {
      const allHeaderCells = await pageObjects.endpoint.dataGridHeaderVisibleText('alertListGrid');
      expect(allHeaderCells).to.eql([
        'alert_type',
        'event_type',
        'os',
        'ip_address',
        'host_name',
        'timestamp',
        'archived',
        'malware_score',
      ]);
    });
  });
}
