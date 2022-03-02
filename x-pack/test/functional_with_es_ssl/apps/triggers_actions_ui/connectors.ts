/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ObjectRemover } from '../../lib/object_remover';
import { generateUniqueKey, getTestActionData } from '../../lib/get_test_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const find = getService('find');
  const retry = getService('retry');
  const comboBox = getService('comboBox');
  const supertest = getService('supertest');

  // FLAKY: https://github.com/elastic/kibana/issues/88796
  describe.skip('Connectors', function () {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      const { body: createdAction } = await supertest
        .post(`/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send(getTestActionData())
        .expect(200);
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('connectorsTab');
      objectRemover.add(createdAction.id, 'action', 'actions');
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('should create a connector', async () => {
      const connectorName = generateUniqueKey();

      await pageObjects.triggersActionsUI.clickCreateConnectorButton();

      await testSubjects.click('.index-card');

      await find.clickByCssSelector('[data-test-subj="backButton"]');

      await testSubjects.click('.slack-card');

      await testSubjects.setValue('nameInput', connectorName);

      await testSubjects.setValue('slackWebhookUrlInput', 'https://test');

      await find.clickByCssSelector('[data-test-subj="saveNewActionButton"]:not(disabled)');

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
    });

    it('should edit a connector', async () => {
      const connectorName = generateUniqueKey();
      const updatedConnectorName = `${connectorName}updated`;
      await createConnector(connectorName);

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      await testSubjects.setValue('nameInput', updatedConnectorName);

      await testSubjects.setValue('slackWebhookUrlInput', 'https://test');

      await find.clickByCssSelector(
        '[data-test-subj="saveAndCloseEditedActionButton"]:not(disabled)'
      );

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Updated '${updatedConnectorName}'`);

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
      await createIndexConnector(connectorName, indexName);

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      await find.clickByCssSelector('[data-test-subj="testConnectorTab"]');

      // test success
      await testSubjects.setValue('documentsJsonEditor', '{ "key": "value" }');

      await find.clickByCssSelector('[data-test-subj="executeActionButton"]:not(disabled)');

      await retry.try(async () => {
        await testSubjects.find('executionSuccessfulResult');
      });

      await find.clickByCssSelector(
        '[data-test-subj="cancelSaveEditedConnectorButton"]:not(disabled)'
      );
    });

    it('should test a connector and display a failure result', async () => {
      const connectorName = generateUniqueKey();
      const indexName = generateUniqueKey();
      await createIndexConnector(connectorName, indexName);

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      await find.clickByCssSelector('[data-test-subj="testConnectorTab"]');

      await testSubjects.setValue('documentsJsonEditor', '{ "": "value" }');

      await find.clickByCssSelector('[data-test-subj="executeActionButton"]:not(disabled)');

      await retry.try(async () => {
        const executionFailureResultCallout = await testSubjects.find('executionFailureResult');
        expect(await executionFailureResultCallout.getVisibleText()).to.match(
          /error indexing documents/
        );
      });

      await find.clickByCssSelector(
        '[data-test-subj="cancelSaveEditedConnectorButton"]:not(disabled)'
      );
    });

    it('should reset connector when canceling an edit', async () => {
      const connectorName = generateUniqueKey();
      await createConnector(connectorName);
      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      await testSubjects.setValue('nameInput', 'some test name to cancel');
      await testSubjects.click('cancelSaveEditedConnectorButton');

      await find.waitForDeletedByCssSelector('[data-test-subj="cancelSaveEditedConnectorButton"]');

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');
      const nameInputAfterCancel = await testSubjects.find('nameInput');
      const textAfterCancel = await nameInputAfterCancel.getAttribute('value');
      expect(textAfterCancel).to.eql(connectorName);
      await testSubjects.click('euiFlyoutCloseButton');
    });

    it('should delete a connector', async () => {
      const connectorName = generateUniqueKey();
      await createConnector(connectorName);

      await createConnector(generateUniqueKey());

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
      await createConnector(connectorName);

      await createConnector(generateUniqueKey());

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
      expect(await testSubjects.exists('saveAndCloseEditedActionButton')).to.be(false);
    });
  });

  async function createConnector(connectorName: string) {
    await pageObjects.triggersActionsUI.clickCreateConnectorButton();

    await testSubjects.click('.slack-card');

    await testSubjects.setValue('nameInput', connectorName);

    await testSubjects.setValue('slackWebhookUrlInput', 'https://test');

    await find.clickByCssSelector('[data-test-subj="saveNewActionButton"]:not(disabled)');
    await pageObjects.common.closeToast();
  }

  async function createIndexConnector(connectorName: string, indexName: string) {
    await pageObjects.triggersActionsUI.clickCreateConnectorButton();

    await testSubjects.click('.index-card');

    await testSubjects.setValue('nameInput', connectorName);

    await retry.try(async () => {
      // At times we find the driver controlling the ComboBox in tests
      // can select the wrong item, this ensures we always select the correct index
      await comboBox.set('connectorIndexesComboBox', indexName);
      expect(
        await comboBox.isOptionSelected(
          await testSubjects.find('connectorIndexesComboBox'),
          indexName
        )
      ).to.be(true);
    });

    await find.clickByCssSelector('[data-test-subj="saveNewActionButton"]:not(disabled)');
    await pageObjects.common.closeToast();
  }
};
