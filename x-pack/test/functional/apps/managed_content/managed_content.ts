/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['timePicker', 'lens', 'common']);
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');

  describe('Managed Content', () => {
    before(async () => {
      esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
      kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/managed_content');
    });

    after(async () => {
      esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/managed_content');
    });

    describe('preventing the user from overwriting managed content', () => {
      it('lens', async () => {
        await PageObjects.common.navigateToActualUrl(
          'lens',
          'edit/managed-36db-4a3b-a4ba-7a64ab8f130b'
        );

        await PageObjects.lens.waitForVisualization('xyVisChart');

        await testSubjects.existOrFail('managedContentBadge');
        await testSubjects.click('lnsApp_saveButton');
        const saveAsNewCheckbox = await testSubjects.find('saveAsNewCheckbox');
        expect(await testSubjects.isEuiSwitchChecked(saveAsNewCheckbox)).to.be(true);
        expect(await saveAsNewCheckbox.getAttribute('disabled')).to.be('true');

        await PageObjects.common.navigateToActualUrl(
          'lens',
          'edit/unmanaged-36db-4a3b-a4ba-7a64ab8f130b'
        );

        await PageObjects.lens.waitForVisualization('xyVisChart');

        await testSubjects.missingOrFail('managedContentBadge');
        await testSubjects.click('lnsApp_saveButton');
        await testSubjects.existOrFail('saveAsNewCheckbox');
        expect(await testSubjects.isEuiSwitchChecked('saveAsNewCheckbox')).to.be(false);
        expect(await saveAsNewCheckbox.getAttribute('disabled')).to.be(null);
      });
    });
  });
}
