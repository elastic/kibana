/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
        headers.map(async function compareHead(header) {
          const text = await header.getVisibleText();
          log.debug(text);
        });
        log.debug('header.length = ' + headers.length);
        let expectedHeaders;
        log.debug(`process.env.LOCALE=${process.env.LOCALE}`);
        switch (process.env.LOCALE) {
          case 'ja-JP':
            log.debug('testing Japanese now ------------');
            expectedHeaders = ['名前', '型', 'フォーマット', '検索可能', '集約可能', '除外'];
            break;
          case 'zh-CN':
            log.debug('testing Chinese now ------------');
            expectedHeaders = ['名称', '类型', '格式', '可搜索', '可聚合', '已排除'];
            break;
          default:
            log.debug('testing default English now ------------');
            expectedHeaders = ['Name', 'Type', 'Format', 'Searchable', 'Aggregatable', 'Excluded'];
        }
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
