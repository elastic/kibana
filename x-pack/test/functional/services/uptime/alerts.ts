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
      await testSubjects.click('xpack.uptime.alerts.monitorStatus.locationsSelectionSwitch', 5000);
      await testSubjects.click(
        'xpack.uptime.alerts.monitorStatus.locationsSelectionSelectable',
        5000
      );
      return browser.pressKeys(browser.keys.ESCAPE);
    },
    async clickSaveAlertButtion() {
      return testSubjects.click('saveAlertButton');
    },
  };
}
