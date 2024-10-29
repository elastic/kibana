/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  tinesAgentWebhook,
  tinesStory1,
} from '@kbn/actions-simulators-plugin/server/tines_simulation';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';
import { generateUniqueKey } from '../../../lib/get_test_data';
import { getConnectorByName } from './utils';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const find = getService('find');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const actions = getService('actions');
  const browser = getService('browser');
  const comboBox = getService('comboBox');
  const toasts = getService('toasts');
  let objectRemover: ObjectRemover;
  let simulatorUrl: string;

  // isEnabled helper uses "disabled" attribute, testSubjects.isEnabled() gives inconsistent results for comboBoxes.
  const isEnabled = async (selector: string) =>
    testSubjects.getAttribute(selector, 'disabled').then((disabled) => disabled !== 'true');

  describe('Tines', () => {
    before(async () => {
      objectRemover = new ObjectRemover(supertest);
      simulatorUrl = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.TINES)
      );
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

        await actions.tines.createNewConnector({
          name: connectorName,
          url: 'https://test.tines.com',
          email: 'test@foo.com',
          token: 'apiToken',
        });

        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Created '${connectorName}'`);

        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        const searchResults = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResults).to.eql([
          {
            name: connectorName,
            actionType: 'Tines',
          },
        ]);
        const connector = await getConnectorByName(connectorName, supertest);
        objectRemover.add(connector.id, 'connector', 'actions');
      });

      it('should edit the connector', async () => {
        const connectorName = generateUniqueKey();
        const updatedConnectorName = `${connectorName}updated`;
        const createdAction = await createTinesConnector(connectorName);
        objectRemover.add(createdAction.id, 'connector', 'actions');
        await browser.refresh();

        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResultsBeforeEdit.length).to.eql(1);

        await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');
        await actions.tines.updateConnectorFields({
          name: updatedConnectorName,
          url: 'https://test.tines.com',
          email: 'test@foo.com',
          token: 'apiToken',
        });

        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Updated '${updatedConnectorName}'`);

        await testSubjects.click('euiFlyoutCloseButton');
        await pageObjects.triggersActionsUI.searchConnectors(updatedConnectorName);

        const searchResultsAfterEdit = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResultsAfterEdit).to.eql([
          {
            name: updatedConnectorName,
            actionType: 'Tines',
          },
        ]);
      });

      it('should reset connector when canceling an edit', async () => {
        const connectorName = generateUniqueKey();
        const createdAction = await createTinesConnector(connectorName);
        objectRemover.add(createdAction.id, 'connector', 'actions');
        await browser.refresh();

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

      it('should disable the run button when the fields are not filled', async () => {
        const connectorName = generateUniqueKey();
        const createdAction = await createTinesConnector(connectorName);
        objectRemover.add(createdAction.id, 'connector', 'actions');
        await browser.refresh();

        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResultsBeforeEdit.length).to.eql(1);

        await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

        await find.clickByCssSelector('[data-test-subj="testConnectorTab"]');

        expect(await isEnabled('executeActionButton')).to.be(false);
      });

      describe('test page', () => {
        let connectorId = '';

        before(async () => {
          const connectorName = generateUniqueKey();
          const createdAction = await createTinesConnector(connectorName);
          connectorId = createdAction.id;
          objectRemover.add(createdAction.id, 'connector', 'actions');
        });

        beforeEach(async () => {
          await testSubjects.click(`edit${connectorId}`);
          await testSubjects.click('testConnectorTab');
        });

        afterEach(async () => {
          await actions.common.cancelConnectorForm();
        });

        it('should show the selectors and json editor when in test mode', async () => {
          await testSubjects.existOrFail('tines-storySelector');
          await testSubjects.existOrFail('tines-webhookSelector');
          await find.existsByCssSelector('.monaco-editor');
        });

        it('should enable story selector when it is loaded', async () => {
          await retry.waitFor('stories to load values', async () =>
            isEnabled('tines-storySelector')
          );
          expect(await isEnabled('tines-storySelector')).to.be(true);
          expect(await isEnabled('tines-webhookSelector')).to.be(false);
        });

        it('should enable webhook selector when story selected', async () => {
          await retry.waitFor('stories to load values', async () =>
            isEnabled('tines-storySelector')
          );
          await comboBox.set('tines-storySelector', tinesStory1.name);

          await retry.waitFor('webhooks to load values', async () =>
            isEnabled('tines-webhookSelector')
          );
        });

        it('should reset webhook selector when selected story changed', async () => {
          await retry.waitFor('stories to load values', async () =>
            isEnabled('tines-storySelector')
          );
          await comboBox.set('tines-storySelector', tinesStory1.name);

          await retry.waitFor('webhooks to load values', async () =>
            isEnabled('tines-webhookSelector')
          );
          await comboBox.set('tines-webhookSelector', tinesAgentWebhook.name);

          expect(await comboBox.getComboBoxSelectedOptions('tines-webhookSelector')).to.contain(
            tinesAgentWebhook.name
          );

          await comboBox.clear('tines-storySelector');

          await retry.waitFor('webhooks to be disabled', async () =>
            isEnabled('tines-webhookSelector').then((enabled) => !enabled)
          );
          expect(await comboBox.getComboBoxSelectedOptions('tines-webhookSelector')).to.be.empty();
        });

        it('should have run button disabled if selectors have value but JSON missing', async () => {
          await retry.waitFor('stories to load values', async () =>
            isEnabled('tines-storySelector')
          );
          await comboBox.set('tines-storySelector', tinesStory1.name);

          await retry.waitFor('webhooks to load values', async () =>
            isEnabled('tines-webhookSelector')
          );
          await comboBox.set('tines-webhookSelector', tinesAgentWebhook.name);

          expect(await isEnabled('executeActionButton')).to.be(false);
        });

        it('should run successfully if selectors and JSON have value', async () => {
          await retry.waitFor('stories to load values', async () =>
            isEnabled('tines-storySelector')
          );
          await comboBox.set('tines-storySelector', tinesStory1.name);

          await retry.waitFor('webhooks to load values', async () =>
            testSubjects.isEnabled('tines-webhookSelector')
          );
          await comboBox.set('tines-webhookSelector', tinesAgentWebhook.name);

          await actions.tines.setJsonEditor({
            hello: 'tines',
          });

          expect(await isEnabled('executeActionButton')).to.be(true);
          await testSubjects.click('executeActionButton');

          await retry.waitFor('success message', async () =>
            testSubjects.exists('executionSuccessfulResult')
          );
        });
      });
    });

    const createTinesConnector = async (name: string) => {
      return actions.api.createConnector({
        name,
        config: { url: simulatorUrl },
        secrets: { email: 'test@foo.com', token: 'apiToken' },
        connectorTypeId: '.tines',
      });
    };
  });
};
