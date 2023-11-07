/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { subj as testSubjSelector } from '@kbn/test-subj-selector';

import { FtrProviderContext } from '../ftr_provider_context';

export function InfraHomePageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');
  const pageObjects = getPageObjects(['common']);
  const comboBox = getService('comboBox');

  return {
    async goToTime(time: string) {
      const datePickerInput = await find.byCssSelector(
        `${testSubjSelector('waffleDatePicker')} .euiDatePicker.euiFieldText`
      );

      // explicitly focus to trigger tooltip
      await datePickerInput.focus();

      await datePickerInput.clearValueWithKeyboard();
      await datePickerInput.type(time);

      // dismiss the tooltip, which won't be hidden because blur doesn't happen reliably
      await testSubjects.click('waffleDatePickerIntervalTooltip');

      await this.waitForLoading();
    },

    async getWaffleMap() {
      await retry.try(async () => {
        const element = await testSubjects.find('waffleMap');
        if (!element) {
          throw new Error();
        }
      });
      return testSubjects.find('waffleMap');
    },

    async getWaffleMapTooltips() {
      const node = await testSubjects.findAll('nodeContainer');
      await node[0].moveMouseTo();
      const tooltip = await testSubjects.find('conditionalTooltipContent-demo-stack-redis-01');
      const metrics = await tooltip.findAllByTestSubject('conditionalTooltipContent-metric');
      const values = await tooltip.findAllByTestSubject('conditionalTooltipContent-value');
      expect(await metrics[0].getVisibleText()).to.be('CPU usage');
      expect(await values[0].getVisibleText()).to.be('1%');
      expect(await metrics[1].getVisibleText()).to.be('Memory usage');
      expect(await values[1].getVisibleText()).to.be('15.9%');
      expect(await metrics[2].getVisibleText()).to.be('Outbound traffic');
      expect(await values[2].getVisibleText()).to.be('71.9kbit/s');
      expect(await metrics[3].getVisibleText()).to.be('Inbound traffic');
      expect(await values[3].getVisibleText()).to.be('25.6kbit/s');
      await node[1].moveMouseTo();
      const tooltip2 = await testSubjects.find('conditionalTooltipContent-demo-stack-nginx-01');
      const metrics2 = await tooltip2.findAllByTestSubject('conditionalTooltipContent-metric');
      const values2 = await tooltip2.findAllByTestSubject('conditionalTooltipContent-value');
      expect(await metrics2[0].getVisibleText()).to.be('CPU usage');
      expect(await values2[0].getVisibleText()).to.be('1.1%');
      expect(await metrics2[1].getVisibleText()).to.be('Memory usage');
      expect(await values2[1].getVisibleText()).to.be('18%');
      expect(await metrics2[2].getVisibleText()).to.be('Outbound traffic');
      expect(await values2[2].getVisibleText()).to.be('256.3kbit/s');
      expect(await metrics2[3].getVisibleText()).to.be('Inbound traffic');
      expect(await values2[3].getVisibleText()).to.be('255.1kbit/s');
    },

    async getNodesWithValues() {
      const nodes = await testSubjects.findAll('nodeContainer');
      const promises = nodes.map(async (node) => {
        const nodeName = await node.findByTestSubject('nodeName');
        const name = await nodeName.getVisibleText();
        const nodeValue = await node.findByTestSubject('nodeValue');
        const value = await nodeValue.getVisibleText();
        const color = await nodeValue.getAttribute('color');
        return { name, value: parseFloat(value), color };
      });
      return Promise.all(promises);
    },

    async getFirstNode() {
      const nodes = await testSubjects.findAll('nodeContainer');
      return nodes[0];
    },

    async clickOnFirstNode() {
      const firstNode = await this.getFirstNode();
      firstNode.click();
    },

    async clickOnGoToNodeDetails() {
      await retry.try(async () => {
        await testSubjects.click('viewAssetDetailsContextMenuItem');
      });
    },

    async clickOnNodeDetailsFlyoutOpenAsPage() {
      await retry.try(async () => {
        await testSubjects.click('infraAssetDetailsOpenAsPageButton');
      });
    },

    async sortNodesBy(sort: string) {
      await testSubjects.click('waffleSortByDropdown');
      if (sort === 'value') {
        await testSubjects.find('waffleSortByValue');
        await testSubjects.click('waffleSortByValue');
      } else {
        await testSubjects.find('waffleSortByName');
        await testSubjects.click('waffleSortByName');
      }
    },

    async groupByCustomField(field: string) {
      await testSubjects.click('waffleGroupByDropdown');
      const contextMenu = await testSubjects.find('groupByContextMenu');
      const menuItems = await contextMenu.findAllByCssSelector('button.euiContextMenuItem');
      await menuItems[0].click();
      const groupByCustomField = await testSubjects.find('groupByCustomField');
      await comboBox.setElement(groupByCustomField, field);
      await testSubjects.click('groupByCustomFieldAddButton');
      await this.waitForLoading();
      const groupNameLinks = await testSubjects.findAll('groupNameLink');
      return Promise.all(groupNameLinks.map(async (link) => link.getVisibleText()));
    },

    async enterSearchTerm(query: string) {
      const input = await this.clearSearchTerm();
      await input.type(query);

      // wait for input value to echo the input before submitting
      // this ensures the React state has caught up with the events
      await retry.try(async () => {
        const value = await input.getAttribute('value');
        expect(value).to.eql(query);
      });

      await input.type(browser.keys.RETURN);
      await this.waitForLoading();
    },

    async clearSearchTerm() {
      const input = await testSubjects.find('infraSearchField');
      await input.clearValueWithKeyboard();
      return input;
    },

    async openLegendControls() {
      await testSubjects.click('openLegendControlsButton');
      await testSubjects.find('legendControls');
    },

    async changePalette(paletteId: string) {
      const paletteSelector = await testSubjects.find('legendControlsPalette');
      await paletteSelector.click();
      const paletteSelectorEntry = await paletteSelector.findByCssSelector(
        `option[value=${paletteId}]`
      );
      await paletteSelectorEntry.click();
    },

    async applyLegendControls() {
      await testSubjects.click('applyLegendControlsButton');
    },

    async toggleReverseSort() {
      await testSubjects.click('waffleSortByDropdown');
      await testSubjects.find('waffleSortByDirection');
      await testSubjects.click('waffleSortByDirection');
    },

    async openTimeline() {
      await testSubjects.click('toggleTimelineButton');
      await testSubjects.existOrFail('timelineContainerOpen');
    },

    async closeTimeline() {
      await testSubjects.click('toggleTimelineButton');
      const timelineSelectorsVisible = await Promise.all([
        testSubjects.exists('timelineContainerClosed'),
        testSubjects.exists('timelineContainerOpen'),
      ]);

      return timelineSelectorsVisible.every((visible) => !visible);
    },

    async toggleInventorySwitcher() {
      await testSubjects.click('openInventorySwitcher');
      await testSubjects.find('goToHost');
      await testSubjects.click('openInventorySwitcher');
      await testSubjects.missingOrFail('goToHost', { timeout: 10 * 1000 });
    },

    async goToHost() {
      await testSubjects.click('openInventorySwitcher');
      await testSubjects.find('goToHost');
      return testSubjects.click('goToHost');
    },

    async goToPods() {
      await testSubjects.click('openInventorySwitcher');
      await testSubjects.find('goToHost');
      return testSubjects.click('goToPods');
    },

    async goToDocker() {
      await testSubjects.click('openInventorySwitcher');
      await testSubjects.find('goToHost');
      return testSubjects.click('goToDocker');
    },

    async goToSettings() {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'infraOps',
        `/settings`,
        undefined,
        { ensureCurrentUrl: false } // Test runner struggles with `rison-node` escaped values
      );
    },

    async goToInventory() {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'infraOps',
        `/inventory`,
        undefined,
        { ensureCurrentUrl: false } // Test runner struggles with `rison-node` escaped values
      );
    },

    async goToMetricExplorer() {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'infraOps',
        `/explorer`,
        undefined,
        { ensureCurrentUrl: false } // Test runner struggles with `rison-node` escaped values
      );
    },

    async goToHostsView() {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'infraOps',
        `/hosts`,
        undefined,
        { ensureCurrentUrl: false } // Test runner struggles with `rison-node` escaped values
      );
    },

    async getSaveViewButton() {
      return testSubjects.find('openSaveViewModal');
    },

    async getLoadViewsButton() {
      return testSubjects.find('loadViews');
    },

    async openSaveViewsFlyout() {
      return testSubjects.click('loadViews');
    },

    async closeSavedViewFlyout() {
      return testSubjects.click('cancelSavedViewModal');
    },

    async openCreateSaveViewModal() {
      return testSubjects.click('openSaveViewModal');
    },

    async openEnterViewNameAndSave() {
      await testSubjects.setValue('savedViewName', 'View1');
      await testSubjects.click('createSavedViewButton');
    },

    async getNoMetricsIndicesPrompt() {
      return testSubjects.find('noDataPage');
    },

    async getNoMetricsDataPrompt() {
      return testSubjects.find('noMetricsDataPrompt');
    },

    async getNoRemoteClusterPrompt() {
      return testSubjects.find('infraHostsNoRemoteCluster');
    },

    async getInfraMissingMetricsIndicesCallout() {
      return testSubjects.find('infraIndicesPanelSettingsWarningCallout');
    },

    async getInfraMissingRemoteClusterIndicesCallout() {
      return testSubjects.find('infraIndicesPanelSettingsDangerCallout');
    },

    async openSourceConfigurationFlyout() {
      await testSubjects.click('configureSourceButton');
      await testSubjects.exists('sourceConfigurationFlyout');
    },

    async waitForLoading() {
      await testSubjects.missingOrFail('loadingMessage', { timeout: 20000 });
    },

    async openAnomalyFlyout() {
      await testSubjects.click('openAnomalyFlyoutButton');
      await testSubjects.exists('loadMLFlyout');
    },
    async closeFlyout() {
      await testSubjects.click('euiFlyoutCloseButton');
    },
    async goToAnomaliesTab() {
      await testSubjects.click('anomalyFlyoutAnomaliesTab');
    },
    async getNoAnomaliesMsg() {
      await testSubjects.find('noAnomaliesFoundMsg');
    },
    async clickHostsAnomaliesDropdown() {
      await testSubjects.click('anomaliesComboBoxType');
      await testSubjects.click('anomaliesHostComboBoxItem');
    },
    async clickK8sAnomaliesDropdown() {
      await testSubjects.click('anomaliesComboBoxType');
      await testSubjects.click('anomaliesK8sComboBoxItem');
    },
    async findAnomalies() {
      return testSubjects.findAll('anomalyRow');
    },
    async setAnomaliesDate(date: string) {
      await testSubjects.click('superDatePickerShowDatesButton');
      await testSubjects.click('superDatePickerAbsoluteTab');
      const datePickerInput = await testSubjects.find('superDatePickerAbsoluteDateInput');
      await datePickerInput.clearValueWithKeyboard();
      await datePickerInput.type([date]);
    },
    async setAnomaliesThreshold(threshold: string) {
      const thresholdInput = await find.byCssSelector(
        `.euiFieldNumber.euiRangeInput.euiRangeInput--max`
      );
      await thresholdInput.clearValueWithKeyboard({ charByChar: true });
      await thresholdInput.type([threshold]);
    },

    async ensureAlertsAndRulesDropdownIsMissing() {
      await testSubjects.missingOrFail('infrastructure-alerts-and-rules');
    },

    async clickAlertsAndRules() {
      await testSubjects.click('infrastructure-alerts-and-rules');
    },

    async ensurePopoverOpened() {
      await testSubjects.existOrFail('metrics-alert-menu');
    },

    async ensurePopoverClosed() {
      await testSubjects.missingOrFail('metrics-alert-menu');
    },

    async ensureCustomThresholdAlertMenuItemIsVisible() {
      await testSubjects.existOrFail('custom-threshold-alerts-menu-option');
    },

    async ensureCustomThresholdAlertMenuItemIsMissing() {
      await testSubjects.missingOrFail('custom-threshold-alerts-menu-option');
    },

    async dismissDatePickerTooltip() {
      const isTooltipOpen = await testSubjects.exists(`waffleDatePickerIntervalTooltip`, {
        timeout: 1000,
      });

      if (isTooltipOpen) {
        await testSubjects.click(`waffleDatePickerIntervalTooltip`);
      }
    },

    async openInventoryAlertFlyout() {
      await this.dismissDatePickerTooltip();
      await testSubjects.click('infrastructure-alerts-and-rules');
      await testSubjects.click('inventory-alerts-menu-option');

      // forces date picker tooltip to close in case it pops up after Alerts and rules opens
      await testSubjects.moveMouseTo('contextMenuPanelTitleButton');

      await retry.tryForTime(1000, () => testSubjects.click('inventory-alerts-create-rule'));
      await testSubjects.missingOrFail('inventory-alerts-create-rule', { timeout: 30000 });
    },

    async openMetricsThresholdAlertFlyout() {
      await this.dismissDatePickerTooltip();
      await testSubjects.click('infrastructure-alerts-and-rules');
      await testSubjects.click('metrics-threshold-alerts-menu-option');

      // forces date picker tooltip to close in case it pops up after Alerts and rules opens
      await testSubjects.moveMouseTo('contextMenuPanelTitleButton');

      await retry.tryForTime(1000, () =>
        testSubjects.click('metrics-threshold-alerts-create-rule')
      );
      await testSubjects.missingOrFail('metrics-threshold-alerts-create-rule', { timeout: 30000 });
    },

    async closeAlertFlyout() {
      await testSubjects.click('euiFlyoutCloseButton');
    },

    async waitForTourStep(tourStep: string) {
      await retry.waitForWithTimeout(`tour step ${tourStep}`, 10000, () =>
        testSubjects.exists(tourStep)
      );
    },

    async ensureTourStepIsClosed(tourStep: string) {
      await testSubjects.missingOrFail(tourStep);
    },

    async clickTourNextButton() {
      await testSubjects.click('onboarding--observTourNextStepButton');
    },

    async clickTourEndButton() {
      await testSubjects.click('onboarding--observTourEndButton');
    },

    async clickTourSkipButton() {
      await testSubjects.click('onboarding--observTourSkipButton');
    },

    async clickGuidedSetupButton() {
      await testSubjects.click('guidedSetupButton');
    },

    async clickQueryBar() {
      await testSubjects.click('infraSearchField');
    },

    async inputQueryData() {
      const queryBar = await testSubjects.find('infraSearchField');
      await queryBar.type('h');
    },

    async inputAddHostNameFilter(hostName: string) {
      await this.enterSearchTerm(`host.name:"${hostName}"`);
    },

    async clickOnNode() {
      return testSubjects.click('nodeContainer');
    },

    async ensureSuggestionsPanelVisible() {
      await testSubjects.find('infraSuggestionsPanel');
    },

    async ensureInventoryFeedbackLinkIsVisible() {
      await testSubjects.existOrFail('infraInventoryFeedbackLink');
    },

    async ensureKubernetesTourIsVisible() {
      const container = await testSubjects.find('infra-kubernetesTour-text');
      const containerText = await container.getVisibleText();
      return containerText;
    },

    async ensureKubernetesTourIsClosed() {
      await testSubjects.missingOrFail('infra-kubernetesTour-text');
    },

    async clickDismissKubernetesTourButton() {
      return testSubjects.click('infra-kubernetesTour-dismiss');
    },
  };
}
