/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';

export function InfraSourceConfigurationFormProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    /**
     * Indices and fields
     */
    async getNameInput(): Promise<WebElementWrapper> {
      return await testSubjects.findDescendant('~nameInput', await this.getForm());
    },
    async getLogIndicesInput(): Promise<WebElementWrapper> {
      return await testSubjects.findDescendant('~logIndicesInput', await this.getForm());
    },
    async getMetricIndicesInput(): Promise<WebElementWrapper> {
      return await testSubjects.findDescendant('~metricIndicesInput', await this.getForm());
    },

    /**
     * Logs
     */
    async getAddLogColumnButton(): Promise<WebElementWrapper> {
      return await testSubjects.findDescendant('~addLogColumnButton', await this.getForm());
    },
    async getAddLogColumnPopover(): Promise<WebElementWrapper> {
      return await testSubjects.find('~addLogColumnPopover');
    },
    async addTimestampLogColumn() {
      // try to open the popover
      const popover = await retry.try(async () => {
        await (await this.getAddLogColumnButton()).click();
        return this.getAddLogColumnPopover();
      });

      // try to select the timestamp field
      await retry.try(async () => {
        await (await testSubjects.findDescendant('~addTimestampLogColumn', popover)).click();
      });

      // wait for timestamp panel to show up
      await testSubjects.findDescendant('~systemLogColumnPanel:Timestamp', await this.getForm());
    },
    async addFieldLogColumn(fieldName: string) {
      // try to open the popover
      const popover = await retry.try(async () => {
        await (await this.getAddLogColumnButton()).click();
        return this.getAddLogColumnPopover();
      });

      // try to select the given field
      await retry.try(async () => {
        await (await testSubjects.findDescendant('~fieldSearchInput', popover)).type(fieldName);
        await (
          await testSubjects.findDescendant(`~addFieldLogColumn:${fieldName}`, popover)
        ).click();
      });

      // wait for field panel to show up
      await testSubjects.findDescendant(`~fieldLogColumnPanel:${fieldName}`, await this.getForm());
    },
    async getLogColumnPanels(): Promise<WebElementWrapper[]> {
      return await testSubjects.findAllDescendant('~logColumnPanel', await this.getForm());
    },
    async removeLogColumn(columnIndex: number) {
      const logColumnPanel = (await this.getLogColumnPanels())[columnIndex];
      await (await testSubjects.findDescendant('~removeLogColumnButton', logColumnPanel)).click();
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
        '~moveLogColumnHandle',
        logColumnPanel
      );
      await moveLogColumnHandle.focus();
      const movementDifference = destinationIndex - sourceIndex;
      await moveLogColumnHandle.pressKeys(browser.keys.SPACE);
      for (let i = 0; i < Math.abs(movementDifference); i++) {
        await new Promise((res) => setTimeout(res, KEY_PRESS_DELAY_MS));
        if (movementDifference > 0) {
          await moveLogColumnHandle.pressKeys(browser.keys.ARROW_DOWN);
        } else {
          await moveLogColumnHandle.pressKeys(browser.keys.ARROW_UP);
        }
      }
      await moveLogColumnHandle.pressKeys(browser.keys.SPACE);
      await new Promise((res) => setTimeout(res, KEY_PRESS_DELAY_MS));
    },

    /**
     * Form
     */
    async getForm(): Promise<WebElementWrapper> {
      return await testSubjects.find('~sourceConfigurationContent');
    },
    async saveConfiguration() {
      await (
        await testSubjects.findDescendant('~applySettingsButton', await this.getForm())
      ).click();

      await retry.try(async () => {
        const element = await testSubjects.findDescendant(
          '~applySettingsButton',
          await this.getForm()
        );
        return !(await element.isEnabled());
      });
    },
  };
}
