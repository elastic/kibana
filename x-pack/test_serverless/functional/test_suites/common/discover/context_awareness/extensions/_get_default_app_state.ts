/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import kbnRison from '@kbn/rison';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'svlCommonPage']);
  const dataViews = getService('dataViews');
  const dataGrid = getService('dataGrid');

  describe('extension getDefaultAppState', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsViewer();
    });

    describe('ES|QL mode', () => {
      it('should render default columns and row height', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: {
            esql: 'from my-example-logs',
          },
        });
        await PageObjects.common.navigateToApp('discover', {
          hash: `/?_a=${state}`,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'log.level', 'message']);
        await dataGrid.clickGridSettings();
        const rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Custom');
        const rowHeightNumber = await dataGrid.getCustomRowHeightNumber();
        expect(rowHeightNumber).to.be(5);
      });
    });

    describe('data view mode', () => {
      it('should render default columns and row height', async () => {
        await PageObjects.common.navigateToApp('discover');
        await dataViews.switchTo('my-example-logs');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const columns = await PageObjects.discover.getColumnHeaders();
        expect(columns).to.eql(['@timestamp', 'log.level', 'message']);
        await dataGrid.clickGridSettings();
        const rowHeightValue = await dataGrid.getCurrentRowHeightValue();
        expect(rowHeightValue).to.be('Custom');
        const rowHeightNumber = await dataGrid.getCustomRowHeightNumber();
        expect(rowHeightNumber).to.be(5);
      });
    });
  });
}
