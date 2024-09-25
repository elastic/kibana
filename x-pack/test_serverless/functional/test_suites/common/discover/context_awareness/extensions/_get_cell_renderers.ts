/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import expect from '@kbn/expect';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'unifiedFieldList',
    'svlCommonPage',
    'header',
  ]);
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const dataViews = getService('dataViews');
  const queryBar = getService('queryBar');
  const browser = getService('browser');
  const retry = getService('retry');

  describe('extension getCellRenderers', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    describe('ES|QL mode', () => {
      describe('Log Level Badge Cell', () => {
        it('should render log.level badge cell', async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: {
              esql: 'from my-example-logs,logstash* | sort @timestamp desc | where `log.level` is not null',
            },
          });
          await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();

          const firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
          const logLevelBadge = await firstCell.findByTestSubject('*logLevelBadgeCell-');
          expect(await logLevelBadge.getVisibleText()).to.be('debug');
          expect(await logLevelBadge.getComputedStyle('background-color')).to.be(
            'rgba(190, 207, 227, 1)'
          );
        });

        it("should not render log.level badge cell if it's not a logs data source", async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: {
              esql: 'from my-example* | sort @timestamp desc | where `log.level` is not null',
            },
          });
          await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();

          await retry.try(async () => {
            const firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
            expect(await firstCell.getVisibleText()).to.be('debug');
            await testSubjects.missingOrFail('*logLevelBadgeCell-');
          });
        });
      });
      describe('Service Name Cell', () => {
        it('should render service.name cell', async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: {
              esql: 'from my-example-logs,logstash* | sort @timestamp desc | where `service.name` is not null',
            },
          });
          await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('service.name');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();

          const firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
          const lastCell = await dataGrid.getCellElementExcludingControlColumns(2, 0);
          const firstServiceNameCell = await firstCell.findByTestSubject('serviceNameCell-java');
          const lastServiceNameCell = await lastCell.findByTestSubject('serviceNameCell-unknown');
          expect(await firstServiceNameCell.getVisibleText()).to.be('product');
          expect(await lastServiceNameCell.getVisibleText()).to.be('accounting');
        });

        it("should not render service.name cell if it's not a logs data source", async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: {
              esql: 'from my-example* | sort @timestamp desc | where `service.name` is not null',
            },
          });
          await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
            ensureCurrentUrl: false,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('service.name');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();

          await retry.try(async () => {
            const firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
            expect(await firstCell.getVisibleText()).to.be('product');
            await testSubjects.missingOrFail('*serviceNameCell*');
          });
        });
      });
    });

    describe('data view mode', () => {
      describe('Log Level Badge Cell', () => {
        it('should render log.level badge cell', async () => {
          await PageObjects.common.navigateToActualUrl('discover', undefined, {
            ensureCurrentUrl: false,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await dataViews.switchToAndValidate('my-example-logs,logstash*');
          await queryBar.setQuery('log.level:*');
          await queryBar.submitQuery();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();

          let firstCell: WebElementWrapper;
          let logLevelBadge: WebElementWrapper;

          await retry.try(async () => {
            firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
            logLevelBadge = await firstCell.findByTestSubject('*logLevelBadgeCell-');
            expect(await logLevelBadge.getVisibleText()).to.be('debug');
            expect(await logLevelBadge.getComputedStyle('background-color')).to.be(
              'rgba(190, 207, 227, 1)'
            );
          });

          // check Surrounding docs page
          await dataGrid.clickRowToggle();
          const [, surroundingActionEl] = await dataGrid.getRowActions();
          await surroundingActionEl.click();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await browser.refresh();
          await PageObjects.header.waitUntilLoadingHasFinished();

          await retry.try(async () => {
            firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
            logLevelBadge = await firstCell.findByTestSubject('*logLevelBadgeCell-');
            expect(await logLevelBadge.getVisibleText()).to.be('debug');
            expect(await logLevelBadge.getComputedStyle('background-color')).to.be(
              'rgba(190, 207, 227, 1)'
            );
          });
        });

        it("should not render log.level badge cell if it's not a logs data source", async () => {
          await PageObjects.common.navigateToActualUrl('discover', undefined, {
            ensureCurrentUrl: false,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await dataViews.switchToAndValidate('my-example-*');
          await queryBar.setQuery('log.level:*');
          await queryBar.submitQuery();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();

          let firstCell: WebElementWrapper;

          await retry.try(async () => {
            firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
            expect(await firstCell.getVisibleText()).to.be('debug');
            await testSubjects.missingOrFail('*logLevelBadgeCell-');
          });

          // check Surrounding docs page
          await dataGrid.clickRowToggle();
          const [, surroundingActionEl] = await dataGrid.getRowActions();
          await surroundingActionEl.click();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await browser.refresh();
          await PageObjects.header.waitUntilLoadingHasFinished();

          await retry.try(async () => {
            firstCell = await dataGrid.getCellElementExcludingControlColumns(1, 1);
            expect(await firstCell.getVisibleText()).to.be('debug');
            await testSubjects.missingOrFail('*logLevelBadgeCell-');
          });
        });
      });
      describe('Service Name Cell', () => {
        it('should render service.name cell', async () => {
          await PageObjects.common.navigateToActualUrl('discover', undefined, {
            ensureCurrentUrl: false,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await dataViews.switchToAndValidate('my-example-logs,logstash*');
          await queryBar.setQuery('service.name:*');
          await queryBar.submitQuery();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('service.name');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();

          let firstCell: WebElementWrapper;
          let lastCell: WebElementWrapper;

          await retry.try(async () => {
            firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
            lastCell = await dataGrid.getCellElementExcludingControlColumns(2, 1);
            const firstServiceNameCell = await firstCell.findByTestSubject('serviceNameCell-java');
            const lastServiceNameCell = await lastCell.findByTestSubject('serviceNameCell-unknown');
            expect(await firstServiceNameCell.getVisibleText()).to.be('product');
            expect(await lastServiceNameCell.getVisibleText()).to.be('accounting');
          });
        });

        it("should not render service.name cell if it's not a logs data source", async () => {
          await PageObjects.common.navigateToActualUrl('discover', undefined, {
            ensureCurrentUrl: false,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await dataViews.switchToAndValidate('my-example-*');
          await queryBar.setQuery('service.name:*');
          await queryBar.submitQuery();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('service.name');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();

          let firstCell: WebElementWrapper;
          let lastCell: WebElementWrapper;

          await retry.try(async () => {
            firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
            lastCell = await dataGrid.getCellElementExcludingControlColumns(2, 1);

            expect(await firstCell.getVisibleText()).to.be('product');
            expect(await lastCell.getVisibleText()).to.be('accounting');
            await testSubjects.missingOrFail('*serviceNameCell*');
          });
        });
      });
    });
  });
}
