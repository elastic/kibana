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
import { createSlackConnectorAndObjectRemover } from './utils';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const actions = getService('actions');
  const browser = getService('browser');
  let objectRemover: ObjectRemover;

  const createJiraConnector = (name: string) => {
    return actions.api.createConnector({
      name,
      config: { apiUrl: 'https//test.com', projectKey: 'apiKey' },
      secrets: { email: 'test@elastic.co', apiToken: 'changeme' },
      connectorTypeId: '.jira',
    });
  };

  const fillJiraActionForm = async (additionalFields: string) => {
    await testSubjects.setValue('summaryInput', 'Test summary');
    await testSubjects.setValue('kibanaCodeEditor', additionalFields);
    await testSubjects.click('executeActionButton');
  };

  describe('Jira', () => {
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
        const createdAction = await createJiraConnector(connectorName);
        objectRemover.add(createdAction.id, 'action', 'actions');
        await browser.refresh();

        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        const searchResults = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResults).to.eql([
          {
            name: connectorName,
            actionType: 'Jira',
          },
        ]);
      });
    });

    describe('test page', () => {
      let connectorId = '';

      before(async () => {
        const connectorName = generateUniqueKey();
        const createdAction = await createJiraConnector(connectorName);
        connectorId = createdAction.id;
        objectRemover.add(connectorId, 'action', 'actions');
      });

      beforeEach(async () => {
        await pageObjects.common.navigateToApp('triggersActionsConnectors');
        await testSubjects.click(`edit${connectorId}`);
        await testSubjects.click('testConnectorTab');
      });

      afterEach(async () => {
        await actions.common.cancelConnectorForm();
      });

      it('shouldnt throw a type error for other fields when its valid json', async () => {
        await fillJiraActionForm('{ "key": "value" }');
        expect(await testSubjects.getVisibleText('executionFailureResult')).to.not.contain(
          '[subActionParams.incident.otherFields.0]: could not parse record value from json input'
        );
      });

      it('shouldnt throw a type error for other fields when its not valid json', async () => {
        await fillJiraActionForm('{ "no_valid_json" }');
        expect(await testSubjects.getVisibleText('executionFailureResult')).to.contain(
          '[subActionParams.incident.otherFields.0]: could not parse record value from json input'
        );
      });
    });
  });
};
