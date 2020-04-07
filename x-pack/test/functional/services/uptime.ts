/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function UptimeProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  const settings = {
    go: async () => {
      await testSubjects.click('settings-page-link', 5000);
    },
    changeHeartbeatIndicesInput: async (text: string) => {
      const input = await testSubjects.find('heartbeat-indices-input-loaded', 5000);
      await input.clearValueWithKeyboard();
      await input.type(text);
    },
    loadFields: async () => {
      const input = await testSubjects.find('heartbeat-indices-input-loaded', 5000);
      const heartbeatIndices = await input.getAttribute('value');

      return { heartbeatIndices };
    },
    applyButtonIsDisabled: async () => {
      return !!(await (await testSubjects.find('apply-settings-button')).getAttribute('disabled'));
    },
    apply: async () => {
      await (await testSubjects.find('apply-settings-button')).click();
      await retry.waitFor('submit to succeed', async () => {
        // When the form submit is complete the form will no longer be disabled
        const disabled = await (
          await testSubjects.find('heartbeat-indices-input-loaded', 5000)
        ).getAttribute('disabled');
        return disabled === null;
      });
    },
  };

  return {
    settings,
    alerts: {
      async openFlyout() {
        await testSubjects.click('xpack.uptime.alertsPopover.toggleButton', 5000);
        await testSubjects.click('xpack.uptime.toggleAlertFlyout', 5000);
      },
      async openMonitorStatusAlertType(alertType: string) {
        return testSubjects.click(`xpack.uptime.alerts.${alertType}-SelectOption`, 5000);
      },
      async setAlertTags(tags: string[]) {
        for (let i = 0; i < tags.length; i += 1) {
          await testSubjects.click('comboBoxSearchInput', 5000);
          await testSubjects.setValue('comboBoxInput', tags[i]);
          await browser.pressKeys(browser.keys.ENTER);
        }
      },
      async setAlertName(name: string) {
        return testSubjects.setValue('alertNameInput', name);
      },
      async setAlertInterval(value: string) {
        return testSubjects.setValue('intervalInput', value);
      },
      async setAlertThrottleInterval(value: string) {
        return testSubjects.setValue('throttleInput', value);
      },
      async setAlertExpressionValue(
        expressionAttribute: string,
        fieldAttribute: string,
        value: string
      ) {
        await testSubjects.click(expressionAttribute);
        await testSubjects.setValue(fieldAttribute, value);
        return browser.pressKeys(browser.keys.ESCAPE);
      },
      async setAlertStatusNumTimes(value: string) {
        return this.setAlertExpressionValue(
          'xpack.uptime.alerts.monitorStatus.numTimesExpression',
          'xpack.uptime.alerts.monitorStatus.numTimesField',
          value
        );
      },
      async setAlertTimerangeSelection(value: string) {
        return this.setAlertExpressionValue(
          'xpack.uptime.alerts.monitorStatus.timerangeValueExpression',
          'xpack.uptime.alerts.monitorStatus.timerangeValueField',
          value
        );
      },
      async setAlertExpressionSelectable(
        expressionAttribute: string,
        selectableAttribute: string,
        optionAttributes: string[]
      ) {
        await testSubjects.click(expressionAttribute, 5000);
        await testSubjects.click(selectableAttribute, 5000);
        for (let i = 0; i < optionAttributes.length; i += 1) {
          await testSubjects.click(optionAttributes[i], 5000);
        }
        return browser.pressKeys(browser.keys.ESCAPE);
      },
      async setMonitorStatusSelectableToHours() {
        return this.setAlertExpressionSelectable(
          'xpack.uptime.alerts.monitorStatus.timerangeUnitExpression',
          'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable',
          ['xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable.hoursOption']
        );
      },
      async setLocationsSelectable() {
        await testSubjects.click(
          'xpack.uptime.alerts.monitorStatus.locationsSelectionExpression',
          5000
        );
        await testSubjects.click(
          'xpack.uptime.alerts.monitorStatus.locationsSelectionSwitch',
          5000
        );
        await testSubjects.click(
          'xpack.uptime.alerts.monitorStatus.locationsSelectionSelectable',
          5000
        );
        return browser.pressKeys(browser.keys.ESCAPE);
      },
      async clickSaveAlertButtion() {
        return testSubjects.click('saveAlertButton');
      },
    },
    async assertExists(key: string) {
      if (!(await testSubjects.exists(key))) {
        throw new Error(`Couldn't find expected element with key "${key}".`);
      }
    },
    async monitorIdExists(key: string) {
      await retry.tryForTime(10000, async () => {
        await testSubjects.existOrFail(key);
      });
    },
    async monitorPageLinkExists(monitorId: string) {
      await testSubjects.existOrFail(`monitor-page-link-${monitorId}`);
    },
    async urlContains(expected: string) {
      const url = await browser.getCurrentUrl();
      return url.indexOf(expected) >= 0;
    },
    async navigateToMonitorWithId(monitorId: string) {
      await testSubjects.click(`monitor-page-link-${monitorId}`, 5000);
    },
    async getMonitorNameDisplayedOnPageTitle() {
      return await testSubjects.getVisibleText('monitor-page-title');
    },
    async pageHasDataMissing() {
      return await testSubjects.find('data-missing', 5000);
    },
    async setKueryBarText(attribute: string, value: string) {
      await testSubjects.click(attribute);
      await testSubjects.setValue(attribute, value);
      await browser.pressKeys(browser.keys.ENTER);
    },
    async setFilterText(filterQuery: string) {
      await this.setKueryBarText('xpack.uptime.filterBar', filterQuery);
    },
    async goToNextPage() {
      await testSubjects.click('xpack.uptime.monitorList.nextButton', 5000);
    },
    async goToPreviousPage() {
      await testSubjects.click('xpack.uptime.monitorList.prevButton', 5000);
    },
    async setStatusFilterUp() {
      await testSubjects.click('xpack.uptime.filterBar.filterStatusUp');
    },
    async setStatusFilterDown() {
      await testSubjects.click('xpack.uptime.filterBar.filterStatusDown');
    },
    async selectFilterItem(filterType: string, option: string) {
      const popoverId = `filter-popover_${filterType}`;
      const optionId = `filter-popover-item_${option}`;
      await testSubjects.existOrFail(popoverId);
      await testSubjects.click(popoverId);
      await testSubjects.existOrFail(optionId);
      await testSubjects.click(optionId);
      await testSubjects.click(popoverId);
    },
    async getSnapshotCount() {
      return {
        up: await testSubjects.getVisibleText('xpack.uptime.snapshot.donutChart.up'),
        down: await testSubjects.getVisibleText('xpack.uptime.snapshot.donutChart.down'),
      };
    },
    async locationMissingExists() {
      return await testSubjects.existOrFail('xpack.uptime.locationMap.locationMissing', {
        timeout: 3000,
      });
    },
    async openPageSizeSelectPopover(): Promise<void> {
      return testSubjects.click('xpack.uptime.monitorList.pageSizeSelect.popoverOpen', 5000);
    },
    async clickPageSizeSelectPopoverItem(size: number = 10): Promise<void> {
      return testSubjects.click(
        `xpack.uptime.monitorList.pageSizeSelect.sizeSelectItem${size.toString()}`,
        5000
      );
    },
  };
}
