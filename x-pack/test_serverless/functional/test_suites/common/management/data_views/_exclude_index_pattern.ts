/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common']);
  const es = getService('es');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  describe('creating and deleting default index', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'index_a', 'index_b']);
      // TODO: Navigation to Data View Management is different in Serverless
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-dataViews');
      await es.transport.request({
        path: '/index-a/_doc',
        method: 'POST',
        body: { user: 'matt' },
      });

      await es.transport.request({
        path: '/index-b/_doc',
        method: 'POST',
        body: { title: 'hello' },
      });
      await PageObjects.settings.createIndexPattern('index-*,-index-b');
    });

    it('data view creation with exclusion', async () => {
      const fieldCount = await PageObjects.settings.getFieldsTabCount();
      // five metafields plus keyword and text version of 'user' field
      expect(parseInt(fieldCount, 10)).to.be(7);
    });

    after(async () => {
      await es.transport.request({
        path: '/index-a',
        method: 'DELETE',
      });
      await es.transport.request({
        path: '/index-b',
        method: 'DELETE',
      });
      await PageObjects.settings.removeIndexPattern();
      await security.testUser.restoreDefaults();
    });
  });
}
