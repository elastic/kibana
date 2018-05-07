/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { range } from 'lodash';

export function MonitoringElasticsearchIndicesProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['monitoring']);
  const retry = getService('retry');

  const SUBJ_LISTING_PAGE = 'elasticsearchIndicesListingPage';

  const SUBJ_TABLE_CONTAINER = 'indicesTableContainer';
  const SUBJ_TABLE_NO_DATA = `${SUBJ_TABLE_CONTAINER} monitoringTableNoData`;
  const SUBJ_SEARCH_BAR = `${SUBJ_TABLE_CONTAINER} monitoringTableToolBar`;

  const SUBJ_TABLE_SORT_SEARCH_COL = `${SUBJ_TABLE_CONTAINER} tableHeaderCell-searchRate`;

  const SUBJ_TABLE_BODY = 'indicesTableBody';
  const SUBJ_INDICES_NAMES = `${SUBJ_TABLE_BODY} name`;
  const SUBJ_INDICES_STATUSES = `${SUBJ_TABLE_BODY} statusIcon`;
  const SUBJ_INDICES_DOCUMENT_COUNTS = `${SUBJ_TABLE_BODY} documentCount`;
  const SUBJ_INDICES_DATA_SIZES = `${SUBJ_TABLE_BODY} dataSize`;
  const SUBJ_INDICES_INDEX_RATES = `${SUBJ_TABLE_BODY} indexRate`;
  const SUBJ_INDICES_SEARCH_RATES = `${SUBJ_TABLE_BODY} searchRate`;
  const SUBJ_INDICES_UNASSIGNED_SHARD_COUNTS = `${SUBJ_TABLE_BODY} unassignedShards`;

  const SUBJ_INDEX_LINK_PREFIX = `${SUBJ_TABLE_BODY} indexLink-`;

  return new class ElasticsearchIndices {
    async isOnListing() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_LISTING_PAGE));
      return pageId !== null;
    }

    async clickSearchCol() {
      const headerCell = await testSubjects.find(SUBJ_TABLE_SORT_SEARCH_COL);
      const button = await headerCell.findByTagName('button');
      return button.click();
    }

    assertNoData() {
      return PageObjects.monitoring.assertTableNoData(SUBJ_TABLE_NO_DATA);
    }

    getRows() {
      return PageObjects.monitoring.tableGetRows(SUBJ_TABLE_BODY);
    }

    setFilter(text) {
      return PageObjects.monitoring.tableSetFilter(SUBJ_SEARCH_BAR, text);
    }

    clearFilter() {
      return PageObjects.monitoring.tableClearFilter(SUBJ_SEARCH_BAR);
    }

    async getIndicesAll() {
      const names = await testSubjects.getVisibleTextAll(SUBJ_INDICES_NAMES);
      const statuses = await testSubjects.getPropertyAll(SUBJ_INDICES_STATUSES, 'alt');
      const documentCounts = await testSubjects.getVisibleTextAll(SUBJ_INDICES_DOCUMENT_COUNTS);
      const dataSizes = await testSubjects.getVisibleTextAll(SUBJ_INDICES_DATA_SIZES);
      const indexRates = await testSubjects.getVisibleTextAll(SUBJ_INDICES_INDEX_RATES);
      const searchRates = await testSubjects.getVisibleTextAll(SUBJ_INDICES_SEARCH_RATES);
      const unassignedShardsCounts = await testSubjects.getVisibleTextAll(SUBJ_INDICES_UNASSIGNED_SHARD_COUNTS);

      // tuple-ize the icons and texts together into an array of objects
      const tableRows = await this.getRows();
      const iterator = range(tableRows.length);
      return iterator.reduce((all, current) => {
        return [
          ...all,
          {
            name: names[current],
            status: statuses[current],
            documentCount: documentCounts[current],
            dataSize: dataSizes[current],
            indexRate: indexRates[current],
            searchRate: searchRates[current],
            unassignedShards: unassignedShardsCounts[current],
          }
        ];
      }, []);
    }

    clickRowByName(indexName) {
      return testSubjects.click(SUBJ_INDEX_LINK_PREFIX + indexName);
    }

  };
}
