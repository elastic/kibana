/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['settings', 'common', 'header']);

  describe('creating and deleting default data view', function describeIndexTests() {
    before(async function () {
      // TODO: emptyKibanaIndex fails in Serverless with
      // "index_not_found_exception: no such index [.kibana_ingest]",
      // so it was switched to `savedObjects.cleanStandardList()`
      await kibanaServer.savedObjects.cleanStandardList();
      // TODO: Loading this from `es_archives` in `test_serverless`
      // instead since minor modifications were required
      await esArchiver.loadIfNeeded(
        'x-pack/test_serverless/functional/es_archives/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');

      await kibanaServer.uiSettings.replace({});
      // TODO: Navigation to Data View Management is different in Serverless
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-dataViews');
    });

    after(async function () {
      // TODO: Loading this from `es_archives` in `test_serverless`
      // instead since minor modifications were required

      await esArchiver.unload(
        'x-pack/test_serverless/functional/es_archives/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    describe('can open and close editor', function () {
      it('without creating index pattern', async function () {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await testSubjects.click('closeFlyoutButton');
        await testSubjects.find('createDataViewButton');
      });
    });

    describe('validation', function () {
      it('can display errors', async function () {
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await PageObjects.settings.setIndexPatternField('log-fake*');
        await (await PageObjects.settings.getSaveIndexPatternButton()).click();
        await find.byClassName('euiFormErrorText');
      });

      it('can resolve errors and submit', async function () {
        await PageObjects.settings.setIndexPatternField('log*');
        await new Promise((e) => setTimeout(e, 500));
        await (await PageObjects.settings.getSaveDataViewButtonActive()).click();
        await PageObjects.settings.removeIndexPattern();
      });

      it('correctly validates timestamp after index pattern changes', async function () {
        // TODO: Navigation to Data View Management is different in Serverless
        await PageObjects.common.navigateToApp('management');
        await testSubjects.click('app-card-dataViews');
        await PageObjects.settings.clickAddNewIndexPatternButton();
        // setting the index pattern also sets the time field
        await PageObjects.settings.setIndexPatternField('log*');
        // wait for timestamp fields to load
        await new Promise((e) => setTimeout(e, 1000));
        // this won't have 'timestamp' field
        await PageObjects.settings.setIndexPatternField('kibana*');
        // wait for timestamp fields to load
        await new Promise((e) => setTimeout(e, 1000));
        await (await PageObjects.settings.getSaveIndexPatternButton()).click();
        // verify an error is displayed
        await find.byClassName('euiFormErrorText');
        await testSubjects.click('closeFlyoutButton');
      });
    });

    describe('special character handling', () => {
      it('should handle special charaters in template input', async () => {
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.setIndexPatternField('❤️');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText('createIndexPatternStatusMessage')).to.contain(
            `The index pattern you entered doesn\'t match any data streams, indices, or index aliases.`
          );
        });
      });

      after(async () => {
        // TODO: Navigation to Data View Management is different in Serverless
        await PageObjects.common.navigateToApp('management');
        await testSubjects.click('app-card-dataViews');
      });
    });

    describe('index pattern creation', function indexPatternCreation() {
      let indexPatternId: string;

      before(function () {
        return PageObjects.settings
          .createIndexPattern('logstash-*')
          .then((id) => (indexPatternId = id));
      });

      it('should have index pattern in page header', async function () {
        const patternName = await PageObjects.settings.getIndexPageHeading();
        expect(patternName).to.be('logstash-*');
      });

      it('should have index pattern in url', function url() {
        return retry.try(function tryingForTime() {
          return browser.getCurrentUrl().then(function (currentUrl) {
            expect(currentUrl).to.contain(indexPatternId);
          });
        });
      });

      it('should have expected table headers', function checkingHeader() {
        return PageObjects.settings.getTableHeader().then(function (headers) {
          log.debug('header.length = ' + headers.length);
          const expectedHeaders = [
            'Name',
            'Type',
            'Format',
            'Searchable',
            'Aggregatable',
            'Excluded',
          ];

          expect(headers.length).to.be(expectedHeaders.length);

          const comparedHeaders = headers.map(function compareHead(header, i) {
            return header.getVisibleText().then(function (text) {
              expect(text).to.be(expectedHeaders[i]);
            });
          });

          return Promise.all(comparedHeaders);
        });
      });
    });

    describe('edit index pattern', () => {
      it('on edit click', async () => {
        await PageObjects.settings.editIndexPattern('logstash-*', '@timestamp', 'Logstash Star');

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText('indexPatternTitle')).to.contain(
            `Logstash Star`
          );
        });
      });
      it('can save with same name', async () => {
        await PageObjects.settings.editIndexPattern(
          'logstash-*,hello_world*',
          '@timestamp',
          'Logstash Star',
          true
        );

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText('indexPatternTitle')).to.contain(
            `Logstash Star`
          );
        });
      });
      it('shows edit confirm message when editing index-pattern', async () => {
        await PageObjects.settings.editIndexPattern(
          'logstash-2*',
          '@timestamp',
          'Index Star',
          true
        );

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText('indexPatternTitle')).to.contain(`Index Star`);
        });
      });
    });

    describe('index pattern edit', function () {
      it('should update field list', async function () {
        await PageObjects.settings.editIndexPattern(
          'kibana_sample_data_flights',
          'timestamp',
          undefined,
          true
        );

        await retry.try(async () => {
          // verify initial field list
          expect(await testSubjects.exists('field-name-AvgTicketPrice')).to.be(true);
        });

        await PageObjects.settings.editIndexPattern('logstash-*', '@timestamp', undefined, true);
        await retry.try(async () => {
          // verify updated field list
          expect(await testSubjects.exists('field-name-@message')).to.be(true);
        });
      });

      it('should disable Save button after pressing', async function () {
        await PageObjects.settings.clickEditIndexButton();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          await PageObjects.settings.setIndexPatternField('logs*');
        });
        await PageObjects.settings.selectTimeFieldOption('@timestamp');

        expect(await testSubjects.isEnabled('saveIndexPatternButton')).to.be(true);
        await (await PageObjects.settings.getSaveDataViewButtonActive()).click();

        // wait for the confirmation modal to open
        await retry.waitFor('confirmation modal', async () => {
          return await testSubjects.exists('confirmModalConfirmButton');
        });

        // while the confirmation modal is open, we can check that the form button has actually become disabled
        expect(await testSubjects.isEnabled('saveIndexPatternButton')).to.be(false);

        await testSubjects.click('confirmModalConfirmButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });
    });

    describe('index pattern deletion', function indexDelete() {
      before(function () {
        const expectedAlertText = 'Delete data view';
        return PageObjects.settings.removeIndexPattern().then(function (alertText) {
          expect(alertText).to.be(expectedAlertText);
        });
      });

      it('should return to index pattern list', function indexNotInUrl() {
        // give the url time to settle
        return retry.try(function tryingForTime() {
          return browser.getCurrentUrl().then(function (currentUrl) {
            log.debug('currentUrl = ' + currentUrl);
            expect(currentUrl).to.contain('management/kibana/dataViews');
          });
        });
      });
    });
  });
}
