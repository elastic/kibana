/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { testHasEmbeddedConsole } from '../embedded_console';

const TEST_CONNECTOR_NAME = 'my-connector';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'common',
    'svlSearchConnectorsPage',
    'embeddedConsole',
  ]);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  describe('connectors', function () {
    before(async () => {
      await pageObjects.svlSearchConnectorsPage.helpers.deleteAllConnectors();
      await pageObjects.svlCommonPage.loginWithRole('developer');
    });

    it('has embedded console', async () => {
      await pageObjects.common.navigateToApp('serverlessConnectors');
      await testHasEmbeddedConsole(pageObjects);
    });

    it('Connector app is loaded and has no connectors', async () => {
      await pageObjects.common.navigateToApp('serverlessConnectors');
      await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectConnectorOverviewPageComponentsToExist();
    });

    describe('Connector lifecycle', () => {
      it('create connector and confirm connector configuration page is loaded', async () => {
        await pageObjects.common.navigateToApp('serverlessConnectors');
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.createConnector();
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.selectConnectorType(
          'zoom'
        );
        const connectorDetails =
          await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.getConnectorDetails();
        const connectorId = connectorDetails.match(/connector_id: (.*)/)?.[1];
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.expectConnectorIdToMatchUrl(
          connectorId!
        );
      });
      it('can edit connector - description and name', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.editDescription(
          'test description'
        );
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.editName(
          TEST_CONNECTOR_NAME
        );
        const connectorDetails =
          await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.getConnectorDetails();
        const connectorId = connectorDetails.match(/connector_id: (.*)/)?.[1];
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.expectConnectorIdToMatchUrl(
          connectorId!
        );

        expect(await testSubjects.getVisibleText('serverlessSearchConnectorName')).to.be(
          TEST_CONNECTOR_NAME
        );
      });
      describe('connector table', () => {
        it('searchBar and select, filters connector table', async () => {
          await pageObjects.common.navigateToApp('serverlessConnectors');

          // Ensure the page is rendered and we have items
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectConnectorTableToExist();
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectSearchBarToExist();
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectConnectorTableToHaveItems();

          await retry.try(
            async () => {
              await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.setSearchBarValue(
                TEST_CONNECTOR_NAME
              );
              await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.connectorNameExists(
                TEST_CONNECTOR_NAME
              );
            },
            () => browser.refresh()
          );

          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.changeSearchBarTableSelectValue(
            'Type'
          );
          await testSubjects.click('clearSearchButton');
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectConnectorTableToHaveItems();
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.setSearchBarValue(
            'confluence'
          );
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectConnectorTableToHaveNoItems();
          await testSubjects.click('clearSearchButton');
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.changeSearchBarTableSelectValue(
            'Name'
          );
        });
      });
      describe('delete connector', () => {
        it('can delete a connector', async () => {
          await pageObjects.common.navigateToApp('serverlessConnectors');

          // Ensure the page is rendered and we have items
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectConnectorTableToExist();
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectSearchBarToExist();
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectConnectorTableToHaveItems();
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.setSearchBarValue(
            TEST_CONNECTOR_NAME
          );
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.connectorNameExists(
            TEST_CONNECTOR_NAME
          );
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectDeleteConnectorButtonExist();

          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.openDeleteConnectorModal();
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.confirmDeleteConnectorModalComponentsExists();
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.deleteConnectorIncorrectName(
            'invalid'
          );
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.deleteConnectorWithCorrectName(
            TEST_CONNECTOR_NAME
          );
          await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.confirmConnectorTableIsDisappearedAfterDelete();
        });
      });
    });
  });
}
