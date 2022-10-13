/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * These tests ensure that the per-action mustache template escaping works
 * for actions we have simulators for.  It arranges to have an alert that
 * schedules an action that will contain "escapable" characters in it, and
 * then validates that the simulator receives the escaped versions.
 */

import http from 'http';
import getPort from 'get-port';
import { URL, format as formatUrl } from 'url';
import axios from 'axios';

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  getWebhookServer,
  getSlackServer,
} from '../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function executionStatusAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('mustacheTemplates', () => {
    const objectRemover = new ObjectRemover(supertest);
    let webhookSimulatorURL: string = '';
    let webhookServer: http.Server;
    let slackSimulatorURL: string = '';
    let slackServer: http.Server;

    before(async () => {
      let availablePort: number;

      webhookServer = await getWebhookServer();
      availablePort = await getPort({ port: 9000 });
      webhookServer.listen(availablePort);
      webhookSimulatorURL = `http://localhost:${availablePort}`;

      slackServer = await getSlackServer();
      availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      if (!slackServer.listening) {
        slackServer.listen(availablePort);
      }
      slackSimulatorURL = `http://localhost:${availablePort}`;
    });

    after(async () => {
      await objectRemover.removeAll();
      webhookServer.close();
      slackServer.close();
    });

    it('should handle escapes in webhook', async () => {
      const url = formatUrl(new URL(webhookSimulatorURL), { auth: false });
      const actionResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'test')
        .send({
          name: 'testing mustache escapes for webhook',
          connector_type_id: '.webhook',
          secrets: {},
          config: {
            headers: {
              'Content-Type': 'text/plain',
            },
            url,
          },
        });
      expect(actionResponse.status).to.eql(200);
      const createdAction = actionResponse.body;
      objectRemover.add(Spaces.space1.id, createdAction.id, 'connector', 'actions');

      // from x-pack/test/alerting_api_integration/common/fixtures/plugins/alerts/server/alert_types.ts,
      // const EscapableStrings
      const varsTemplate = '{{context.escapableDoubleQuote}} -- {{context.escapableLineFeed}}';

      const alertResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'testing variable escapes for webhook',
            rule_type_id: 'test.patternFiring',
            params: {
              pattern: { instance: [true] },
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {
                  body: `payload {{alertId}} - ${varsTemplate}`,
                },
              },
            ],
          })
        );
      expect(alertResponse.status).to.eql(200);
      const createdAlert = alertResponse.body;
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const body = await retry.try(async () =>
        waitForActionBody(webhookSimulatorURL, createdAlert.id)
      );
      expect(body).to.be(`\\"double quote\\" -- line\\nfeed`);
    });

    it('should handle escapes in slack', async () => {
      const actionResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'test')
        .send({
          name: "testing backtic'd mustache escapes for slack",
          connector_type_id: '.slack',
          secrets: {
            webhookUrl: slackSimulatorURL,
          },
        });
      expect(actionResponse.status).to.eql(200);
      const createdAction = actionResponse.body;
      objectRemover.add(Spaces.space1.id, createdAction.id, 'connector', 'actions');

      // from x-pack/test/alerting_api_integration/common/fixtures/plugins/alerts/server/alert_types.ts,
      // const EscapableStrings
      const varsTemplate =
        '{{context.escapableBacktic}} -- {{context.escapableBold}} -- {{context.escapableBackticBold}} -- {{context.escapableHtml}}';

      const alertResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'testing variable escapes for slack',
            rule_type_id: 'test.patternFiring',
            params: {
              pattern: { instance: [true] },
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {
                  message: `message {{alertId}} - ${varsTemplate}`,
                },
              },
            ],
          })
        );
      expect(alertResponse.status).to.eql(200);
      const createdAlert = alertResponse.body;
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const body = await retry.try(async () =>
        waitForActionBody(slackSimulatorURL, createdAlert.id)
      );
      expect(body).to.be("back'tic -- `*bold*` -- `'*bold*'` -- &lt;&amp;&gt;");
    });

    it('should handle context variable object expansion', async () => {
      const actionResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'test')
        .send({
          name: 'testing context variable expansion',
          connector_type_id: '.slack',
          secrets: {
            webhookUrl: slackSimulatorURL,
          },
        });
      expect(actionResponse.status).to.eql(200);
      const createdAction = actionResponse.body;
      objectRemover.add(Spaces.space1.id, createdAction.id, 'connector', 'actions');

      // from x-pack/test/alerting_api_integration/common/fixtures/plugins/alerts/server/alert_types.ts,
      // const DeepContextVariables
      const varsTemplate = '{{context.deep}}';

      const alertResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'testing context variable expansion',
            rule_type_id: 'test.patternFiring',
            params: {
              pattern: { instance: [true, true] },
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {
                  message: `message {{alertId}} - ${varsTemplate}`,
                },
              },
            ],
          })
        );
      expect(alertResponse.status).to.eql(200);
      const createdAlert = alertResponse.body;
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const body = await retry.try(async () =>
        waitForActionBody(slackSimulatorURL, createdAlert.id)
      );
      expect(body).to.be(
        '{"objectA":{"stringB":"B","arrayC":[{"stringD":"D1","numberE":42},{"stringD":"D2","numberE":43}],"objectF":{"stringG":"G","nullG":null}},"stringH":"H","arrayI":[44,45],"nullJ":null}'
      );
    });

    it('should render kibanaBaseUrl as empty string since not configured', async () => {
      const actionResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'test')
        .send({
          name: 'testing context variable expansion',
          connector_type_id: '.slack',
          secrets: {
            webhookUrl: slackSimulatorURL,
          },
        });
      expect(actionResponse.status).to.eql(200);
      const createdAction = actionResponse.body;
      objectRemover.add(Spaces.space1.id, createdAction.id, 'connector', 'actions');

      const varsTemplate = 'kibanaBaseUrl: "{{kibanaBaseUrl}}"';

      const alertResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'testing context variable kibanaBaseUrl',
            rule_type_id: 'test.patternFiring',
            params: {
              pattern: { instance: [true, true] },
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {
                  message: `message {{alertId}} - ${varsTemplate}`,
                },
              },
            ],
          })
        );
      expect(alertResponse.status).to.eql(200);
      const createdAlert = alertResponse.body;
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const body = await retry.try(async () =>
        waitForActionBody(slackSimulatorURL, createdAlert.id)
      );
      expect(body).to.be('kibanaBaseUrl: ""');
    });

    it('should render action variables in rule action', async () => {
      const url = formatUrl(new URL(webhookSimulatorURL), { auth: false });
      const actionResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'test')
        .send({
          name: 'testing action variable rendering',
          connector_type_id: '.webhook',
          secrets: {},
          config: {
            headers: {
              'Content-Type': 'text/plain',
            },
            url,
          },
        });
      expect(actionResponse.status).to.eql(200);
      const createdAction = actionResponse.body;
      objectRemover.add(Spaces.space1.id, createdAction.id, 'connector', 'actions');

      const alertResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'testing variable escapes for webhook',
            rule_type_id: 'test.patternFiring',
            params: {
              pattern: { instance: [true] },
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {
                  body: `payload {{rule.id}} - old id variable: {{alertId}}, new id variable: {{rule.id}}, old name variable: {{alertName}}, new name variable: {{rule.name}}`,
                },
              },
            ],
          })
        );
      expect(alertResponse.status).to.eql(200);
      const createdAlert = alertResponse.body;
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const body = await retry.try(async () =>
        waitForActionBody(webhookSimulatorURL, createdAlert.id)
      );
      expect(body).to.be(
        `old id variable: ${createdAlert.id}, new id variable: ${createdAlert.id}, old name variable: ${createdAlert.name}, new name variable: ${createdAlert.name}`
      );
    });
  });

  async function waitForActionBody(url: string, id: string): Promise<string> {
    const response = await axios.get<string[]>(url);
    expect(response.status).to.eql(200);

    for (const datum of response.data) {
      const match = datum.match(/^(.*) - (.*)$/);
      if (match == null) continue;

      if (match[1] === id) return match[2];
    }

    throw new Error(`no action body posted yet for id ${id}`);
  }
}
