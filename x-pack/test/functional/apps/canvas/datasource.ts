/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function canvasExpressionTest({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['canvas']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const monacoEditor = getService('monacoEditor');

  describe('datasource', function () {
    // there is an issue with FF not properly clicking on workpad elements
    this.tags('skipFirefox');

    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/kibana_sample_data_flights'
      );
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/legacy.json');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern.json'
      );

      await kibanaServer.uiSettings.update({
        defaultIndex: 'kibana_sample_data_flights',
      });

      // create new test workpad
      await PageObjects.canvas.goToListingPage();
      await PageObjects.canvas.createNewWorkpad();
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/legacy.json');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern.json'
      );
    });

    describe('esdocs', function () {
      it('sidebar shows to esdocs datasource settings', async () => {
        await PageObjects.canvas.createNewDatatableElement();

        // find the first workpad element (a markdown element) and click it to select it
        await testSubjects.click('canvasWorkpadPage > canvasWorkpadPageElementContent', 20000);

        // open Data tab
        await PageObjects.canvas.openDatasourceTab();

        // change datasource to esdocs
        await PageObjects.canvas.changeDatasourceTo('esdocs');

        // click data view select
        await testSubjects.click('canvasDataViewSelect');

        // check that data view options list is displayed
        expect(await testSubjects.exists('canvasDataViewSelect-optionsList'));

        // check that the logstash-* data view without name attribute is available
        expect(await testSubjects.exists('canvasDataViewSelect__logstash-*'));
      });

      it('updates expression to use esdocs', async () => {
        await testSubjects.click('canvasDataViewSelect__logstash-*');

        await PageObjects.canvas.saveDatasourceChanges();

        await PageObjects.canvas.openExpressionEditor();
        await monacoEditor.waitCodeEditorReady('canvasExpressionInput');
        expect(await monacoEditor.getCodeEditorValue()).contain('esdocs index="logstash-*"');
      });
    });
  });
}
