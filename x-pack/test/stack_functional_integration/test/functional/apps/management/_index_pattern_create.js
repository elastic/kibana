/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {
  describe('creating default index', function describeIndexTests() {
    const PageObjects = getPageObjects(['common', 'settings']);
    const retry = getService('retry');
    const log = getService('log');
    const browser = getService('browser');

    before(async () => {
      await PageObjects.common.navigateToApp('management', { insertTimestamp: false });
      await browser.setWindowSize(1200, 800);
    });

    it('create makelogs工程 index pattern', async function pageHeader() {
      log.debug('create makelogs工程 index pattern');
      await PageObjects.settings.createIndexPattern('makelogs工程-*');
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('makelogs工程-*');
    });

    describe('create logstash index pattern', function indexPatternCreation() {
      before(async () => {
        await retry.tryForTime(120000, async () => {
          log.debug('create Index Pattern');
          await PageObjects.settings.createIndexPattern();
        });
      });

      it('should have index pattern in page header', async function pageHeader() {
        const patternName = await PageObjects.settings.getIndexPageHeading();
        expect(patternName).to.be('logstash-*');
      });

      it('should have expected table headers', async function checkingHeader() {
        const headers = await PageObjects.settings.getTableHeader();
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

        await Promise.all(
          headers.map(async function compareHead(header, i) {
            const text = await header.getVisibleText();
            expect(text).to.be(expectedHeaders[i]);
          })
        );
      });
    });
  });
};
