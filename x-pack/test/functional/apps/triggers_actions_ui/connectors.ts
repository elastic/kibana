/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const ENTER_KEY = '\uE007';

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
    });

    it('should create a connector', async () => {
      const connectorName = generateUniqueKey();

      await pageObjects.triggersActionsUI.createActionConnector();

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

      const toastMessage = await find.byCssSelector(
        '[data-test-subj="euiToastHeader"] .euiToastHeader__title'
      );
      expect(await toastMessage.getVisibleText()).to.eql(`Created '${connectorName}'`);

      const closeButton = await testSubjects.find('toastCloseButton');
      await closeButton.click();
    });

    it('should edit a connector', async () => {
      const connectorName = generateUniqueKey();
      const updatedConnectorName = `${connectorName}updated`;

      await pageObjects.triggersActionsUI.createActionConnector();

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

      const closeToastButton = await testSubjects.find('toastCloseButton');
      await closeToastButton.click();

      const searchBox = await find.byCssSelector('[data-test-subj="actionsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(connectorName);
      await searchBox.pressKeys(ENTER_KEY);

      const rowsBeforeDelete = await testSubjects.findAll('connectors-row');
      expect(rowsBeforeDelete.length).to.eql(1);

      const deleteConnectorBtn = await testSubjects.find('editConnector');
      await deleteConnectorBtn.click();

      const nameInputToUpdate = await testSubjects.find('nameInput');
      await nameInputToUpdate.click();
      await nameInputToUpdate.clearValue();
      await nameInputToUpdate.type(updatedConnectorName);

      const saveEditButton = await find.byCssSelector(
        '[data-test-subj="saveActionButton"]:not(disabled)'
      );
      await saveEditButton.click();

      const toastMessage = await find.byCssSelector(
        '[data-test-subj="euiToastHeader"] .euiToastHeader__title'
      );
      expect(await toastMessage.getVisibleText()).to.eql(`Updated '${updatedConnectorName}'`);

      const closeToastUpdatedButton = await testSubjects.find('toastCloseButton');
      await closeToastUpdatedButton.click();
    });

    it('should delete a connector', async () => {
      const connectorName = generateUniqueKey();

      await pageObjects.triggersActionsUI.createActionConnector();

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

      await testSubjects.exists('euiToastHeader');

      const closeButton = await testSubjects.find('toastCloseButton');
      await closeButton.click();

      const searchBox = await find.byCssSelector('[data-test-subj="actionsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(connectorName);
      await searchBox.pressKeys(ENTER_KEY);

      const rowsBeforeDelete = await testSubjects.findAll('connectors-row');
      expect(rowsBeforeDelete.length).to.eql(1);

      const deleteConnectorBtn = await testSubjects.find('deleteConnector');
      await deleteConnectorBtn.click();

      await find.byCssSelector('[data-test-subj="actionsTable"]:not(.euiBasicTable-loading)');

      const rowsAfterDelete = await testSubjects.findAll('connectors-row');
      expect(rowsAfterDelete.length).to.eql(0);
    });
  });
};
