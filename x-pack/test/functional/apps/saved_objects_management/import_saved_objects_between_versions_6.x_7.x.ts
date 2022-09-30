/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This test is importing saved objects from 6.8.x to 7.x.
 * Please note a separate pr handled this for 7.x to 8.0.0 https://github.com/elastic/kibana/pull/91908
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

  // FLAKY: https://github.com/elastic/kibana/issues/116061
  describe.skip('Export import saved objects between versions - 6.8.x -> 7.x', function () {
    beforeEach(async function () {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.load('x-pack/test/functional/es_archives/getting_started/shakespeare');
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.unload('x-pack/test/functional/es_archives/getting_started/shakespeare');
    });

    it('should be able to import 6.8 saved objects into 7.x', async function () {
      await retry.tryForTime(10000, async () => {
        const existingSavedObjects = await testSubjects.getVisibleText('exportAllObjects');
        // Kibana always has 1 advanced setting as a saved object
        await expect(existingSavedObjects).to.be('Export 1 object');
      });
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_6.8_import_saved_objects.json')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
      const importedSavedObjects = await testSubjects.getVisibleText('exportAllObjects');
      // verifying the count of saved objects after importing .json
      await expect(importedSavedObjects).to.be('Export 33 objects');
    });

    // This test is because of this bug - https://github.com/elastic/kibana/issues/101430
    // This test is also getting backported into 7.13.x
    it('should be able to import 7.12.x saved objects -by value panels with drilldowns into 7.x', async function () {
      await retry.tryForTime(10000, async () => {
        const existingSavedObjects = await testSubjects.getVisibleText('exportAllObjects');
        // Kibana always has 1 advanced setting as a saved object
        await expect(existingSavedObjects).to.be('Export 1 object');
      });
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_7.12_import_saved_objects.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
      const importedSavedObjects = await testSubjects.getVisibleText('exportAllObjects');
      // verifying the count of saved objects after importing .json
      await expect(importedSavedObjects).to.be('Export 16 objects');
    });
  });
}
