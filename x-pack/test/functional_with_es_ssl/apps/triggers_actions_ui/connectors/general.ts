/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';
import { generateUniqueKey } from '../../../lib/get_test_data';
import {
  getConnectorByName,
  createSlackConnectorAndObjectRemover,
  createSlackConnector,
} from './utils';

export default ({ getPageObjects, getPageObject, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const find = getService('find');
  const retry = getService('retry');
  const supertest = getService('supertest');
  let objectRemover: ObjectRemover;
  const browser = getService('browser');

  describe('General connector functionality', function () {
    before(async () => {
      objectRemover = await createSlackConnectorAndObjectRemover({ getService });
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('triggersActionsConnectors');
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('should create a connector', async () => {
      const connectorName = generateUniqueKey();

      await pageObjects.triggersActionsUI.clickCreateConnectorButton();

      await testSubjects.click('.index-card');

      await find.clickByCssSelector('[data-test-subj="create-connector-flyout-back-btn"]');

      await testSubjects.click('.slack-card');

      await testSubjects.setValue('nameInput', connectorName);

      await testSubjects.setValue('slackWebhookUrlInput', 'https://test.com');

      await find.clickByCssSelector(
        '[data-test-subj="create-connector-flyout-save-btn"]:not(disabled)'
      );

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Created '${connectorName}'`);

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResults = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResults).to.eql([
        {
          name: connectorName,
          actionType: 'Slack',
        },
      ]);
      const connector = await getConnectorByName(connectorName, supertest);
      objectRemover.add(connector.id, 'action', 'actions');
    });

    it('should edit a connector', async () => {
      const connectorName = generateUniqueKey();
      const updatedConnectorName = `${connectorName}updated`;
      const createdAction = await createSlackConnector({
        name: connectorName,
        getService,
      });
      objectRemover.add(createdAction.id, 'action', 'actions');
      await browser.refresh();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      await testSubjects.setValue('nameInput', updatedConnectorName);

      await testSubjects.setValue('slackWebhookUrlInput', 'https://test.com');

      await find.clickByCssSelector(
        '[data-test-subj="edit-connector-flyout-save-btn"]:not(disabled)'
      );

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Updated '${updatedConnectorName}'`);

      await testSubjects.click('euiFlyoutCloseButton');

      await pageObjects.triggersActionsUI.searchConnectors(updatedConnectorName);

      const searchResultsAfterEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsAfterEdit).to.eql([
        {
          name: updatedConnectorName,
          actionType: 'Slack',
        },
      ]);
    });

    it('should test a connector and display a successful result', async () => {
      const connectorName = generateUniqueKey();
      const indexName = generateUniqueKey();
      const createdAction = await createIndexConnector(connectorName, indexName);
      objectRemover.add(createdAction.id, 'action', 'actions');
      await browser.refresh();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      await find.clickByCssSelector('[data-test-subj="testConnectorTab"]');

      // test success
      await find.setValueByClass('kibanaCodeEditor', '{ "key": "value" }');

      await find.clickByCssSelector('[data-test-subj="executeActionButton"]:not(disabled)');

      await retry.try(async () => {
        await testSubjects.find('executionSuccessfulResult');
      });

      await find.clickByCssSelector(
        '[data-test-subj="edit-connector-flyout-close-btn"]:not(disabled)'
      );
    });

    it('should test a connector and display a failure result', async () => {
      const connectorName = generateUniqueKey();
      const indexName = generateUniqueKey();
      const createdAction = await createIndexConnector(connectorName, indexName);
      objectRemover.add(createdAction.id, 'action', 'actions');
      await browser.refresh();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      await find.clickByCssSelector('[data-test-subj="testConnectorTab"]');

      await find.setValueByClass('kibanaCodeEditor', '"test"');

      await find.clickByCssSelector('[data-test-subj="executeActionButton"]:not(disabled)');

      await retry.try(async () => {
        await testSubjects.find('executionFailureResult');
      });

      await find.clickByCssSelector(
        '[data-test-subj="edit-connector-flyout-close-btn"]:not(disabled)'
      );
    });

    it('should reset connector when canceling an edit', async () => {
      const connectorName = generateUniqueKey();
      const createdAction = await createSlackConnector({
        name: connectorName,
        getService,
      });
      objectRemover.add(createdAction.id, 'action', 'actions');
      await browser.refresh();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      await testSubjects.setValue('nameInput', 'some test name to cancel');
      await testSubjects.click('edit-connector-flyout-close-btn');
      await testSubjects.click('confirmModalConfirmButton');

      await find.waitForDeletedByCssSelector('[data-test-subj="edit-connector-flyout-close-btn"]');

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');
      const nameInputAfterCancel = await testSubjects.find('nameInput');
      const textAfterCancel = await nameInputAfterCancel.getAttribute('value');
      expect(textAfterCancel).to.eql(connectorName);
      await testSubjects.click('euiFlyoutCloseButton');
    });

    it('should delete a connector', async () => {
      const connectorName = generateUniqueKey();
      await createSlackConnector({ name: connectorName, getService });
      const createdAction = await createSlackConnector({
        name: generateUniqueKey(),
        getService,
      });
      objectRemover.add(createdAction.id, 'action', 'actions');
      await browser.refresh();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeDelete = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeDelete.length).to.eql(1);

      await testSubjects.click('deleteConnector');
      await testSubjects.existOrFail('deleteIdsConfirmation');
      await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
      await testSubjects.missingOrFail('deleteIdsConfirmation');

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql('Deleted 1 connector');

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsAfterDelete.length).to.eql(0);
    });

    it('should bulk delete connectors', async () => {
      const connectorName = generateUniqueKey();
      await createSlackConnector({ name: connectorName, getService });
      const createdAction = await createSlackConnector({
        name: generateUniqueKey(),
        getService,
      });
      objectRemover.add(createdAction.id, 'action', 'actions');
      await browser.refresh();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeDelete = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeDelete.length).to.eql(1);

      await find.clickByCssSelector('.euiTableRowCellCheckbox .euiCheckbox__input');

      await testSubjects.click('bulkDelete');
      await testSubjects.existOrFail('deleteIdsConfirmation');
      await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
      await testSubjects.missingOrFail('deleteIdsConfirmation');

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql('Deleted 1 connector');

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsAfterDelete.length).to.eql(0);
    });

    it('should not be able to delete a preconfigured connector', async () => {
      const preconfiguredConnectorName = 'Serverlog';
      await pageObjects.triggersActionsUI.searchConnectors(preconfiguredConnectorName);

      const searchResults = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResults.length).to.eql(1);

      expect(await testSubjects.exists('deleteConnector')).to.be(false);
      expect(await testSubjects.exists('preConfiguredTitleMessage')).to.be(true);

      const checkboxSelectRow = await testSubjects.find('checkboxSelectRow-my-server-log');
      expect(await checkboxSelectRow.getAttribute('disabled')).to.be('true');
    });

    it('should not be able to edit a preconfigured connector', async () => {
      const preconfiguredConnectorName = 'test-preconfigured-email';

      await pageObjects.triggersActionsUI.searchConnectors(preconfiguredConnectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      expect(await testSubjects.exists('preConfiguredTitleMessage')).to.be(true);
      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      expect(await testSubjects.exists('preconfiguredBadge')).to.be(true);
      expect(await testSubjects.exists('edit-connector-flyout-save-btn')).to.be(false);
    });
  });

  async function createIndexConnector(connectorName: string, indexName: string) {
    const { body: createdAction } = await supertest
      .post(`/api/actions/connector`)
      .set('kbn-xsrf', 'foo')
      .send({
        config: {
          index: indexName,
          refresh: false,
        },
        connector_type_id: '.index',
        name: connectorName,
        secrets: {},
      })
      .expect(200);
    return createdAction;
  }
};
