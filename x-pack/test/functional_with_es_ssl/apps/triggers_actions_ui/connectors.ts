/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

function generateUniqueKey() {
  return uuid.v4().replace(/-/g, '');
}

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const find = getService('find');

  describe('Connectors', function() {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      const alertsTab = await testSubjects.find('connectorsTab');
      await alertsTab.click();
    });

    it('should create a connector', async () => {
      const connectorName = generateUniqueKey();

      await pageObjects.triggersActionsUI.clickCreateConnectorButton();

      const serverLogCard = await testSubjects.find('.server-log-card');
      await serverLogCard.click();

      const nameInput = await testSubjects.find('nameInput');
      await nameInput.click();
      await nameInput.clearValue();
      await nameInput.type(connectorName);

      const saveButton = await find.byCssSelector(
        '[data-test-subj="saveActionButton"]:not(disabled)'
      );
      await saveButton.click();

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Created '${connectorName}'`);

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResults = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResults).to.eql([
        {
          name: connectorName,
          actionType: 'Server Log',
          referencedByCount: '0',
        },
      ]);
    });

    it('should edit a connector', async () => {
      const connectorName = generateUniqueKey();
      const updatedConnectorName = `${connectorName}updated`;

      await pageObjects.triggersActionsUI.clickCreateConnectorButton();

      const serverLogCard = await testSubjects.find('.server-log-card');
      await serverLogCard.click();

      const nameInput = await testSubjects.find('nameInput');
      await nameInput.click();
      await nameInput.clearValue();
      await nameInput.type(connectorName);

      const saveButton = await find.byCssSelector(
        '[data-test-subj="saveActionButton"]:not(disabled)'
      );
      await saveButton.click();

      await pageObjects.common.closeToast();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      const editConnectorBtn = await find.byCssSelector(
        '[data-test-subj="connectorsTableCell-name"] button'
      );
      await editConnectorBtn.click();

      const nameInputToUpdate = await testSubjects.find('nameInput');
      await nameInputToUpdate.click();
      await nameInputToUpdate.clearValue();
      await nameInputToUpdate.type(updatedConnectorName);

      const saveEditButton = await find.byCssSelector(
        '[data-test-subj="saveActionButton"]:not(disabled)'
      );
      await saveEditButton.click();

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Updated '${updatedConnectorName}'`);

      await pageObjects.triggersActionsUI.searchConnectors(updatedConnectorName);

      const searchResultsAfterEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsAfterEdit).to.eql([
        {
          name: updatedConnectorName,
          actionType: 'Server Log',
          referencedByCount: '0',
        },
      ]);
    });

    it('should delete a connector', async () => {
      const connectorName = generateUniqueKey();

      await pageObjects.triggersActionsUI.clickCreateConnectorButton();

      const serverLogCard = await testSubjects.find('.server-log-card');
      await serverLogCard.click();

      const nameInput = await testSubjects.find('nameInput');
      await nameInput.click();
      await nameInput.clearValue();
      await nameInput.type(connectorName);

      const saveButton = await find.byCssSelector(
        '[data-test-subj="saveActionButton"]:not(disabled)'
      );
      await saveButton.click();

      await pageObjects.common.closeToast();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeDelete = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeDelete.length).to.eql(1);

      const deleteConnectorBtn = await testSubjects.find('deleteConnector');
      await deleteConnectorBtn.click();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsAfterDelete.length).to.eql(0);
    });

    it('should bulk delete connectors', async () => {
      const connectorName = generateUniqueKey();

      await pageObjects.triggersActionsUI.clickCreateConnectorButton();

      const serverLogCard = await testSubjects.find('.server-log-card');
      await serverLogCard.click();

      const nameInput = await testSubjects.find('nameInput');
      await nameInput.click();
      await nameInput.clearValue();
      await nameInput.type(connectorName);

      const saveButton = await find.byCssSelector(
        '[data-test-subj="saveActionButton"]:not(disabled)'
      );
      await saveButton.click();

      await pageObjects.common.closeToast();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeDelete = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeDelete.length).to.eql(1);

      const deleteCheckbox = await find.byCssSelector(
        '.euiTableRowCellCheckbox .euiCheckbox__input'
      );
      await deleteCheckbox.click();

      const bulkDeleteBtn = await testSubjects.find('bulkDelete');
      await bulkDeleteBtn.click();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsAfterDelete.length).to.eql(0);
    });
  });
};
