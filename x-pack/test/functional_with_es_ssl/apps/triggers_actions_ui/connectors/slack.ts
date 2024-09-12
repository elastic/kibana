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
  const retry = getService('retry');
  const supertest = getService('supertest');
  const actions = getService('actions');
  const rules = getService('rules');
  const toasts = getService('toasts');
  let objectRemover: ObjectRemover;

  describe('Slack', () => {
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

      it('should only show one slack connector', async () => {
        if (await testSubjects.exists('createConnectorButton')) {
          await testSubjects.click('createConnectorButton');
        } else {
          await testSubjects.click('createFirstActionButton');
        }
        await testSubjects.existOrFail('.slack-card');
        const slackApiCardExists = await testSubjects.exists('.slack_api-card');
        expect(slackApiCardExists).to.be(false);
      });

      it('should create the webhook connector', async () => {
        const connectorName = generateUniqueKey();
        await actions.slack.createNewWebhook({
          name: connectorName,
          url: 'https://test.com',
        });

        const toastTitle = await toasts.getTitleAndDismiss();
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

      /* FUTURE ENGINEER
      /* With this https://github.com/elastic/kibana/pull/167150, we added an allowed list of channel IDs
      /* we can not have this test running anymore because this allowed list is required
      /* we will have to figure out how to simulate the slack API through functional/API integration testing
      */
      it.skip('should create the web api connector', async () => {
        const connectorName = generateUniqueKey();
        await actions.slack.createNewWebAPI({
          name: connectorName,
          token: 'supersecrettoken',
        });

        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Created '${connectorName}'`);

        await pageObjects.triggersActionsUI.searchConnectors(connectorName);

        const searchResults = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResults).to.eql([
          {
            name: connectorName,
            actionType: 'Slack API',
          },
        ]);
        const connector = await getConnectorByName(connectorName, supertest);
        objectRemover.add(connector.id, 'action', 'actions');
      });
    });

    describe('rule creation', () => {
      const webhookConnectorName = generateUniqueKey();
      const webApiConnectorName = generateUniqueKey();
      let webApiAction: { id: string };
      let webhookAction: { id: string };

      const setupRule = async () => {
        const ruleName = generateUniqueKey();
        await retry.try(async () => {
          await rules.common.defineIndexThresholdAlert(ruleName);
        });
        return ruleName;
      };

      const getRuleIdByName = async (name: string) => {
        const response = await supertest
          .get(`/api/alerts/_find?search=${name}&search_fields=name`)
          .expect(200);
        return response.body.data[0].id;
      };

      const selectSlackConnectorInRuleAction = async ({ connectorId }: { connectorId: string }) => {
        await testSubjects.click('.slack-alerting-ActionTypeSelectOption'); // "Slack" in connector list
        await testSubjects.click('selectActionConnector-.slack-0');
        await testSubjects.click(`dropdown-connector-${connectorId}`);
      };

      before(async () => {
        webApiAction = await actions.api.createConnector({
          name: webApiConnectorName,
          config: {},
          secrets: { token: 'supersecrettoken' },
          connectorTypeId: '.slack_api',
        });

        webhookAction = await actions.api.createConnector({
          name: webhookConnectorName,
          config: {},
          secrets: { webhookUrl: 'https://test.com' },
          connectorTypeId: '.slack',
        });

        objectRemover.add(webhookAction.id, 'action', 'actions');
        objectRemover.add(webApiAction.id, 'action', 'actions');
        await pageObjects.common.navigateToApp('triggersActions');
      });

      it('should save webhook type slack connectors', async () => {
        const ruleName = await setupRule();

        await selectSlackConnectorInRuleAction({
          connectorId: webhookAction.id,
        });
        await testSubjects.click('saveRuleButton');
        await pageObjects.triggersActionsUI.searchAlerts(ruleName);

        const ruleId = await getRuleIdByName(ruleName);
        objectRemover.add(ruleId, 'rule', 'alerting');

        const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(searchResults).to.eql([
          {
            duration: '00:00',
            interval: '1 min',
            name: `${ruleName}Index threshold`,
            tags: '',
          },
        ]);

        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Created rule "${ruleName}"`);
      });

      /* FUTURE ENGINEER
      /* With this https://github.com/elastic/kibana/pull/167150, we added an allowed list of channel IDs
      /* we can not have this test running anymore because this allowed list is required
      /* we will have to figure out how to simulate the slack API through functional/API integration testing
      */
      it.skip('should save webapi type slack connectors', async () => {
        await setupRule();
        await selectSlackConnectorInRuleAction({
          connectorId: webApiAction.id,
        });

        await testSubjects.click('saveRuleButton');

        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql('Failed to retrieve Slack channels list');

        // We are not saving the rule yet as we currently have no way
        // to mock the internal request that loads the channels list
        // uncomment once we have a way to mock the request

        // const ruleName = await setupRule();
        // await selectSlackConnectorInRuleAction({
        //   connectorId: webApiAction.id,
        // });

        // await testSubjects.click('saveRuleButton');
        // await pageObjects.triggersActionsUI.searchAlerts(ruleName);

        // const ruleId = await getRuleIdByName(ruleName);
        // objectRemover.add(ruleId, 'rule', 'alerting');

        // const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
        // expect(searchResults).to.eql([
        //   {
        //     duration: '00:00',
        //     interval: '1 min',
        //     name: `${ruleName}Index threshold`,
        //     tags: '',
        //   },
        // ]);
        // const toastTitle = await toasts.getTitleAndDismiss();
        // expect(toastTitle).to.eql(`Created rule "${ruleName}"`);
      });
    });
  });
};
