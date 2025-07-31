/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraSourceConfigurationFormProvider({
  getService,
  getPageObject,
}: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    /**
     * Indices and fields
     */
    async getNameInput(): Promise<WebElementWrapper> {
      return await testSubjects.findDescendant('~nameInput', await this.getForm());
    },
    async getMetricIndicesInput(): Promise<WebElementWrapper> {
      return await testSubjects.findDescendant('~metricIndicesInput', await this.getForm());
    },
    async selectIndicesPanel(): Promise<void> {
      return await testSubjects.click('logIndicesCheckableCard');
    },

    /**
     * Infra Metrics bottom actions bar
     */
    async getSaveButton(): Promise<WebElementWrapper> {
      return await testSubjects.find('infraBottomBarActionsButton');
    },

    async saveInfraSettings() {
      await (await this.getSaveButton()).click();

      await retry.try(async () => {
        const element = await this.getSaveButton();
        return !(await element.isDisplayed());
      });
    },

    async discardInfraSettingsChanges() {
      await (await testSubjects.find('infraBottomBarActionsDiscardChangesButton')).click();
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
