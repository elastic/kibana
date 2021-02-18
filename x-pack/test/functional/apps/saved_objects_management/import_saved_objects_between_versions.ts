/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

 import expect from '@kbn/expect';
 import path from 'path';
 import { keyBy } from 'lodash';
 import { FtrProviderContext } from '../../ftr_provider_context';

 export default function ({ getService, getPageObjects }: FtrProviderContext) {


   const kibanaServer = getService('kibanaServer');
   const esArchiver = getService('esArchiver');
   const PageObjects = getPageObjects(['common', 'settings', 'header', 'savedObjects']);
   const testSubjects = getService('testSubjects');
   const log = getService('log');
   const retry = getService('retry');
   const spaces = getService('spaces');



  describe.only('Export import saved objects between versions', function () {
    beforeEach(async function () {

      await esArchiver.load('logstash_functional');
      await esArchiver.load('getting_started/shakespeare');
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();

    });

    after(async () => {
      await esArchiver.unload('logstash_functional');
      await esArchiver.unload('getting_started/shakespeare');
    });

    it('should import 7.8 saved objects', async function () {


      await retry.tryForTime(10000, async () => {
      const existingSavedObjects = await testSubjects.getVisibleText('exportAllObjects');
      //Kibana always has 1 advanced setting as a saved object
      await expect(existingSavedObjects).to.be('Export 1 object');
    });


      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_7.12_import_saved_objects.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
      const importedSavedObjects = await testSubjects.getVisibleText('exportAllObjects');

      await expect(importedSavedObjects).to.be('Export 38 objects');


      expect(await PageObjects.savedObjects.getObjectTypeByTitle('logstash_gaugechart')).to.eql(
        'visualization');
        expect(await PageObjects.savedObjects.getObjectTypeByTitle('logstash_graph')).to.eql(
          'graph-workspace');
          expect(await PageObjects.savedObjects.getObjectTypeByTitle('arts_tag')).to.eql(
            'tag');

            expect(await PageObjects.savedObjects.getObjectTypeByTitle('logstash_canvas')).to.eql(
              'canvas-workpad');
              expect(await PageObjects.savedObjects.getObjectTypeByTitle('logstash_lensviz')).to.eql(
                'lens');





    });


  });
}
