/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver')

  describe('Insecure Cluster Warning', function () {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
    });

    it('will display when ES Security Plugin is disabled and there is at least one user created index with data', async () => {
      await PageObjects.common.navigateToUrl('home');

      await browser.refresh();

      const toastMessage: string = await (await testSubjects.find('insecureClusterAlertText')).getVisibleText();

      await expect(toastMessage).to.equal(
        'Don’t lose one bit. Enable our free security features.\nDon\'t show again\nEnable security\nDismiss'
      );
    });
  });
}
