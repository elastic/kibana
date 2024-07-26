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
  const PageObjects = getPageObjects([
    'common',
    'timePicker',
    'discover',
    'unifiedFieldList',
    'svlCommonPage',
  ]);
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');

  describe('extension getRowIndicatorProvider', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    it('should not render log.level row indicators for logs data source without a log.level field', async () => {
      const state = kbnRison.encode({
        dataSource: { type: 'esql' },
        query: { esql: 'from logstash* | sort @timestamp desc' },
      });
      await PageObjects.common.navigateToApp('discover', {
        hash: `/?_a=${state}`,
      });
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      // logstash does not have log.level field, so the color indicator should not be rendered
      await testSubjects.existOrFail('euiDataGridBody');
      await testSubjects.missingOrFail('dataGridHeaderCell-colorIndicator');

      // switch the time frame back
      await browser.goBack();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    it('should not render log.level row indicators if not a logs data source', async () => {
      const state = kbnRison.encode({
        dataSource: { type: 'esql' },
        query: { esql: 'from my-example* | sort @timestamp desc' },
      });
      await PageObjects.common.navigateToApp('discover', {
        hash: `/?_a=${state}`,
      });
      await PageObjects.discover.waitUntilSearchingHasFinished();
      // my-example* has a log.level field, but it's not matching the logs profile, so the color indicator should not be rendered
      await testSubjects.existOrFail('euiDataGridBody');
      await testSubjects.missingOrFail('dataGridHeaderCell-colorIndicator');
    });

    it('should render log.level row indicators', async () => {
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
      // in this case it's matching the logs data source profile and has a log.level field, so the color indicator should be rendered
      await testSubjects.existOrFail('dataGridHeaderCell-colorIndicator');
      const firstCell = await dataGrid.getCellElement(0, 0);
      const firstColorIndicator = await firstCell.findByTestSubject(
        'unifiedDataTableRowColorIndicatorCell'
      );
      expect(await firstColorIndicator.getComputedStyle('background-color')).to.be(
        'rgba(190, 207, 227, 1)'
      );
      expect(await firstColorIndicator.getAttribute('title')).to.be('Debug');
    });
  });
}
