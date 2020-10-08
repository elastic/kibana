/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeAlertsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    async openFlyout(alertType: 'monitorStatus' | 'tls') {
      await testSubjects.click('xpack.uptime.alertsPopover.toggleButton', 5000);
      await testSubjects.click('xpack.uptime.openAlertContextPanel', 5000);
      if (alertType === 'monitorStatus') {
        await testSubjects.click('xpack.uptime.toggleAlertFlyout', 5000);
      } else if (alertType === 'tls') {
        await testSubjects.click('xpack.uptime.toggleTlsAlertFlyout');
      }
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
    async clickAddFilter() {
      await testSubjects.click('uptimeCreateAlertAddFilter');
    },
    async clickAddFilterLocation() {
      await this.clickAddFilter();
      await testSubjects.click('uptimeAlertAddFilter.observer.geo.name');
    },
    async clickAddFilterPort() {
      await this.clickAddFilter();
      await testSubjects.click('uptimeAlertAddFilter.url.port');
    },
    async clickAddFilterType() {
      await this.clickAddFilter();
      await testSubjects.click('uptimeAlertAddFilter.monitor.type');
    },
    async clickLocationExpression(filter: string) {
      await testSubjects.click('uptimeCreateStatusAlert.filter_location');
      await testSubjects.click(`filter-popover-item_${filter}`);
      return browser.pressKeys(browser.keys.ESCAPE);
    },
    async clickPortExpression(filter: string) {
      await testSubjects.click('uptimeCreateStatusAlert.filter_port');
      await testSubjects.click(`filter-popover-item_${filter}`);
      return browser.pressKeys(browser.keys.ESCAPE);
    },
    async clickTypeExpression(filter: string) {
      await testSubjects.click('uptimeCreateStatusAlert.filter_scheme');
      await testSubjects.click(`filter-popover-item_${filter}`);
      return browser.pressKeys(browser.keys.ESCAPE);
    },
    async clickSaveAlertButton() {
      return testSubjects.click('saveAlertButton');
    },
  };
}
