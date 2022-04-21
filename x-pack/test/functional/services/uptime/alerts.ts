/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeAlertsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
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
      // ensure the flyout has opened
      await testSubjects.exists('ruleNameInput');
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
      await testSubjects.setValue('ruleNameInput', name);
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
      await testSubjects.click('uptimeCreateStatusAlert.filter_location');
    },
    async clickAddFilterPort() {
      await this.clickAddFilter();
      await testSubjects.click('uptimeAlertAddFilter.url.port');
      await testSubjects.click('uptimeCreateStatusAlert.filter_port');
    },
    async clickAddFilterType() {
      await this.clickAddFilter();
      await testSubjects.click('uptimeAlertAddFilter.monitor.type');
      await testSubjects.click('uptimeCreateStatusAlert.filter_scheme');
    },
    async clickSaveRuleButton() {
      await testSubjects.click('saveRuleButton');
    },
    async clickSaveAlertsConfirmButton() {
      await testSubjects.click('confirmRuleSaveModal > confirmModalConfirmButton', 20000);
    },
  };
}
