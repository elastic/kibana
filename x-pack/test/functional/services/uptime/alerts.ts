/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeAlertsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  return {
    async openFlyout(alertType: 'monitorStatus' | 'tls') {
      await testSubjects.click('xpack.uptime.alertsPopover.toggleButton');
      await testSubjects.click('xpack.uptime.openAlertContextPanel');
      if (alertType === 'monitorStatus') {
        await testSubjects.click('xpack.uptime.toggleAlertFlyout');
      } else if (alertType === 'tls') {
        await testSubjects.click('xpack.uptime.toggleTlsAlertFlyout');
      }
    },
    async openMonitorStatusAlertType(alertType: string) {
      await testSubjects.click(`xpack.uptime.alerts.${alertType}-SelectOption`);
    },
    async setAlertTags(tags: string[]) {
      for (let i = 0; i < tags.length; i += 1) {
        await testSubjects.click('comboBoxSearchInput');
        await testSubjects.setValue('comboBoxInput', tags[i]);
        await browser.pressKeys(browser.keys.ENTER);
      }
    },
    async setAlertName(name: string) {
      await testSubjects.exists('alertNameInput');
      await testSubjects.setValue('alertNameInput', name);
    },
    async setAlertInterval(value: string) {
      await testSubjects.setValue('intervalInput', value);
    },
    async setAlertThrottleInterval(value: string) {
      await testSubjects.click('notifyWhenSelect');
      await testSubjects.click('onThrottleInterval');
      await testSubjects.setValue('throttleInput', value);
    },
    async setAlertExpressionValue(
      expressionAttribute: string,
      fieldAttribute: string,
      value: string
    ) {
      await testSubjects.click(expressionAttribute);
      await testSubjects.setValue(fieldAttribute, value);
      await testSubjects.click(expressionAttribute);
    },
    async setAlertStatusNumTimes(value: string) {
      await this.setAlertExpressionValue(
        'xpack.uptime.alerts.monitorStatus.numTimesExpression',
        'xpack.uptime.alerts.monitorStatus.numTimesField',
        value
      );
    },
    async setAlertTimerangeSelection(value: string) {
      await this.setAlertExpressionValue(
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
      await testSubjects.click(expressionAttribute);
      await testSubjects.click(selectableAttribute);
      for (let i = 0; i < optionAttributes.length; i += 1) {
        await testSubjects.click(optionAttributes[i]);
      }
      await testSubjects.click(expressionAttribute);
    },
    async setMonitorStatusSelectableToHours() {
      await this.setAlertExpressionSelectable(
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
      return find.clickByCssSelector('body');
    },
    async clickPortExpression(filter: string) {
      await testSubjects.click('uptimeCreateStatusAlert.filter_port');
      await testSubjects.click(`filter-popover-item_${filter}`);
      await find.clickByCssSelector('body');
    },
    async clickTypeExpression(filter: string) {
      await testSubjects.click('uptimeCreateStatusAlert.filter_scheme');
      await testSubjects.click(`filter-popover-item_${filter}`);
      await find.clickByCssSelector('body');
    },
    async clickSaveAlertButton() {
      await testSubjects.click('saveAlertButton');
    },
    async clickSaveAlertsConfirmButton() {
      await testSubjects.click('confirmAlertSaveModal > confirmModalConfirmButton', 20000);
    },
  };
}
