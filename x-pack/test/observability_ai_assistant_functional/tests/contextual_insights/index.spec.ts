/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import moment from 'moment';
import OpenAI from 'openai';
import {
  createLlmProxy,
  LlmProxy,
} from '../../../observability_ai_assistant_api_integration/common/create_llm_proxy';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ApiTest({ getService, getPageObjects }: FtrProviderContext) {
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const deployment = getService('deployment');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
  const { common } = getPageObjects(['header', 'common']);

  async function createSynthtraceErrors() {
    const start = moment().subtract(5, 'minutes').valueOf();
    const end = moment().valueOf();
    const serviceName = 'opbeans-go';

    const serviceInstance = apm
      .service({ name: serviceName, environment: 'production', agentName: 'go' })
      .instance('instance-a');

    const interval = '1m';
    const documents = [
      timerange(start, end)
        .interval(interval)
        .rate(50)
        .generator((timestamp) =>
          serviceInstance
            .transaction({ transactionName: 'GET /banana' })
            .errors(
              serviceInstance
                .error({ message: 'Some exception', type: 'exception' })
                .timestamp(timestamp)
            )
            .duration(10)
            .timestamp(timestamp)
            .failure()
        ),
    ];

    await apmSynthtraceEsClient.index(documents);
  }

  async function createConnector(proxy: LlmProxy) {
    await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name: 'foo',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: `http://localhost:${proxy.getPort()}`,
          defaultModel: 'gpt-4',
        },
        secrets: { apiKey: 'myApiKey' },
        connector_type_id: '.gen-ai',
      })
      .expect(200);
  }

  async function deleteConnectors() {
    const connectors = await supertest.get('/api/actions/connectors').expect(200);
    const promises = connectors.body.map((connector: { id: string }) => {
      return supertest
        .delete(`/api/actions/connector/${connector.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    });

    return Promise.all(promises);
  }

  async function navigateToError() {
    await common.navigateToApp('apm');
    await browser.get(`${deployment.getHostPort()}/app/apm/services/opbeans-go/errors/`);
    await testSubjects.click('errorGroupId');
  }

  describe('Contextual insights for APM errors', () => {
    before(async () => {
      await Promise.all([
        deleteConnectors(), // cleanup previous connectors
        apmSynthtraceEsClient.clean(), // cleanup previous synthtrace data
      ]);

      await Promise.all([
        createSynthtraceErrors(), // create synthtrace
        ui.auth.login('editor'), // login
      ]);
    });

    after(async () => {
      await Promise.all([
        deleteConnectors(), // cleanup previous connectors
        apmSynthtraceEsClient.clean(), // cleanup synthtrace data
        ui.auth.logout(), // logout
      ]);
    });

    // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/184029
    describe.skip('when there are no connectors', () => {
      it('should not show the contextual insight component', async () => {
        await navigateToError();
        await testSubjects.missingOrFail(ui.pages.contextualInsights.button);
      });
    });

    // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/184071
    describe.skip('when there are connectors', () => {
      let proxy: LlmProxy;

      before(async () => {
        proxy = await createLlmProxy(log);
        await createConnector(proxy);
      });

      after(async () => {
        proxy.close();
      });

      it('should show the contextual insight component on the APM error details page', async () => {
        await navigateToError();

        proxy
          .intercept(
            'conversation',
            (body) => !isFunctionTitleRequest(body),
            'This error is nothing to worry about. Have a nice day!'
          )
          .complete();

        await testSubjects.click(ui.pages.contextualInsights.button);

        await retry.try(async () => {
          const llmResponse = await testSubjects.getVisibleText(ui.pages.contextualInsights.text);
          expect(llmResponse).to.contain('This error is nothing to worry about. Have a nice day!');
        });
      });
    });
  });
}

function isFunctionTitleRequest(body: string) {
  const parsedBody = JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
  return parsedBody.functions?.find((fn) => fn.name === 'title_conversation') !== undefined;
}
