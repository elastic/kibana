/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import { AutoSuggestInteraction } from '../services/uptime/types';

const MONITOR_STATUS_ALERT_KUERY_BAR_ATTR = 'xpack.uptime.alerts.monitorStatus.filterBar';

export function UptimePageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'timePicker']);
  const { common: commonService, monitor, navigation } = getService('uptime');
  const retry = getService('retry');

  return new (class UptimePage {
    public async goToRoot(refresh?: boolean) {
      await navigation.goToUptime();
      if (refresh) {
        await navigation.refreshApp();
      }
    }

    public async setDateRange(start: string, end: string) {
      const { start: prevStart, end: prevEnd } = await pageObjects.timePicker.getTimeConfig();
      if (start !== prevStart || prevEnd !== end) {
        await pageObjects.timePicker.setAbsoluteRange(start, end);
      } else {
        await navigation.refreshApp();
      }
    }

    public async goToUptimeOverviewAndLoadData(
      dateStart: string,
      dateEnd: string,
      monitorIdToCheck?: string
    ) {
      await navigation.goToUptime();
      await this.setDateRange(dateStart, dateEnd);
      if (monitorIdToCheck) {
        await commonService.monitorIdExists(monitorIdToCheck);
      }
    }

    public async loadDataAndGoToMonitorPage(dateStart: string, dateEnd: string, monitorId: string) {
      await this.setDateRange(dateStart, dateEnd);
      await navigation.goToMonitor(monitorId);
    }

    public async inputFilterQuery(filterQuery: string) {
      await commonService.setFilterText(filterQuery);
    }

    public async pageHasDataMissing() {
      return await commonService.pageHasDataMissing();
    }

    public async pageHasExpectedIds(monitorIdsToCheck: string[]): Promise<void> {
      return retry.tryForTime(15000, async () => {
        await Promise.all(monitorIdsToCheck.map((id) => commonService.monitorPageLinkExists(id)));
      });
    }

    public async pageUrlContains(value: string, expected: boolean = true): Promise<void> {
      return retry.tryForTime(12000, async () => {
        expect(await commonService.urlContains(value)).to.eql(expected);
      });
    }

    public async changePage(direction: 'next' | 'prev') {
      if (direction === 'next') {
        await commonService.goToNextPage();
      } else if (direction === 'prev') {
        await commonService.goToPreviousPage();
      }
    }

    public async setStatusFilter(value: 'up' | 'down') {
      if (value === 'up') {
        await commonService.setStatusFilterUp();
      } else if (value === 'down') {
        await commonService.setStatusFilterDown();
      }
    }

    public async selectFilterItems(filters: Record<string, string[]>) {
      for (const key in filters) {
        if (filters.hasOwnProperty(key)) {
          const values = filters[key];
          for (let i = 0; i < values.length; i++) {
            await commonService.selectFilterItem(key, values[i]);
          }
        }
      }
    }

    public async getSnapshotCount() {
      return await commonService.getSnapshotCount();
    }

    /**
     * Simulate keyboard interaction with a kuery bar and suggestive type.
     *
     * @param kueryBar KueryBar components require a name, this param maps the
     * kuery bar instance you're testing to the attribute it will render.
     * @param interactions Series of keyboard commands for navigating autocomplete/suggest values.
     *
     */
    public async useKueryBarAutocomplete(
      kueryBar: 'overviewPage' | 'monitorStatusAlertFlyout',
      interactions: AutoSuggestInteraction[]
    ) {
      let kueryBarAttribute: string;
      if (kueryBar === 'overviewPage') {
        kueryBarAttribute = 'xpack.uptime.filterBar';
      } else if (kueryBar === 'monitorStatusAlertFlyout') {
        kueryBarAttribute = MONITOR_STATUS_ALERT_KUERY_BAR_ATTR;
      } else {
        throw new Error(`invalid kuery bar attribute value: ${kueryBar}`);
      }

      const { setKueryBarText } = commonService;

      for (const interaction of interactions) {
        if (interaction.autocompleteText) {
          await setKueryBarText(kueryBarAttribute, interaction.autocompleteText, false, false);
        }
        await commonService.executeKeyboardPresses(interaction);
      }
    }

    public async setAlertKueryBarText(filters: string) {
      const { setKueryBarText } = commonService;
      await setKueryBarText(MONITOR_STATUS_ALERT_KUERY_BAR_ATTR, filters);
    }

    public async setMonitorListPageSize(size: number): Promise<void> {
      await commonService.openPageSizeSelectPopover();
      return commonService.clickPageSizeSelectPopoverItem(size);
    }

    public async checkPingListInteractions(
      timestamps: string[],
      location?: string,
      status?: string
    ): Promise<void> {
      if (location) {
        await monitor.setPingListLocation(location);
      }
      if (status) {
        await monitor.setPingListStatus(status);
      }
      return monitor.checkForPingListTimestamps(timestamps);
    }

    public async resetFilters() {
      await this.inputFilterQuery('');
      await commonService.resetStatusFilter();
    }
  })();
}
