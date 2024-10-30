/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const TEST_INDEX_PATTERN = 'logstash-*';
const TEST_ANCHOR_ID = 'AU_x3_BrGFA8no6QjjaI';
const TEST_ANCHOR_FILTER_FIELD = 'geo.src';
const TEST_ANCHOR_FILTER_VALUE = 'IN';
const TEST_COLUMN_NAMES = ['extension', 'geo.src'];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');

  const PageObjects = getPageObjects(['common', 'context', 'svlCommonPage', 'discover']);
  const testSubjects = getService('testSubjects');

  describe('context filters', function contextSize() {
    before(async function () {
      await kibanaServer.uiSettings.update({
        'discover:rowHeightOption': 0, // to have more grid rows visible at once
      });
      await PageObjects.svlCommonPage.loginAsViewer();
      await PageObjects.common.navigateToApp('discover');
    });

    beforeEach(async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_ID, {
        columns: TEST_COLUMN_NAMES,
      });
    });

    it('inclusive filter should be addable via expanded data grid rows', async function () {
      await retry.waitFor(`filter ${TEST_ANCHOR_FILTER_FIELD} in filterbar`, async () => {
        await dataGrid.clickRowToggle({ isAnchorRow: true, renderMoreRows: true });
        await PageObjects.discover.findFieldByNameOrValueInDocViewer(TEST_ANCHOR_FILTER_FIELD);
        await dataGrid.clickFieldActionInFlyout(
          TEST_ANCHOR_FILTER_FIELD,
          'addFilterForValueButton'
        );
        await PageObjects.context.waitUntilContextLoadingHasFinished();

        return await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, TEST_ANCHOR_FILTER_VALUE, true);
      });

      await dataGrid.closeFlyout();

      await retry.waitFor(`filter matching docs in data grid`, async () => {
        const fields = await dataGrid.getFields();
        return fields
          .map((row) => row[2])
          .every((fieldContent) => fieldContent === TEST_ANCHOR_FILTER_VALUE);
      });
    });

    it('inclusive filter should be toggleable via the filter bar', async function () {
      await filterBar.addFilter({
        field: TEST_ANCHOR_FILTER_FIELD,
        operation: 'is',
        value: TEST_ANCHOR_FILTER_VALUE,
      });
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      // disable filter
      await filterBar.toggleFilterEnabled(TEST_ANCHOR_FILTER_FIELD);
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      await retry.waitFor(`a disabled filter in filterbar`, async () => {
        return await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, TEST_ANCHOR_FILTER_VALUE, false);
      });

      await retry.waitFor('filters are disabled', async () => {
        const fields = await dataGrid.getFields();
        const hasOnlyFilteredRows = fields
          .map((row) => row[2])
          .every((fieldContent) => fieldContent === TEST_ANCHOR_FILTER_VALUE);
        return hasOnlyFilteredRows === false;
      });
    });

    it('filter for presence should be addable via expanded data grid rows', async function () {
      await retry.waitFor('an exists filter in the filterbar', async () => {
        await dataGrid.clickRowToggle({ isAnchorRow: true, renderMoreRows: true });
        await dataGrid.clickFieldActionInFlyout(TEST_ANCHOR_FILTER_FIELD, 'addExistsFilterButton');
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        return await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, 'exists', true);
      });
    });

    const addPinnedFilter = async () => {
      await filterBar.addFilter({
        field: TEST_ANCHOR_FILTER_FIELD,
        operation: 'is',
        value: TEST_ANCHOR_FILTER_VALUE,
      });
      await filterBar.toggleFilterPinned(TEST_ANCHOR_FILTER_FIELD);
    };

    const everyFieldMatches = async (matches: (field: string[]) => boolean) => {
      const fields = await dataGrid.getFields();
      return fields.every(matches);
    };

    it('should update the data grid when a pinned filter is modified', async function () {
      await addPinnedFilter();
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      expect(await everyFieldMatches((field) => field[2] === TEST_ANCHOR_FILTER_VALUE)).to.be(true);
      await filterBar.toggleFilterNegated(TEST_ANCHOR_FILTER_FIELD);
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      expect(await everyFieldMatches((field) => field[2] === TEST_ANCHOR_FILTER_VALUE)).to.be(
        false
      );
    });

    const expectFiltersToExist = async () => {
      expect(await filterBar.getFilterCount()).to.be(2);
      expect(
        await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, TEST_ANCHOR_FILTER_VALUE, true, true)
      ).to.be(true);
      expect(await filterBar.hasFilter('extension', 'png')).to.be(true);
      expect(
        await everyFieldMatches(
          (field) => field[1] === 'png' && field[2] === TEST_ANCHOR_FILTER_VALUE
        )
      ).to.be(true);
    };

    it('should preserve filters when the page is refreshed', async function () {
      await addPinnedFilter();
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'png' });
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      await expectFiltersToExist();
      await browser.refresh();
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      await expectFiltersToExist();
    });

    it('should update filters when navigating forward and backward in history', async () => {
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'png' });
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      expect(await filterBar.getFilterCount()).to.be(1);
      expect(await filterBar.hasFilter('extension', 'png')).to.be(true);
      expect(await everyFieldMatches((field) => field[1] === 'png')).to.be(true);
      await browser.goBack();
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      expect(await filterBar.getFilterCount()).to.be(0);
      expect(await everyFieldMatches((field) => field[1] === 'png')).to.be(false);
      await browser.goForward();
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      expect(await filterBar.getFilterCount()).to.be(1);
      expect(await filterBar.hasFilter('extension', 'png')).to.be(true);
      expect(await everyFieldMatches((field) => field[1] === 'png')).to.be(true);
    });

    it('should add or filter', async () => {
      await filterBar.addFilter({
        condition: 'OR',
        filters: [
          { field: 'extension', operation: 'is', value: 'png' },
          { field: 'bytes', operation: 'is between', value: { from: '1000', to: '2000' } },
        ],
      });

      await PageObjects.context.waitUntilContextLoadingHasFinished();
      expect(await filterBar.getFilterCount()).to.be(1);
      expect(await filterBar.hasFilterWithId('0')).to.be(true);

      await filterBar.clickEditFilterById('0');

      expect(await filterBar.getFilterEditorPreview()).to.equal(
        'extension: png OR bytes: 1,000B to 2KB'
      );
    });

    it('should add and filter', async () => {
      await filterBar.addFilter({
        condition: 'AND',
        filters: [
          { field: 'extension', operation: 'is one of', value: ['png', 'jpeg'] },
          { field: 'bytes', operation: 'is between', value: { from: '1000', to: '2000' } },
        ],
      });

      await PageObjects.context.waitUntilContextLoadingHasFinished();
      expect(await filterBar.getFilterCount()).to.be(1);
      expect(await filterBar.hasFilterWithId('0')).to.be(true);

      await filterBar.clickEditFilterById('0');

      expect(await filterBar.getFilterEditorPreview()).to.equal(
        'extension: is one of png, jpeg AND bytes: 1,000B to 2KB'
      );
    });

    it('should add nested filters', async () => {
      await filterBar.addFilter({
        condition: 'AND',
        filters: [
          {
            condition: 'OR',
            filters: [
              { field: 'clientip', operation: 'does not exist' },
              { field: 'extension', operation: 'is one of', value: ['png', 'jpeg'] },
            ],
          },
          { field: 'bytes', operation: 'is between', value: { from: '1000', to: '2000' } },
        ],
      });

      await PageObjects.context.waitUntilContextLoadingHasFinished();
      expect(await filterBar.getFilterCount()).to.be(1);
      expect(await filterBar.hasFilterWithId('0')).to.be(true);

      await filterBar.clickEditFilterById('0');

      expect(await filterBar.getFilterEditorPreview()).to.equal(
        '(NOT clientip: exists OR extension: is one of png, jpeg) AND bytes: 1,000B to 2KB'
      );
    });

    it('should add comma delimiter values', async () => {
      await filterBar.addFilter({ field: 'extension', operation: 'is one of', value: 'png, jpeg' });

      await PageObjects.context.waitUntilContextLoadingHasFinished();
      expect(await filterBar.getFilterCount()).to.be(1);
      expect(await filterBar.hasFilterWithId('0')).to.be(true);

      await filterBar.clickEditFilterById('0');

      expect(await filterBar.getFilterEditorPreview()).to.equal('extension: is one of png, jpeg');
    });

    it('should display the negated values correctly', async () => {
      await filterBar.addFilter({ field: 'extension', operation: 'is not', value: 'png' });

      await PageObjects.context.waitUntilContextLoadingHasFinished();
      expect(await filterBar.getFilterCount()).to.be(1);
      const filterLabel = await filterBar.getFiltersLabel();
      expect(filterLabel[0]).to.be('NOT extension: png');

      await filterBar.clickEditFilterById('0');
      await filterBar.addAndFilter('0');
      await filterBar.createFilter({ field: 'extension', operation: 'is', value: 'jpeg' }, '0.1');
      await testSubjects.clickWhenNotDisabled('saveFilter');

      const filterLabelUpdated = await filterBar.getFiltersLabel();
      expect(filterLabelUpdated[0]).to.be('NOT extension: png AND extension: jpeg');
    });
  });
}
