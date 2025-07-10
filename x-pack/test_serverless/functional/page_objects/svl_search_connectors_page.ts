/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';
export function SvlSearchConnectorsPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');
  const es = getService('es');
  const comboBox = getService('comboBox');
  return {
    helpers: {
      async deleteAllConnectors() {
        const connectors = await es.connector.list();
        for (const connector of connectors.results) {
          await es.connector.delete({
            connector_id: connector.id!,
          });
        }
      },
    },
    connectorConfigurationPage: {
      async createConnector() {
        await testSubjects.click('serverlessSearchEmptyConnectorsPromptCreateConnectorButton');
        await testSubjects.existOrFail('serverlessSearchEditConnectorButton');
        await testSubjects.exists('serverlessSearchConnectorLinkElasticsearchRunWithDockerButton');
        await testSubjects.exists('serverlessSearchConnectorLinkElasticsearchRunFromSourceButton');
      },
      async editDescription(description: string) {
        await testSubjects.existOrFail('serverlessSearchEditDescriptionButton');
        await testSubjects.click('serverlessSearchEditDescriptionButton');
        await testSubjects.exists('serverlessSearchEditDescriptionFieldText');
        await testSubjects.existOrFail('serverlessSearchSaveDescriptionButton');
        await testSubjects.existOrFail('serverlessSearchCancelDescriptionButton');
        await testSubjects.setValue('serverlessSearchEditDescriptionFieldText', description);
        await testSubjects.click('serverlessSearchSaveDescriptionButton');
        await testSubjects.exists('serverlessSearchConnectorDescription');

        expect(await testSubjects.getVisibleText('serverlessSearchConnectorDescription')).to.be(
          description
        );
      },
      async editName(name: string) {
        await testSubjects.existOrFail('serverlessSearchEditNameButton');
        await testSubjects.click('serverlessSearchEditNameButton');
        await testSubjects.existOrFail('serverlessSearchEditNameFieldText');
        await testSubjects.existOrFail('serverlessSearchSaveNameButton');
        await testSubjects.existOrFail('serverlessSearchCancelNameButton');
        await testSubjects.setValue('serverlessSearchEditNameFieldText', name);
        await testSubjects.click('serverlessSearchSaveNameButton');
        await retry.waitForWithTimeout('edit name form to disappear', 2000, () =>
          testSubjects
            .missingOrFail('serverlessSearchSaveNameButton')
            .then(() => true)
            .catch(() => false)
        );
        await testSubjects.exists('serverlessSearchConnectorName');
        expect(await testSubjects.getVisibleText('serverlessSearchConnectorName')).to.be(name);
      },
      async selectConnectorType(type: string) {
        await testSubjects.existOrFail('serverlessSearchEditConnectorType');
        await testSubjects.existOrFail('serverlessSearchEditConnectorTypeChoices');
        await comboBox.set('serverlessSearchEditConnectorTypeChoices', type);
      },
      async expectConnectorIdToMatchUrl(connectorId: string) {
        expect(await browser.getCurrentUrl()).contain(`/app/connectors/${connectorId}`);
      },
      async getConnectorDetails() {
        return await testSubjects.getVisibleText('serverlessSearchConnectorConnectorDetails');
      },
    },
    connectorOverviewPage: {
      async changeSearchBarTableSelectValue(option: string) {
        await testSubjects.existOrFail('serverlessSearchConnectorsTableSelect');
        await testSubjects.setValue('serverlessSearchConnectorsTableSelect', option);
      },
      async connectorNameExists(connectorName: string) {
        await retry.tryForTime(30 * 1000, async () => {
          const connectorsList = await this.getConnectorsList();
          expect(connectorsList).to.contain(connectorName);
        });
      },
      async confirmDeleteConnectorModalComponentsExists() {
        await testSubjects.existOrFail('serverlessSearchDeleteConnectorModalFieldText');
        await testSubjects.existOrFail('confirmModalConfirmButton');
        await testSubjects.existOrFail('confirmModalCancelButton');
      },
      async confirmConnectorTableIsDisappearedAfterDelete() {
        await retry.waitForWithTimeout('delete modal to disappear', 5000, () =>
          testSubjects
            .missingOrFail('confirmModalConfirmButton')
            .then(() => true)
            .catch(() => false)
        );
        await browser.refresh();
        await this.expectConnectorTableToHaveNoItems();
      },
      async expectConnectorOverviewPageComponentsToExist() {
        await testSubjects.existOrFail('serverlessSearchConnectorsTitle');
        // await testSubjects.existOrFail('serverlessSearchConnectorsOverviewElasticConnectorsLink');
        await testSubjects.exists('serverlessSearchEmptyConnectorsPromptCreateConnectorButton');
        // await testSubjects.existOrFail('serverlessSearchConnectorsOverviewCreateConnectorButton');
      },
      async expectConnectorTableToExist() {
        await testSubjects.existOrFail('serverlessSearchConnectorTable');
      },
      async expectConnectorTableToHaveItems(timeout?: number) {
        await testSubjects.existOrFail('serverlessSearchColumnsLink', { timeout });
      },
      async expectConnectorTableToHaveNoItems(timeout?: number) {
        await testSubjects.missingOrFail('serverlessSearchColumnsLink', { timeout });
      },
      async expectDeleteConnectorButtonExist() {
        await testSubjects.existOrFail('serverlessSearchDeleteConnectorModalActionButton');
      },
      async expectSearchBarToExist() {
        await testSubjects.existOrFail('serverlessSearchConnectorsTableSearchBar');
      },

      async deleteConnectorWithCorrectName(connectorNameToBeDeleted: string) {
        const fieldText = await testSubjects.find('serverlessSearchDeleteConnectorModalFieldText');
        await fieldText.clearValue();
        await retry.try(async () => {
          expect(
            await (
              await testSubjects.find('serverlessSearchDeleteConnectorModalFieldText')
            ).getAttribute('value')
          ).to.be('');
        });
        await retry.try(async () => {
          await fieldText.type(connectorNameToBeDeleted);
        });
        const isEnabled = await testSubjects.isEnabled('confirmModalConfirmButton');
        expect(isEnabled).to.be(true);
        await retry.try(async () => await testSubjects.click('confirmModalConfirmButton'));
      },
      async deleteConnectorIncorrectName(incorrectName: string) {
        const fieldText = await testSubjects.find('serverlessSearchDeleteConnectorModalFieldText');
        await fieldText.clearValue();
        await retry.try(async () => {
          await fieldText.type(incorrectName);
        });
        const isEnabled = await testSubjects.isEnabled('confirmModalConfirmButton');
        expect(isEnabled).to.be(false);
      },
      async getConnectorsList() {
        const connectorNameCells = await testSubjects.findAll('serverlessSearchColumnsLink');
        return Promise.all(connectorNameCells.map((element) => element.getVisibleText()));
      },
      async openDeleteConnectorModal() {
        await retry.try(
          async () => await testSubjects.click('serverlessSearchDeleteConnectorModalActionButton')
        );
        await testSubjects.exists('confirmModalBodyText');
        expect(await testSubjects.getVisibleText('confirmModalBodyText')).to.be(
          'This action cannot be undone. Please type my-connector to confirm.\nConnector name'
        );
      },
      async setSearchBarValue(value: string) {
        await testSubjects.setValue('serverlessSearchConnectorsTableSearchBar', value);
        await testSubjects.pressEnter('serverlessSearchConnectorsTableSearchBar');
      },
    },
  };
}
