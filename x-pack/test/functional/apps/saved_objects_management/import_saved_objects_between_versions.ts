/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This test is importing saved objects from 7.13.0 to 8.0 and the backported version
 * will import from 6.8.x to 7.x.x
 */

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'savedObjects']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const getExportCount = async () => {
    return await retry.tryForTime(10000, async () => {
      const exportText = await testSubjects.getVisibleText('exportAllObjects');
      const parts = exportText.trim().split(' ');
      if (parts.length !== 3) {
        throw new Error('text not loaded yet');
      }
      const count = Number.parseInt(parts[1], 10);
      if (count === 0) {
        throw new Error('text not loaded yet');
      }
      return count;
    });
  };

  describe('Export import saved objects between versions', function () {
    before(async function () {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
    });

    beforeEach(async () => {
      await PageObjects.savedObjects.waitTableIsLoaded();
    });

    after(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    it('should be able to import 7.13 saved objects into 8.0.0', async function () {
      const initialObjectCount = await getExportCount();

      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_7.13_import_saved_objects.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
      await PageObjects.savedObjects.waitTableIsLoaded();

      const newObjectCount = await getExportCount();
      expect(newObjectCount - initialObjectCount).to.eql(86);
    });

    it('should be able to import alerts and actions saved objects from 7.14 into 8.0.0', async function () {
      const initialObjectCount = await getExportCount();

      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_7.14_import_alerts_actions.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
      await PageObjects.savedObjects.waitTableIsLoaded();

      const newObjectCount = await getExportCount();
      expect(newObjectCount - initialObjectCount).to.eql(23);
    });
  });
}
