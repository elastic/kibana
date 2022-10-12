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
import { createConnector, createConnectorAndObjectRemover, getConnector } from './utils';

export default ({ getPageObjects, getPageObject, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const find = getService('find');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const actions = getService('actions');
  const rules = getService('rules');
  let objectRemover: ObjectRemover;

  describe('Opsgenie', () => {
    before(async () => {
      objectRemover = await createConnectorAndObjectRemover({ getPageObject, getService });
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    describe('connector page', () => {
      before(async () => {
        await testSubjects.click('connectorsTab');
      });

      it('should create the connector', async () => {
        const connectorName = generateUniqueKey();

        await actions.opsgenie.createNewConnector({
          name: connectorName,
          apiUrl: 'https://test.com',
          apiKey: 'apiKey',
        });

        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql(`Created '${connectorName}'`);

        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        const searchResults = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResults).to.eql([
          {
            name: connectorName,
            actionType: 'Opsgenie',
          },
        ]);
        const connector = await getConnector(connectorName, supertest);
        objectRemover.add(connector.id, 'action', 'actions');
      });

      it('should edit the connector', async () => {
        const connectorName = generateUniqueKey();
        const updatedConnectorName = `${connectorName}updated`;
        const createdAction = await createOpsgenieConnector(connectorName);
        objectRemover.add(createdAction.id, 'action', 'actions');

        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResultsBeforeEdit.length).to.eql(1);

        await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');
        await actions.opsgenie.updateConnectorFields({
          name: updatedConnectorName,
          apiUrl: 'https://test.com',
          apiKey: 'apiKey',
        });

        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql(`Updated '${updatedConnectorName}'`);

        await testSubjects.click('euiFlyoutCloseButton');
        await pageObjects.triggersActionsUI.searchConnectors(updatedConnectorName);

        const searchResultsAfterEdit = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResultsAfterEdit).to.eql([
          {
            name: updatedConnectorName,
            actionType: 'Opsgenie',
          },
        ]);
      });

      it('should reset connector when canceling an edit', async () => {
        const connectorName = generateUniqueKey();
        const createdAction = await createOpsgenieConnector(connectorName);
        objectRemover.add(createdAction.id, 'action', 'actions');
        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResultsBeforeEdit.length).to.eql(1);

        await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

        await testSubjects.setValue('nameInput', 'some test name to cancel');
        await testSubjects.click('edit-connector-flyout-close-btn');
        await testSubjects.click('confirmModalConfirmButton');

        await find.waitForDeletedByCssSelector(
          '[data-test-subj="edit-connector-flyout-close-btn"]'
        );

        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');
        const nameInputAfterCancel = await testSubjects.find('nameInput');
        const textAfterCancel = await nameInputAfterCancel.getAttribute('value');
        expect(textAfterCancel).to.eql(connectorName);
        await testSubjects.click('euiFlyoutCloseButton');
      });

      it('should disable the run button when the message field is not filled', async () => {
        const connectorName = generateUniqueKey();
        const createdAction = await createOpsgenieConnector(connectorName);
        objectRemover.add(createdAction.id, 'action', 'actions');

        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResultsBeforeEdit.length).to.eql(1);

        await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

        await find.clickByCssSelector('[data-test-subj="testConnectorTab"]');

        expect(await (await testSubjects.find('executeActionButton')).isEnabled()).to.be(false);
      });
    });

    describe('alerts page', () => {
      before(async () => {
        await testSubjects.click('rulesTab');
      });

      it('should default to the create alert action', async () => {
        await setupRule();

        await createOpsgenieConnectorInRuleAction();

        const selectAction = await find.byCssSelector('[data-test-subj="opsgenie-subActionSelect');

        expect(await selectAction.getAttribute('value')).to.eql('createAlert');

        const alias = await find.byCssSelector('[data-test-subj="aliasInput');
        expect(await alias.getAttribute('value')).to.eql('{{rule.id}}:{{alert.id}}');

        await rules.common.cancelRuleCreation();
      });

      it('should default to the close alert action when setting the run when to recovered', async () => {
        await setupRule();
        await createOpsgenieConnectorInRuleAction();

        await testSubjects.click('addNewActionConnectorActionGroup-0');
        await testSubjects.click('addNewActionConnectorActionGroup-0-option-recovered');

        const selectAction = await find.byCssSelector('[data-test-subj="opsgenie-subActionSelect');

        expect(await selectAction.getAttribute('value')).to.eql('closeAlert');

        const alias = await find.byCssSelector('[data-test-subj="aliasInput');
        expect(await alias.getAttribute('value')).to.eql('{{rule.id}}:{{alert.id}}');

        await rules.common.cancelRuleCreation();
      });
    });

    const setupRule = async () => {
      const alertName = generateUniqueKey();
      await rules.common.defineIndexThresholdAlert(alertName);

      await rules.common.setNotifyThrottleInput();
    };

    const createOpsgenieConnectorInRuleAction = async () => {
      await testSubjects.click('.opsgenie-alerting-ActionTypeSelectOption');
      await testSubjects.click('addNewActionConnectorButton-.opsgenie');

      const connectorName = generateUniqueKey();
      await actions.opsgenie.setConnectorFields({
        name: connectorName,
        apiUrl: 'https://test.com',
        apiKey: 'apiKey',
      });

      await find.clickByCssSelector('[data-test-subj="saveActionButtonModal"]:not(disabled)');
      const createdConnectorToastTitle = await pageObjects.common.closeToast();
      expect(createdConnectorToastTitle).to.eql(`Created '${connectorName}'`);
    };

    const createOpsgenieConnector = async (name: string) => {
      return createConnector({
        name,
        config: { apiUrl: 'https//test.com' },
        secrets: { apiKey: '1234' },
        connectorTypeId: '.opsgenie',
        getPageObject,
        getService,
      });
    };
  });
};
