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
import axios from 'axios';

import expect from '@kbn/expect';
import { getWebhookServer, getSlackServer } from '@kbn/actions-simulators-plugin/server/plugin';
import { Spaces } from '../../../scenarios';
import {
  getUrlPrefix,
  getTestRuleData as getCoreTestRuleData,
  ObjectRemover,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function executionStatusAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('mustacheTemplates', () => {
    const objectRemover = new ObjectRemover(supertest);
    let webhookSimulatorURL: string = '';
    let webhookServer: http.Server;
    let webhookConnector: any;
    let slackSimulatorURL: string = '';
    let slackServer: http.Server;
    let slackConnector: any;

    before(async () => {
      let availablePort: number;

      webhookServer = await getWebhookServer();
      availablePort = await getPort({ port: 9000 });
      webhookServer.listen(availablePort);
      webhookSimulatorURL = `http://localhost:${availablePort}`;
      webhookConnector = await createWebhookConnector(webhookSimulatorURL);

      slackServer = await getSlackServer();
      availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      if (!slackServer.listening) {
        slackServer.listen(availablePort);
      }
      slackSimulatorURL = `http://localhost:${availablePort}`;
      slackConnector = await createSlackConnector(slackSimulatorURL);
    });

    after(async () => {
      await objectRemover.removeAll();
      webhookServer.close();
      slackServer.close();
    });

    describe('escaping', () => {
      it('should handle escapes in webhook', async () => {
        // from x-pack/test/alerting_api_integration/common/plugins/alerts/server/alert_types.ts,
        // const EscapableStrings
        const template = '{{context.escapableDoubleQuote}} -- {{context.escapableLineFeed}}';
        const rule = await createRule({
          id: webhookConnector.id,
          group: 'default',
          params: {
            body: `payload {{rule.id}} - ${template}`,
          },
        });
        const body = await retry.try(async () => waitForActionBody(webhookSimulatorURL, rule.id));
        expect(body).to.be(`\\"double quote\\" -- line\\nfeed`);
      });

      it('should handle escapes in slack', async () => {
        // from x-pack/test/alerting_api_integration/common/plugins/alerts/server/alert_types.ts,
        // const EscapableStrings
        const template =
          '{{context.escapableBacktic}} -- {{context.escapableBold}} -- {{context.escapableBackticBold}} -- {{context.escapableHtml}} -- {{context.escapableLink}}';

        const rule = await createRule({
          id: slackConnector.id,
          group: 'default',
          params: {
            message: `message {{rule.id}} - ${template}`,
          },
        });

        const body = await retry.try(async () => waitForActionBody(slackSimulatorURL, rule.id));
        expect(body).to.be(
          "back'tic -- `*bold*` -- `'*bold*'` -- &lt;&amp;&gt; -- https://te_st.com/"
        );
      });

      it('should handle context variable object expansion', async () => {
        // from x-pack/test/alerting_api_integration/common/plugins/alerts/server/alert_types.ts,
        // const DeepContextVariables
        const template = '{{context.deep}}';
        const rule = await createRule({
          id: slackConnector.id,
          group: 'default',
          params: {
            message: `message {{rule.id}} - ${template}`,
          },
        });
        const body = await retry.try(async () => waitForActionBody(slackSimulatorURL, rule.id));
        expect(body).to.be(
          '{"objectA":{"stringB":"B","arrayC":[{"stringD":"D1","numberE":42},{"stringD":"D2","numberE":43}],"objectF":{"stringG":"G","nullG":null}},"stringH":"H","arrayI":[44,45],"nullJ":null,"dateL":"2023-04-20T04:13:17.858Z"}'
        );
      });

      it('should render kibanaBaseUrl as empty string since not configured', async () => {
        const template = 'kibanaBaseUrl: "{{kibanaBaseUrl}}"';
        const rule = await createRule({
          id: slackConnector.id,
          group: 'default',
          params: {
            message: `message {{rule.id}} - ${template}`,
          },
        });

        const body = await retry.try(async () => waitForActionBody(slackSimulatorURL, rule.id));
        expect(body).to.be('kibanaBaseUrl: ""');
      });

      it('should render action variables in rule action', async () => {
        const rule = await createRule({
          id: webhookConnector.id,
          group: 'default',
          params: {
            body: `payload {{rule.id}} - old id variable: {{alertId}}, new id variable: {{rule.id}}, old name variable: {{alertName}}, new name variable: {{rule.name}}`,
          },
        });

        const body = await retry.try(async () => waitForActionBody(webhookSimulatorURL, rule.id));
        expect(body).to.be(
          `old id variable: ${rule.id}, new id variable: ${rule.id}, old name variable: ${rule.name}, new name variable: ${rule.name}`
        );
      });
    });

    describe('lambdas', () => {
      it('should handle ParseHjson', async () => {
        const template = `{{#ParseHjson}} {
          ruleId:   {{rule.id}}
          ruleName: {{rule.name}}
        } {{/ParseHjson}}`;
        const rule = await createRule({
          id: webhookConnector.id,
          group: 'default',
          params: {
            body: `payload {{rule.id}} - ${template}`,
          },
        });
        const body = await retry.try(async () => waitForActionBody(webhookSimulatorURL, rule.id));
        expect(body).to.be(`{"ruleId":"${rule.id}","ruleName":"testing mustache templates"}`);
      });

      it('should handle asJSON', async () => {
        // from x-pack/test/alerting_api_integration/common/plugins/alerts/server/alert_types.ts,
        // const DeepContextVariables
        const template = `{{#context.deep.objectA}}
          {{{arrayC}}} {{{arrayC.asJSON}}}
        {{/context.deep.objectA}}
        `;
        const rule = await createRule({
          id: webhookConnector.id,
          group: 'default',
          params: {
            body: `payload {{rule.id}} - ${template}`,
          },
        });
        const body = await retry.try(async () => waitForActionBody(webhookSimulatorURL, rule.id));
        const expected1 = `{"stringD":"D1","numberE":42},{"stringD":"D2","numberE":43}`;
        const expected2 = `[{"stringD":"D1","numberE":42},{"stringD":"D2","numberE":43}]`;
        expect(body.trim()).to.be(`${expected1} ${expected2}`);
      });

      it('should handle EvalMath', async () => {
        // from x-pack/test/alerting_api_integration/common/plugins/alerts/server/alert_types.ts,
        // const DeepContextVariables
        const template = `{{#context.deep}}avg({{arrayI.0}}, {{arrayI.1}})/100 => {{#EvalMath}}
          round((arrayI[0] + arrayI[1]) / 2 / 100, 2)
        {{/EvalMath}}{{/context.deep}}`;
        const rule = await createRule({
          id: slackConnector.id,
          group: 'default',
          params: {
            message: `message {{rule.id}} - ${template}`,
          },
        });
        const body = await retry.try(async () => waitForActionBody(slackSimulatorURL, rule.id));
        expect(body).to.be(`avg(44, 45)/100 => 0.45`);
      });

      it('should handle FormatDate', async () => {
        // from x-pack/test/alerting_api_integration/common/plugins/alerts/server/alert_types.ts,
        // const DeepContextVariables
        const template = `{{#context.deep}}{{#FormatDate}}
          {{{dateL}}} ; America/New_York; dddd MMM Do YYYY HH:mm:ss
        {{/FormatDate}}{{/context.deep}}`;
        const rule = await createRule({
          id: slackConnector.id,
          group: 'default',
          params: {
            message: `message {{rule.id}} - ${template}`,
          },
        });
        const body = await retry.try(async () => waitForActionBody(slackSimulatorURL, rule.id));
        expect(body.trim()).to.be(`Thursday Apr 20th 2023 00:13:17`);
      });
    });

    it('should handle FormatNumber', async () => {
      // from x-pack/test/alerting_api_integration/common/plugins/alerts/server/alert_types.ts,
      // const DeepContextVariables
      const template = `{{#context.deep}}{{#FormatNumber}}
        {{{arrayI.1}}}; en-US; style: currency, currency: EUR
      {{/FormatNumber}}{{/context.deep}}`;
      const rule = await createRule({
        id: slackConnector.id,
        group: 'default',
        params: {
          message: `message {{rule.id}} - ${template}`,
        },
      });
      const body = await retry.try(async () => waitForActionBody(slackSimulatorURL, rule.id));
      expect(body.trim()).to.be('€45.00');
    });

    async function createRule(action: any) {
      const ruleResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ actions: [action] }));
      expect(ruleResponse.status).to.eql(200);
      const rule = ruleResponse.body;
      objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

      return rule;
    }

    async function createWebhookConnector(url: string) {
      const createResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'test')
        .send({
          name: 'testing mustache for webhook',
          connector_type_id: '.webhook',
          secrets: {},
          config: {
            headers: {
              'Content-Type': 'text/plain',
            },
            url,
          },
        });
      expect(createResponse.status).to.eql(200);
      const connector = createResponse.body;
      objectRemover.add(Spaces.space1.id, connector.id, 'connector', 'actions');

      return connector;
    }

    async function createSlackConnector(url: string) {
      const createResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'test')
        .send({
          name: 'testing mustache for slack',
          connector_type_id: '.slack',
          secrets: {
            webhookUrl: url,
          },
        });
      expect(createResponse.status).to.eql(200);
      const connector = createResponse.body;
      objectRemover.add(Spaces.space1.id, connector.id, 'connector', 'actions');

      return connector;
    }
  });

  async function waitForActionBody(url: string, id: string): Promise<string> {
    const response = await axios.get<string[]>(url);
    expect(response.status).to.eql(200);

    for (const datum of response.data) {
      const match = datum.match(/^(.*) - ([\S\s]*)$/);
      if (match == null) continue;

      if (match[1] === id) return match[2];
    }

    throw new Error(`no action body posted yet for id ${id}`);
  }
}

function getTestRuleData(overrides: any) {
  const defaults = {
    name: 'testing mustache templates',
    rule_type_id: 'test.patternFiring',
    params: {
      pattern: { instance: [true] },
    },
  };

  return getCoreTestRuleData({ ...overrides, ...defaults });
}
