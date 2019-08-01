/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';

export function InfraSourceConfigurationFlyoutProvider({
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    /**
     * Tab navigation
     */
    async switchToIndicesAndFieldsTab() {
      await (await find.descendantDisplayedByCssSelector(
        '#indicesAndFieldsTab',
        await this.getFlyout()
      )).click();
      await testSubjects.find('sourceConfigurationNameSectionTitle');
    },
    async switchToLogsTab() {
      await (await find.descendantDisplayedByCssSelector(
        '#logsTab',
        await this.getFlyout()
      )).click();
      await testSubjects.find('sourceConfigurationLogColumnsSectionTitle');
    },

    /**
     * Indices and fields
     */
    async getNameInput(): Promise<WebElementWrapper> {
      return await testSubjects.findDescendant('nameInput', await this.getFlyout());
    },
    async getLogIndicesInput(): Promise<WebElementWrapper> {
      return await testSubjects.findDescendant('logIndicesInput', await this.getFlyout());
    },
    async getMetricIndicesInput(): Promise<WebElementWrapper> {
      return await testSubjects.findDescendant('metricIndicesInput', await this.getFlyout());
    },

    /**
     * Logs
     */
    async getAddLogColumnButton(): Promise<WebElementWrapper> {
      return await testSubjects.findDescendant('addLogColumnButton', await this.getFlyout());
    },
    async getAddLogColumnPopover(): Promise<WebElementWrapper> {
      return await testSubjects.find('addLogColumnPopover');
    },
    async addTimestampLogColumn() {
      await (await this.getAddLogColumnButton()).click();
      await (await testSubjects.findDescendant(
        'addTimestampLogColumn',
        await this.getAddLogColumnPopover()
      )).click();
    },
    async addFieldLogColumn(fieldName: string) {
      await (await this.getAddLogColumnButton()).click();
      const popover = await this.getAddLogColumnPopover();
      await (await testSubjects.findDescendant('fieldSearchInput', popover)).type(fieldName);
      await (await testSubjects.findDescendant(`addFieldLogColumn:${fieldName}`, popover)).click();
    },
    async getLogColumnPanels(): Promise<WebElementWrapper[]> {
      return await testSubjects.findAllDescendant('logColumnPanel', await this.getFlyout());
    },
    async removeLogColumn(columnIndex: number) {
      const logColumnPanel = (await this.getLogColumnPanels())[columnIndex];
      await (await testSubjects.findDescendant('removeLogColumnButton', logColumnPanel)).click();
      await testSubjects.waitForDeleted(logColumnPanel);
    },
    async removeAllLogColumns() {
      for (const _ of await this.getLogColumnPanels()) {
        await this.removeLogColumn(0);
      }
    },
    async moveLogColumn(sourceIndex: number, destinationIndex: number) {
      const KEY_PRESS_DELAY_MS = 500; // This may need to be high for Jenkins; 100 works on desktop

      const logColumnPanel = (await this.getLogColumnPanels())[sourceIndex];
      const moveLogColumnHandle = await testSubjects.findDescendant(
        'moveLogColumnHandle',
        logColumnPanel
      );
      await moveLogColumnHandle.focus();
      const movementDifference = destinationIndex - sourceIndex;
      await moveLogColumnHandle.pressKeys(browser.keys.SPACE);
      for (let i = 0; i < Math.abs(movementDifference); i++) {
        await new Promise(res => setTimeout(res, KEY_PRESS_DELAY_MS));
        if (movementDifference > 0) {
          await moveLogColumnHandle.pressKeys(browser.keys.ARROW_DOWN);
        } else {
          await moveLogColumnHandle.pressKeys(browser.keys.ARROW_UP);
        }
      }
      await moveLogColumnHandle.pressKeys(browser.keys.SPACE);
      await new Promise(res => setTimeout(res, KEY_PRESS_DELAY_MS));
    },

    /**
     * Form and flyout
     */
    async getFlyout(): Promise<WebElementWrapper> {
      return await testSubjects.find('sourceConfigurationFlyout');
    },
    async saveConfiguration() {
      await (await testSubjects.findDescendant(
        'updateSourceConfigurationButton',
        await this.getFlyout()
      )).click();

      await retry.try(async () => {
        const element = await testSubjects.findDescendant(
          'updateSourceConfigurationButton',
          await this.getFlyout()
        );
        return !(await element.isEnabled());
      });
    },
    async closeFlyout() {
      const flyout = await this.getFlyout();
      await (await testSubjects.findDescendant('closeFlyoutButton', flyout)).click();
      await testSubjects.waitForDeleted(flyout);
    },
  };
}
