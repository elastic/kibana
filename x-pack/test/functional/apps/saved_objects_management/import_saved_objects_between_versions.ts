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

  describe('Export import saved objects between versions', function () {
    beforeEach(async function () {
      await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.load('x-pack/test/functional/es_archives/getting_started/shakespeare');
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.unload('x-pack/test/functional/es_archives/getting_started/shakespeare');
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    it('should be able to import 7.13 saved objects into 8.0.0', async function () {
      await retry.tryForTime(10000, async () => {
        const existingSavedObjects = await testSubjects.getVisibleText('exportAllObjects');
        // Kibana always has 1 advanced setting as a saved object
        await expect(existingSavedObjects).to.be('Export 1 object');
      });
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_7.13_import_saved_objects.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
      const importedSavedObjects = await testSubjects.getVisibleText('exportAllObjects');
      // verifying the count of saved objects after importing .ndjson
      await expect(importedSavedObjects).to.be('Export 88 objects');
    });
  });
}
