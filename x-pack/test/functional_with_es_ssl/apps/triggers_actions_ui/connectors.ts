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
  const alerting = getService('alerting');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const find = getService('find');

  describe('Connectors', function() {
    before(async () => {
      await alerting.actions.createAction({
        name: `server-log-${Date.now()}`,
        actionTypeId: '.server-log',
        config: {},
        secrets: {},
      });

      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('connectorsTab');
    });

    it('should create a connector', async () => {
      const connectorName = generateUniqueKey();

      await pageObjects.triggersActionsUI.clickCreateConnectorButton();

      await testSubjects.click('.server-log-card');

      const nameInput = await testSubjects.find('nameInput');
      await nameInput.click();
      await nameInput.clearValue();
      await nameInput.type(connectorName);

      await find.clickByCssSelector('[data-test-subj="saveNewActionButton"]:not(disabled)');

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Created '${connectorName}'`);

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResults = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResults).to.eql([
        {
          name: connectorName,
          actionType: 'Server log',
          referencedByCount: '0',
        },
      ]);
    });

    it('should edit a connector', async () => {
      const connectorName = generateUniqueKey();
      const updatedConnectorName = `${connectorName}updated`;

      await pageObjects.triggersActionsUI.clickCreateConnectorButton();

      await testSubjects.click('.server-log-card');

      const nameInput = await testSubjects.find('nameInput');
      await nameInput.click();
      await nameInput.clearValue();
      await nameInput.type(connectorName);

      await find.clickByCssSelector('[data-test-subj="saveNewActionButton"]:not(disabled)');

      await pageObjects.common.closeToast();

      await pageObjects.triggersActionsUI.searchConnectors(connectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      const nameInputToUpdate = await testSubjects.find('nameInput');
      await nameInputToUpdate.click();
      await nameInputToUpdate.clearValue();
      await nameInputToUpdate.type(updatedConnectorName);

      await find.clickByCssSelector('[data-test-subj="saveEditedActionButton"]:not(disabled)');

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Updated '${updatedConnectorName}'`);

      await pageObjects.triggersActionsUI.searchConnectors(updatedConnectorName);

      const searchResultsAfterEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsAfterEdit).to.eql([
        {
          name: updatedConnectorName,
          actionType: 'Server log',
          referencedByCount: '0',
        },
      ]);
    });

    it('should delete a connector', async () => {
      async function createConnector(connectorName: string) {
        await pageObjects.triggersActionsUI.clickCreateConnectorButton();

        await testSubjects.click('.server-log-card');

        const nameInput = await testSubjects.find('nameInput');
        await nameInput.click();
        await nameInput.clearValue();
        await nameInput.type(connectorName);

        await find.clickByCssSelector('[data-test-subj="saveNewActionButton"]:not(disabled)');
        await pageObjects.common.closeToast();
      }
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
      async function createConnector(connectorName: string) {
        await pageObjects.triggersActionsUI.clickCreateConnectorButton();

        await testSubjects.click('.server-log-card');

        const nameInput = await testSubjects.find('nameInput');
        await nameInput.click();
        await nameInput.clearValue();
        await nameInput.type(connectorName);

        await find.clickByCssSelector('[data-test-subj="saveNewActionButton"]:not(disabled)');
        await pageObjects.common.closeToast();
      }

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
      const preconfiguredConnectorName = 'xyz';
      await pageObjects.triggersActionsUI.searchConnectors(preconfiguredConnectorName);

      const searchResults = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResults.length).to.eql(1);

      expect(await testSubjects.exists('deleteConnector')).to.be(false);
      expect(await testSubjects.exists('preConfiguredTitleMessage')).to.be(true);
    });

    it('should not be able to edit a preconfigured connector', async () => {
      const preconfiguredConnectorName = 'xyz';

      await pageObjects.triggersActionsUI.searchConnectors(preconfiguredConnectorName);

      const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
      expect(searchResultsBeforeEdit.length).to.eql(1);

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      expect(await testSubjects.exists('preconfiguredBadge')).to.be(true);
      expect(await testSubjects.exists('saveEditedActionButton')).to.be(false);
    });
  });
};
