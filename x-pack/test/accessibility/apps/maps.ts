/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const { common } = getPageObjects(['maps', 'common']);
  const PageObjects = getPageObjects(['maps', 'common']);
  const kibanaServer = getService('kibanaServer');

  describe('Maps', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/maps.json'
      );
      await common.navigateToApp('maps');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/maps/data');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/maps.json'
      );
    });

    it('loads  maps workpads', async function () {
      await retry.waitFor(
        'maps workpads visible',
        async () => await testSubjects.exists('itemsInMemTable')
      );
      await a11y.testAppSnapshot();
    });

    it('provides bulk selection', async function () {
      await testSubjects.click('checkboxSelectAll');
      await a11y.testAppSnapshot();
    });

    it('provides bulk delete', async function () {
      await testSubjects.click('deleteSelectedItems');
      await a11y.testAppSnapshot();
    });

    it('single delete modal', async function () {
      await testSubjects.click('confirmModalConfirmButton');
      await a11y.testAppSnapshot();
    });

    it('single cancel modal', async function () {
      await testSubjects.click('confirmModalCancelButton');
      await a11y.testAppSnapshot();
    });

    it('create new map', async function () {
      await testSubjects.click('newItemButton');
      await a11y.testAppSnapshot();
    });

    it('clip map settings', async function () {
      await retry.waitFor(
        'Map settings visible',
        async () => await testSubjects.exists('openSettingsButton')
      );
      await a11y.testAppSnapshot();
    });

    it('map save button', async function () {
      await testSubjects.click('mapSaveButton');
      await a11y.testAppSnapshot();
    });

    it('map cancel button', async function () {
      await testSubjects.click('saveCancelButton');
      await a11y.testAppSnapshot();
    });

    it('map inspect button', async function () {
      await testSubjects.click('openInspectorButton'); // close modal from previous test
      await a11y.testAppSnapshot();
    });

    it('map inspect view chooser ', async function () {
      await testSubjects.click('inspectorViewChooser'); // close modal from previous test
      await a11y.testAppSnapshot();
    });

    it('map inspector view chooser requests', async function () {
      await testSubjects.click('inspectorViewChooserRequests'); // close modal from previous test
      await a11y.testAppSnapshot();
    });

    it('map inspector close', async function () {
      await testSubjects.click('euiFlyoutCloseButton');
      await a11y.testAppSnapshot();
    });

    it('full screen button should exist', async () => {
      await testSubjects.click('mapsFullScreenMode');
      await a11y.testAppSnapshot();
    });

    it('displays exit full screen logo button', async () => {
      await testSubjects.click('exitFullScreenModeLogo');
      await a11y.testAppSnapshot();
    });
  });
}
