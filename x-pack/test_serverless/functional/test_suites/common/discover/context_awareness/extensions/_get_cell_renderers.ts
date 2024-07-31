/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'unifiedFieldList']);
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const dataViews = getService('dataViews');
  const queryBar = getService('queryBar');

  describe('extension getCellRenderers', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    describe('ES|QL mode', () => {
      it('should render log.level badge cell', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: {
            esql: 'from my-example-logs,logstash* | sort @timestamp desc | where `log.level` is not null',
          },
        });
        await PageObjects.common.navigateToApp('discover', {
          hash: `/?_a=${state}`,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
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
        await PageObjects.common.navigateToApp('discover', {
          hash: `/?_a=${state}`,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
        const firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await firstCell.getVisibleText()).to.be('debug');
        await testSubjects.missingOrFail('*logLevelBadgeCell-');
      });
    });

    describe('data view mode', () => {
      it('should render log.level badge cell', async () => {
        await PageObjects.common.navigateToApp('discover');
        await dataViews.switchTo('my-example-logs,logstash*');
        await queryBar.setQuery('log.level:*');
        await queryBar.submitQuery();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
        const firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
        const logLevelBadge = await firstCell.findByTestSubject('*logLevelBadgeCell-');
        expect(await logLevelBadge.getVisibleText()).to.be('debug');
        expect(await logLevelBadge.getComputedStyle('background-color')).to.be(
          'rgba(190, 207, 227, 1)'
        );
      });

      it("should not render log.level badge cell if it's not a logs data source", async () => {
        await PageObjects.common.navigateToApp('discover');
        await dataViews.switchTo('my-example-*');
        await queryBar.setQuery('log.level:*');
        await queryBar.submitQuery();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
        const firstCell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
        expect(await firstCell.getVisibleText()).to.be('debug');
        await testSubjects.missingOrFail('*logLevelBadgeCell-');
      });
    });
  });
}
