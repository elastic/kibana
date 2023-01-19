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
import { createSlackConnectorAndObjectRemover, getConnectorByName } from './utils';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const find = getService('find');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const actions = getService('actions');
  const rules = getService('rules');
  const browser = getService('browser');
  let objectRemover: ObjectRemover;

  describe('Opsgenie', () => {
    before(async () => {
      objectRemover = await createSlackConnectorAndObjectRemover({ getService });
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    describe('connector page', () => {
      beforeEach(async () => {
        await pageObjects.common.navigateToApp('triggersActionsConnectors');
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
        const connector = await getConnectorByName(connectorName, supertest);
        objectRemover.add(connector.id, 'action', 'actions');
      });

      it('should edit the connector', async () => {
        const connectorName = generateUniqueKey();
        const updatedConnectorName = `${connectorName}updated`;
        const createdAction = await createOpsgenieConnector(connectorName);
        objectRemover.add(createdAction.id, 'action', 'actions');
        browser.refresh();

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
        browser.refresh();

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
        expect(await testSubjects.getAttribute('nameInput', 'value')).to.eql(connectorName);
        await testSubjects.click('euiFlyoutCloseButton');
      });

      it('should disable the run button when the message field is not filled', async () => {
        const connectorName = generateUniqueKey();
        const createdAction = await createOpsgenieConnector(connectorName);
        objectRemover.add(createdAction.id, 'action', 'actions');
        browser.refresh();

        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResultsBeforeEdit.length).to.eql(1);

        await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

        await find.clickByCssSelector('[data-test-subj="testConnectorTab"]');

        expect(await testSubjects.isEnabled('executeActionButton')).to.be(false);
      });

      describe('test page', () => {
        let connectorId = '';

        before(async () => {
          const connectorName = generateUniqueKey();
          const createdAction = await createOpsgenieConnector(connectorName);
          connectorId = createdAction.id;
          objectRemover.add(createdAction.id, 'action', 'actions');
        });

        beforeEach(async () => {
          await testSubjects.click(`edit${connectorId}`);
          await testSubjects.click('testConnectorTab');
        });

        afterEach(async () => {
          await actions.common.cancelConnectorForm();
        });

        it('should show the sub action selector when in test mode', async () => {
          await testSubjects.existOrFail('opsgenie-subActionSelect');
        });

        it('should preserve the alias when switching between create and close alert actions', async () => {
          await testSubjects.setValue('aliasInput', 'new alias');
          await testSubjects.selectValue('opsgenie-subActionSelect', 'closeAlert');

          expect(await testSubjects.getAttribute('opsgenie-subActionSelect', 'value')).to.be(
            'closeAlert'
          );
          expect(await testSubjects.getAttribute('aliasInput', 'value')).to.be('new alias');
        });

        it('should not preserve the message when switching to close alert and back to create alert', async () => {
          await testSubjects.setValue('messageInput', 'a message');
          await testSubjects.selectValue('opsgenie-subActionSelect', 'closeAlert');

          await testSubjects.missingOrFail('messageInput');
          await retry.waitFor('message input to be displayed', async () => {
            await testSubjects.selectValue('opsgenie-subActionSelect', 'createAlert');
            return await testSubjects.exists('messageInput');
          });

          expect(await testSubjects.getAttribute('messageInput', 'value')).to.be('');
        });

        describe('createAlert', () => {
          it('should show the additional options for creating an alert when clicking more options', async () => {
            await testSubjects.click('opsgenie-display-more-options');

            await testSubjects.existOrFail('entityInput');
            await testSubjects.existOrFail('sourceInput');
            await testSubjects.existOrFail('userInput');
            await testSubjects.existOrFail('noteTextArea');
          });

          it('should show and then hide the additional form options for creating an alert when clicking the button twice', async () => {
            await testSubjects.click('opsgenie-display-more-options');

            await testSubjects.existOrFail('entityInput');

            await testSubjects.click('opsgenie-display-more-options');
            await testSubjects.missingOrFail('entityInput');
          });

          it('should populate the json editor with the message, description, and alias', async () => {
            await testSubjects.setValue('messageInput', 'a message');
            await testSubjects.setValue('descriptionTextArea', 'a description');
            await testSubjects.setValue('aliasInput', 'an alias');
            await testSubjects.setValue('opsgenie-prioritySelect', 'P5');
            await testSubjects.setValue('opsgenie-tags', 'a tag');

            await testSubjects.click('opsgenie-show-json-editor-toggle');

            const parsedValue = await actions.opsgenie.getObjFromJsonEditor();
            expect(parsedValue).to.eql({
              message: 'a message',
              description: 'a description',
              alias: 'an alias',
              priority: 'P5',
              tags: ['a tag'],
            });
          });

          it('should populate the form with the values from the json editor', async () => {
            await testSubjects.click('opsgenie-show-json-editor-toggle');

            await actions.opsgenie.setJsonEditor({
              message: 'a message',
              description: 'a description',
              alias: 'an alias',
              priority: 'P3',
              tags: ['tag1'],
            });
            await testSubjects.click('opsgenie-show-json-editor-toggle');

            expect(await testSubjects.getAttribute('messageInput', 'value')).to.be('a message');
            expect(await testSubjects.getAttribute('descriptionTextArea', 'value')).to.be(
              'a description'
            );
            expect(await testSubjects.getAttribute('aliasInput', 'value')).to.be('an alias');
            expect(await testSubjects.getAttribute('opsgenie-prioritySelect', 'value')).to.eql(
              'P3'
            );
            expect(await (await testSubjects.find('opsgenie-tags')).getVisibleText()).to.eql(
              'tag1'
            );
          });

          it('should disable the run button when the json editor validation fails', async () => {
            await testSubjects.click('opsgenie-show-json-editor-toggle');

            await actions.opsgenie.setJsonEditor({
              message: '',
            });

            expect(await testSubjects.isEnabled('executeActionButton')).to.be(false);
          });
        });

        describe('closeAlert', () => {
          it('should show the additional options for closing an alert when clicking more options', async () => {
            await testSubjects.selectValue('opsgenie-subActionSelect', 'closeAlert');

            await testSubjects.click('opsgenie-display-more-options');

            await testSubjects.existOrFail('sourceInput');
            await testSubjects.existOrFail('userInput');
          });

          it('should show and then hide the additional form options for closing an alert when clicking the button twice', async () => {
            await testSubjects.selectValue('opsgenie-subActionSelect', 'closeAlert');

            await testSubjects.click('opsgenie-display-more-options');

            await testSubjects.existOrFail('sourceInput');

            await testSubjects.click('opsgenie-display-more-options');
            await testSubjects.missingOrFail('sourceInput');
          });
        });
      });
    });

    describe('alerts page', () => {
      const defaultAlias = '{{rule.id}}:{{alert.id}}';
      const connectorName = generateUniqueKey();

      before(async () => {
        const createdAction = await createOpsgenieConnector(connectorName);
        objectRemover.add(createdAction.id, 'action', 'actions');

        await pageObjects.common.navigateToApp('triggersActions');
      });

      beforeEach(async () => {
        await setupRule();
        await selectOpsgenieConnectorInRuleAction(connectorName);
      });

      afterEach(async () => {
        await rules.common.cancelRuleCreation();
      });

      it('should default to the create alert action', async () => {
        await testSubjects.existOrFail('messageInput');

        expect(await testSubjects.getAttribute('aliasInput', 'value')).to.eql(defaultAlias);
      });

      it('should default to the close alert action when setting the run when to recovered', async () => {
        await testSubjects.click('addNewActionConnectorActionGroup-0');
        await testSubjects.click('addNewActionConnectorActionGroup-0-option-recovered');

        expect(await testSubjects.getAttribute('aliasInput', 'value')).to.eql(defaultAlias);
        await testSubjects.existOrFail('noteTextArea');
        await testSubjects.missingOrFail('messageInput');
      });

      it('should not preserve the alias when switching run when to recover', async () => {
        await testSubjects.setValue('aliasInput', 'an alias');
        await testSubjects.click('addNewActionConnectorActionGroup-0');
        await testSubjects.click('addNewActionConnectorActionGroup-0-option-recovered');

        await testSubjects.missingOrFail('messageInput');

        expect(await testSubjects.getAttribute('aliasInput', 'value')).to.be(defaultAlias);
      });

      it('should not preserve the alias when switching run when to threshold met', async () => {
        await testSubjects.click('addNewActionConnectorActionGroup-0');
        await testSubjects.click('addNewActionConnectorActionGroup-0-option-recovered');
        await testSubjects.missingOrFail('messageInput');

        await testSubjects.setValue('aliasInput', 'an alias');
        await testSubjects.click('addNewActionConnectorActionGroup-0');
        await testSubjects.click('addNewActionConnectorActionGroup-0-option-threshold met');
        await testSubjects.exists('messageInput');

        expect(await testSubjects.getAttribute('aliasInput', 'value')).to.be(defaultAlias);
      });

      it('should show the message is required error when clicking the save button', async () => {
        await testSubjects.click('saveRuleButton');
        const messageError = await find.byClassName('euiFormErrorText');

        expect(await messageError.getVisibleText()).to.eql('Message is required.');
      });
    });

    const setupRule = async () => {
      const alertName = generateUniqueKey();
      await retry.try(async () => {
        await rules.common.defineIndexThresholdAlert(alertName);
      });

      await rules.common.setNotifyThrottleInput();
    };

    const selectOpsgenieConnectorInRuleAction = async (name: string) => {
      await testSubjects.click('.opsgenie-alerting-ActionTypeSelectOption');
      await testSubjects.selectValue('comboBoxInput', name);
    };

    const createOpsgenieConnector = async (name: string) => {
      return actions.api.createConnector({
        name,
        config: { apiUrl: 'https//test.com' },
        secrets: { apiKey: '1234' },
        connectorTypeId: '.opsgenie',
      });
    };
  });
};
