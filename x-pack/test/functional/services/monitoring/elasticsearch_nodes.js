/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';

function trimAll(data) {
  return data.map((item) => item.trim());
}

export function MonitoringElasticsearchNodesProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['monitoring']);
  const retry = getService('retry');
  const find = getService('find');

  const SUBJ_LISTING_PAGE = 'elasticsearchNodesListingPage';

  const SUBJ_TABLE_CONTAINER = 'elasticsearchNodesTableContainer';
  const SUBJ_TABLE_NO_DATA = `${SUBJ_TABLE_CONTAINER} > monitoringTableNoData`;
  const SUBJ_SEARCH_BAR = `${SUBJ_TABLE_CONTAINER} > monitoringTableToolBar`;

  const SUBJ_TABLE_SORT_NAME_COL = `tableHeaderCell_name_0`;
  const SUBJ_TABLE_SORT_STATUS_COL = `tableHeaderCell_isOnline_2`;
  const SUBJ_TABLE_SORT_SHARDS_COL = `tableHeaderCell_shardCount_3`;
  const SUBJ_TABLE_SORT_CPU_COL = `tableHeaderCell_node_cpu_utilization_4`;
  const SUBJ_TABLE_SORT_LOAD_COL = `tableHeaderCell_node_load_average_5`;
  const SUBJ_TABLE_SORT_MEM_COL = `tableHeaderCell_node_jvm_mem_percent_6`;
  const SUBJ_TABLE_SORT_DISK_COL = `tableHeaderCell_node_free_space_7`;

  const SUBJ_TABLE_BODY = 'elasticsearchNodesTableContainer';
  const SUBJ_NODES_NAMES = `${SUBJ_TABLE_BODY} > name`;
  const SUBJ_NODES_STATUSES = `${SUBJ_TABLE_BODY} > statusIcon`;
  const SUBJ_NODES_CPUS = `${SUBJ_TABLE_BODY} > cpuUsage`;
  const SUBJ_NODES_LOADS = `${SUBJ_TABLE_BODY} > loadAverage`;
  const SUBJ_NODES_MEMS = `${SUBJ_TABLE_BODY} > jvmMemory`;
  const SUBJ_NODES_DISKS = `${SUBJ_TABLE_BODY} > diskFreeSpace`;
  const SUBJ_NODES_SHARDS = `${SUBJ_TABLE_BODY} > shards`;

  const SUBJ_NODES_ICON_PREFIX = `monitoringCellIcon`;
  const SUBJ_NODES_POPOVER_PREFIX = `monitoringCellPopover`;

  const SUBJ_NODE_LINK_PREFIX = `${SUBJ_TABLE_BODY} > nodeLink-`;

  return new (class ElasticsearchIndices {
    async isOnListing() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_LISTING_PAGE));
      return pageId !== null;
    }

    async clickRowByResolver(nodeResolver) {
      await retry.waitForWithTimeout('redirection to node detail', 30000, async () => {
        await testSubjects.click(SUBJ_NODE_LINK_PREFIX + nodeResolver, 5000);
        return testSubjects.exists('elasticsearchNodeDetailStatus', { timeout: 5000 });
      });
    }

    async waitForTableToFinishLoading() {
      // wait up to 1 second for loading to actually start
      await find.existsByDisplayedByCssSelector('.euiBasicTable-loading', 1000);
      await retry.try(async () => {
        await find.waitForDeletedByCssSelector('.euiBasicTable-loading', 5000);
      });
    }

    async clickNameCol() {
      await find.clickByCssSelector(`[data-test-subj="${SUBJ_TABLE_SORT_NAME_COL}"] > button`);
      await this.waitForTableToFinishLoading();
    }

    async clickStatusCol() {
      await find.clickByCssSelector(`[data-test-subj="${SUBJ_TABLE_SORT_STATUS_COL}"] > button`);
      await this.waitForTableToFinishLoading();
    }

    async clickCpuCol() {
      await find.clickByCssSelector(`[data-test-subj="${SUBJ_TABLE_SORT_CPU_COL}"] > button`);
      await this.waitForTableToFinishLoading();
    }

    async clickLoadCol() {
      await find.clickByCssSelector(`[data-test-subj="${SUBJ_TABLE_SORT_LOAD_COL}"] > button`);
      await this.waitForTableToFinishLoading();
    }

    async clickMemoryCol() {
      await find.clickByCssSelector(`[data-test-subj="${SUBJ_TABLE_SORT_MEM_COL}"] > button`);
      await this.waitForTableToFinishLoading();
    }
    async clickDiskCol() {
      await find.clickByCssSelector(`[data-test-subj="${SUBJ_TABLE_SORT_DISK_COL}"] > button`);
      await this.waitForTableToFinishLoading();
    }

    async clickShardsCol() {
      await find.clickByCssSelector(`[data-test-subj="${SUBJ_TABLE_SORT_SHARDS_COL}"] > button`);
      await this.waitForTableToFinishLoading();
    }

    getRows() {
      return PageObjects.monitoring.tableGetRowsFromContainer(SUBJ_TABLE_BODY);
    }

    async setFilter(text) {
      await PageObjects.monitoring.tableSetFilter(SUBJ_SEARCH_BAR, text);
      await this.waitForTableToFinishLoading();
    }

    async clearFilter() {
      await PageObjects.monitoring.tableClearFilter(SUBJ_SEARCH_BAR);
      await this.waitForTableToFinishLoading();
    }

    assertNoData() {
      return PageObjects.monitoring.assertTableNoData(SUBJ_TABLE_NO_DATA);
    }

    async getNodeNames() {
      return await testSubjects.getVisibleTextAll(SUBJ_NODES_NAMES);
    }

    async getNodeStatuses() {
      return await testSubjects.getAttributeAll(SUBJ_NODES_STATUSES, 'alt');
    }

    async getNodeCpus() {
      return trimAll(await testSubjects.getVisibleTextAll(SUBJ_NODES_CPUS));
    }

    async getNodesAll() {
      const names = await this.getNodeNames();
      const statuses = await this.getNodeStatuses();
      const cpus = await this.getNodeCpus();
      const loads = trimAll(await testSubjects.getVisibleTextAll(SUBJ_NODES_LOADS));
      const memories = trimAll(await testSubjects.getVisibleTextAll(SUBJ_NODES_MEMS));
      const disks = trimAll(await testSubjects.getVisibleTextAll(SUBJ_NODES_DISKS));
      const shards = await testSubjects.getVisibleTextAll(SUBJ_NODES_SHARDS);

      const areasWithText = {
        cpuUsage: [],
        loadAverage: [],
        jvmMemory: [],
        diskFreeSpace: [],
      };

      const table = await testSubjects.find(SUBJ_TABLE_BODY);
      for (const key of Object.keys(areasWithText)) {
        const text = areasWithText[key];
        const icons = await testSubjects.findAllDescendant(
          `${SUBJ_NODES_ICON_PREFIX}-${key}`,
          table
        );
        for (const icon of icons) {
          await icon.moveMouseTo();
          await icon.click();
          const _text = await testSubjects.getVisibleTextAll(`${SUBJ_NODES_POPOVER_PREFIX}-${key}`);
          text.push(_text[0]);
          await icon.click();
        }
      }

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
            cpuText: areasWithText.cpuUsage[current],
            load: loads[current],
            loadText: areasWithText.loadAverage[current],
            memory: memories[current],
            memoryText: areasWithText.jvmMemory[current],
            disk: disks[current],
            diskText: areasWithText.diskFreeSpace[current],
            shards: shards[current],
          },
        ];
      }, []);
    }
  })();
}
