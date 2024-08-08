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
import { deleteConnectors, createConnector } from '../../common/connectors';

export default function ApiTest({ getService, getPageObjects }: FtrProviderContext) {
  const ui = getService('observabilityAIAssistantUI');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const log = getService('log');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
  const { header, common } = getPageObjects(['header', 'common']);

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
                .error({
                  message: 'Some exception',
                  type: 'exception',
                  groupingKey: 'some-expection-key',
                })
                .timestamp(timestamp)
            )
            .duration(10)
            .timestamp(timestamp)
            .failure()
        ),
    ];

    await apmSynthtraceEsClient.index(documents);
  }

  async function navigateToError() {
    await common.navigateToUrl('apm', 'services/opbeans-go/errors/some-expection-key', {
      shouldUseHashForSubUrl: false,
    });
    await header.waitUntilLoadingHasFinished();
  }

  // open contextual insights component and ensure it was opened
  async function openContextualInsights() {
    await retry.tryForTime(5 * 1000, async () => {
      await testSubjects.click(ui.pages.contextualInsights.button);
      const isOpen =
        (await (
          await find.byCssSelector(`[aria-controls="${ui.pages.contextualInsights.container}"]`)
        ).getAttribute('aria-expanded')) === 'true';
      expect(isOpen).to.be(true);
    });
  }

  describe('Contextual insights for APM errors', () => {
    before(async () => {
      await Promise.all([
        deleteConnectors(supertest), // cleanup previous connectors
        apmSynthtraceEsClient.clean(), // cleanup previous synthtrace data
      ]);

      await Promise.all([
        createSynthtraceErrors(), // create synthtrace
        ui.auth.login('editor'), // login
      ]);
    });

    after(async () => {
      await Promise.all([
        deleteConnectors(supertest), // cleanup previous connectors
        apmSynthtraceEsClient.clean(), // cleanup synthtrace data
        ui.auth.logout(), // logout
      ]);
    });

    describe('when there are no connectors', () => {
      it('should not show the contextual insight component', async () => {
        await navigateToError();
        await testSubjects.missingOrFail(ui.pages.contextualInsights.button);
      });
    });

    describe('when there are connectors', () => {
      let proxy: LlmProxy;

      before(async () => {
        proxy = await createLlmProxy(log);
        await createConnector(proxy, supertest);
      });

      after(async () => {
        proxy.close();
      });

      it('should show the contextual insight component on the APM error details page', async () => {
        await navigateToError();

        const interceptor = proxy.intercept(
          'conversation',
          (body) => !isFunctionTitleRequest(body),
          'This error is nothing to worry about. Have a nice day!'
        );

        await openContextualInsights();

        await interceptor.completeAfterIntercept();

        await retry.tryForTime(5 * 1000, async () => {
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
