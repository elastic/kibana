/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { range } from 'lodash';

export function MonitoringLogstashPipelinesProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['monitoring']);

  const SUBJ_LISTING_PAGE = 'logstashPipelinesListing';

  const SUBJ_TABLE_CONTAINER = 'logstashPipelinesTableContainer';
  const SUBJ_TABLE_NO_DATA = `${SUBJ_TABLE_CONTAINER} monitoringTableNoData`;
  const SUBJ_SEARCH_BAR = `${SUBJ_TABLE_CONTAINER} monitoringTableToolBar`;

  const SUBJ_TABLE_SORT_EVENTS_EMITTED_RATE_COL = `${SUBJ_TABLE_CONTAINER} tableHeaderCell-eventsEmittedRate`;

  const SUBJ_TABLE_BODY = 'logstashPipelinesTableBody';
  const SUBJ_PIPELINES_IDS = `${SUBJ_TABLE_BODY} id`;
  const SUBJ_PIPELINES_EVENTS_EMITTED_RATES = `${SUBJ_TABLE_BODY} eventsEmittedRate`;
  const SUBJ_PIPELINES_NODE_COUNTS = `${SUBJ_TABLE_BODY} nodeCount`;

  return new class LogstashPipelines {
    async isOnListing() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_LISTING_PAGE));
      return pageId !== null;
    }

    getRows() {
      return PageObjects.monitoring.tableGetRows(SUBJ_TABLE_BODY);
    }

    async getPipelinesAll() {
      const ids = await testSubjects.getVisibleTextAll(SUBJ_PIPELINES_IDS);
      const eventsEmittedRates = await testSubjects.getVisibleTextAll(SUBJ_PIPELINES_EVENTS_EMITTED_RATES);
      const nodeCounts = await testSubjects.getVisibleTextAll(SUBJ_PIPELINES_NODE_COUNTS);

      // tuple-ize the icons and texts together into an array of objects
      const tableRows = await this.getRows();
      const iterator = range(tableRows.length);
      return iterator.reduce((all, current) => {
        return [
          ...all,
          {
            id: ids[current],
            eventsEmittedRate: eventsEmittedRates[current],
            nodeCount: nodeCounts[current]
          }
        ];
      }, []);
    }

    async clickEventsEmittedRateCol() {
      const headerCell = await testSubjects.find(SUBJ_TABLE_SORT_EVENTS_EMITTED_RATE_COL);
      const button = await headerCell.findByTagName('button');
      return button.click();
    }

    setFilter(text) {
      return PageObjects.monitoring.tableSetFilter(SUBJ_SEARCH_BAR, text);
    }

    clearFilter() {
      return PageObjects.monitoring.tableClearFilter(SUBJ_SEARCH_BAR);
    }

    assertNoData() {
      return PageObjects.monitoring.assertTableNoData(SUBJ_TABLE_NO_DATA);
    }
  };
}
