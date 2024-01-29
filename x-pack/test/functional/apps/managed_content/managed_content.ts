/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['timePicker', 'lens', 'common', 'discover']);
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

    const expectManagedContentSignifiers = async (
      expected: boolean,
      saveButtonTestSubject: string
    ) => {
      await testSubjects[expected ? 'existOrFail' : 'missingOrFail']('managedContentBadge');
      await testSubjects.click(saveButtonTestSubject);

      const saveAsNewCheckbox = await testSubjects.find('saveAsNewCheckbox');
      expect(await testSubjects.isEuiSwitchChecked(saveAsNewCheckbox)).to.be(expected);
      expect(await saveAsNewCheckbox.getAttribute('disabled')).to.be(expected ? 'true' : null);
    };

    describe('preventing the user from overwriting managed content', () => {
      it('lens', async () => {
        await PageObjects.common.navigateToActualUrl(
          'lens',
          'edit/managed-36db-4a3b-a4ba-7a64ab8f130b'
        );

        await PageObjects.lens.waitForVisualization('xyVisChart');

        await expectManagedContentSignifiers(true, 'lnsApp_saveButton');

        await PageObjects.common.navigateToActualUrl(
          'lens',
          'edit/unmanaged-36db-4a3b-a4ba-7a64ab8f130b'
        );

        await PageObjects.lens.waitForVisualization('xyVisChart');

        await expectManagedContentSignifiers(false, 'lnsApp_saveButton');
      });
    });

    it('discover', async () => {
      await PageObjects.common.navigateToActualUrl(
        'discover',
        'view/managed-3d62-4113-ac7c-de2e20a68fbc'
      );
      await PageObjects.discover.waitForDiscoverAppOnScreen();

      await expectManagedContentSignifiers(true, 'discoverSaveButton');

      await PageObjects.common.navigateToActualUrl(
        'discover',
        'view/unmanaged-3d62-4113-ac7c-de2e20a68fbc'
      );
      await PageObjects.discover.waitForDiscoverAppOnScreen();

      await expectManagedContentSignifiers(false, 'discoverSaveButton');
    });
  });
}
