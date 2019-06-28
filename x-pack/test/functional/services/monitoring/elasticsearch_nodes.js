/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { range } from 'lodash';

export function MonitoringElasticsearchNodesProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['monitoring']);
  const retry = getService('retry');

  const SUBJ_LISTING_PAGE = 'elasticsearchNodesListingPage';

  const SUBJ_TABLE_CONTAINER = 'elasticsearchNodesTableContainer';
  const SUBJ_TABLE_NO_DATA = `${SUBJ_TABLE_CONTAINER} monitoringTableNoData`;
  const SUBJ_SEARCH_BAR = `${SUBJ_TABLE_CONTAINER} monitoringTableToolBar`;

  const SUBJ_TABLE_SORT_NAME_COL = `${SUBJ_TABLE_CONTAINER} tableHeaderCell_name_0`;
  const SUBJ_TABLE_SORT_STATUS_COL = `${SUBJ_TABLE_CONTAINER} tableHeaderCell_isOnline_1`;
  const SUBJ_TABLE_SORT_SHARDS_COL = `${SUBJ_TABLE_CONTAINER} tableHeaderCell_shardCount_2`;
  const SUBJ_TABLE_SORT_CPU_COL = `${SUBJ_TABLE_CONTAINER} tableHeaderCell_node_cpu_utilization_3`;
  const SUBJ_TABLE_SORT_LOAD_COL = `${SUBJ_TABLE_CONTAINER} tableHeaderCell_node_load_average_4`;
  const SUBJ_TABLE_SORT_MEM_COL = `${SUBJ_TABLE_CONTAINER} tableHeaderCell_node_jvm_mem_percent_5`;
  const SUBJ_TABLE_SORT_DISK_COL = `${SUBJ_TABLE_CONTAINER} tableHeaderCell_node_free_space_6`;

  const SUBJ_TABLE_BODY = 'elasticsearchNodesTableContainer';
  const SUBJ_NODES_NAMES = `${SUBJ_TABLE_BODY} name`;
  const SUBJ_NODES_STATUSES = `${SUBJ_TABLE_BODY} statusIcon`;
  const SUBJ_NODES_CPUS = `${SUBJ_TABLE_BODY} cpuUsage`;
  const SUBJ_NODES_LOADS = `${SUBJ_TABLE_BODY} loadAverage`;
  const SUBJ_NODES_MEMS = `${SUBJ_TABLE_BODY} jvmMemory`;
  const SUBJ_NODES_DISKS = `${SUBJ_TABLE_BODY} diskFreeSpace`;
  const SUBJ_NODES_SHARDS = `${SUBJ_TABLE_BODY} shards`;

  const SUBJ_NODE_LINK_PREFIX = `${SUBJ_TABLE_BODY} nodeLink-`;

  return new class ElasticsearchIndices {
    async isOnListing() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_LISTING_PAGE));
      return pageId !== null;
    }

    clickRowByResolver(nodeResolver) {
      return testSubjects.click(SUBJ_NODE_LINK_PREFIX + nodeResolver);
    }

    async clickNameCol() {
      const headerCell = await testSubjects.find(SUBJ_TABLE_SORT_NAME_COL);
      const button = await headerCell.findByTagName('button');
      return button.click();
    }

    async clickStatusCol() {
      const headerCell = await testSubjects.find(SUBJ_TABLE_SORT_STATUS_COL);
      const button = await headerCell.findByTagName('button');
      return button.click();
    }

    async clickCpuCol() {
      const headerCell = await testSubjects.find(SUBJ_TABLE_SORT_CPU_COL);
      const button = await headerCell.findByTagName('button');
      return button.click();
    }

    async clickLoadCol() {
      const headerCell = await testSubjects.find(SUBJ_TABLE_SORT_LOAD_COL);
      const button = await headerCell.findByTagName('button');
      return button.click();
    }

    async clickMemoryCol() {
      const headerCell = await testSubjects.find(SUBJ_TABLE_SORT_MEM_COL);
      const button = await headerCell.findByTagName('button');
      return button.click();
    }

    async clickDiskCol() {
      const headerCell = await testSubjects.find(SUBJ_TABLE_SORT_DISK_COL);
      const button = await headerCell.findByTagName('button');
      return button.click();
    }

    async clickShardsCol() {
      const headerCell = await testSubjects.find(SUBJ_TABLE_SORT_SHARDS_COL);
      const button = await headerCell.findByTagName('button');
      return button.click();
    }

    getRows() {
      return PageObjects.monitoring.tableGetRowsFromContainer(SUBJ_TABLE_BODY);
    }

    setFilter(text) {
      return PageObjects.monitoring.tableSetFilter(SUBJ_SEARCH_BAR, text);
    }

    clearFilter() {
      return PageObjects.monitoring.tableClearFilter(SUBJ_SEARCH_BAR);
    }

    assertNoData() {
      return PageObjects.monitoring.assertEuiTableNoData(SUBJ_TABLE_NO_DATA);
    }

    async getNodesAll() {
      const names = await testSubjects.getVisibleTextAll(SUBJ_NODES_NAMES);
      const statuses = await testSubjects.getPropertyAll(SUBJ_NODES_STATUSES, 'alt');
      const cpus = await testSubjects.getVisibleTextAll(SUBJ_NODES_CPUS);
      const loads = await testSubjects.getVisibleTextAll(SUBJ_NODES_LOADS);
      const memories = await testSubjects.getVisibleTextAll(SUBJ_NODES_MEMS);
      const disks = await testSubjects.getVisibleTextAll(SUBJ_NODES_DISKS);
      const shards = await testSubjects.getVisibleTextAll(SUBJ_NODES_SHARDS);

      // tuple-ize the icons and texts together into an array of objects
      const tableRows = await this.getRows();
      const iterator = range(tableRows.length);
      return iterator.reduce((all, current) => {
        return [
          ...all,
          {
            name: names[current],
            status: statuses[current],
            cpu: cpus[current],
            load: loads[current],
            memory: memories[current],
            disk: disks[current],
            shards: shards[current],
          }
        ];
      }, []);
    }

  };
}
