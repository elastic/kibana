/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';
import { testHasEmbeddedConsole } from '../embedded_console';

const TEST_CONNECTOR_NAME = 'my-connector';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'common',
    'svlSearchConnectorsPage',
  ]);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  describe('connectors', function () {
    before(async () => {
      await pageObjects.svlCommonPage.login();
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'serverlessConnectors',
      });
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('Connector app is loaded and  has no connectors', async () => {
      await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectConnectorOverviewPageComponentsToExist();
    });
    it('has embedded dev console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });
    describe('create and configure connector', async () => {
      it('create connector and confirm connector configuration page is loaded', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.createConnector();
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.expectConnectorIdToMatchUrl(
          await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.getConnectorId()
        );
      });
      it('edit description', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.editDescription(
          'test description'
        );
      });
      it('edit name', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.editName(
          TEST_CONNECTOR_NAME
        );
      });
      it('edit type', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorConfigurationPage.editType('zoom');
      });
      it('confirm connector is created', async () => {
        await pageObjects.svlCommonNavigation.sidenav.clickLink({
          deepLinkId: 'serverlessConnectors',
        });
        await browser.refresh();
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectConnectorTableToExist();
      });
    });
    describe('connector table', async () => {
      it('confirm searchBar to exist', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectSearchBarToExist();
      });

      it('searchBar and select, filters connector table', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.getConnectorFromConnectorTable(
          TEST_CONNECTOR_NAME
        );
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.setSearchBarValue(
          TEST_CONNECTOR_NAME
        );
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.connectorNameExists(
          TEST_CONNECTOR_NAME
        );

        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.changeSearchBarTableSelectValue(
          'Type'
        );

        await testSubjects.click('clearSearchButton');
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.setSearchBarValue(
          'confluence'
        );
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectConnectorTableToHaveNoItems();
        await testSubjects.click('clearSearchButton');
      });
    });
    describe('delete connector', async () => {
      it('delete connector button exist in table', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.expectDeleteConnectorButtonExist();
      });
      it('open delete connector modal', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.openDeleteConnectorModal();
      });
      it('delete connector button open modal', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.confirmDeleteConnectorModalComponentsExists();
      });
      it('delete connector field is disabled if field name does not match connector name', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.deleteConnectorIncorrectName(
          'invalid'
        );
      });
      it('delete connector button deletes connector', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.deleteConnectorWithCorrectName(
          TEST_CONNECTOR_NAME
        );
      });
      it('confirm connector table is disappeared after delete ', async () => {
        await pageObjects.svlSearchConnectorsPage.connectorOverviewPage.confirmConnectorTableIsDisappearedAfterDelete();
      });
    });
  });
}
