/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createOpenAIConnector } from './utils/create_openai_connector';
import { MachineLearningCommonAPIProvider } from '../../services/ml/common_api';

import {
  createLlmProxy,
  LlmProxy,
} from '../../../observability_ai_assistant_api_integration/common/create_llm_proxy';

const indexName = 'basic_index';
const esArchiveIndex = 'test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

export default function (ftrContext: FtrProviderContext) {
  const { getService, getPageObjects } = ftrContext;
  const pageObjects = getPageObjects(['common', 'searchPlayground']);
  const commonAPI = MachineLearningCommonAPIProvider(ftrContext);
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const log = getService('log');
  const browser = getService('browser');

  const createIndex = async () => await esArchiver.load(esArchiveIndex);

  let proxy: LlmProxy;
  let removeOpenAIConnector: () => Promise<void>;
  const createConnector = async () => {
    removeOpenAIConnector = await createOpenAIConnector({
      supertest,
      requestHeader: commonAPI.getCommonRequestHeader(),
      proxy,
    });
  };

  describe('Playground', () => {
    before(async () => {
      proxy = await createLlmProxy(log);
      await pageObjects.common.navigateToApp('enterpriseSearchApplications/playground');
    });

    after(async () => {
      await esArchiver.unload(esArchiveIndex);
      proxy.close();
    });

    describe('setup Page', () => {
      it('is loaded successfully', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToDisabled();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundStartChatPageComponentsToExist();
      });

      describe('with gen ai connectors', () => {
        before(async () => {
          await createConnector();
          await browser.refresh();
        });

        after(async () => {
          await removeOpenAIConnector?.();
          await browser.refresh();
        });
        it('hide gen ai panel', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectHideGenAIPanelConnector();
        });
      });

      describe('without gen ai connectors', () => {
        it('should display the set up connectors button', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectAddConnectorButtonExists();
        });

        it('creates a connector successfully', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenConnectorPagePlayground();
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectHideGenAIPanelConnectorAfterCreatingConnector(
            createConnector
          );
        });

        after(async () => {
          await removeOpenAIConnector?.();
          await browser.refresh();
        });
      });

      describe('without any indices', () => {
        it('show no index callout', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectNoIndexCalloutExists();
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectCreateIndexButtonToExists();
        });

        it('hide no index callout when index added', async () => {
          await createIndex();
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectSelectIndex(indexName);
        });

        after(async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.removeIndexFromComboBox();
          await esArchiver.unload(esArchiveIndex);
          await browser.refresh();
        });
      });

      describe('with existing indices', () => {
        before(async () => {
          await createConnector();
          await createIndex();
          await browser.refresh();
        });

        it('dropdown shows up', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectIndicesInDropdown();
        });

        it('can select index from dropdown and navigate to chat window', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectToSelectIndicesAndStartButtonEnabled(
            indexName
          );
        });

        after(async () => {
          await removeOpenAIConnector?.();
          await esArchiver.unload(esArchiveIndex);
          await browser.refresh();
        });
      });
    });

    describe('chat page', () => {
      before(async () => {
        await createConnector();
        await createIndex();
        await browser.refresh();
        await pageObjects.searchPlayground.PlaygroundChatPage.navigateToChatPage(indexName);
      });
      it('loads successfully', async () => {
        await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWindowLoaded();
      });

      describe('chat', () => {
        it('works', async () => {
          const conversationInterceptor = proxy.intercept(
            'conversation',
            (body) =>
              (JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming).tools?.find(
                (fn) => fn.function.name === 'title_conversation'
              ) === undefined
          );

          await pageObjects.searchPlayground.PlaygroundChatPage.sendQuestion();

          const conversationSimulator = await conversationInterceptor.waitForIntercept();

          await conversationSimulator.next('My response');

          await conversationSimulator.complete();

          await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWorks();
          await pageObjects.searchPlayground.PlaygroundChatPage.expectTokenTooltipExists();
        });

        it('open view code', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.expectOpenViewCode();
        });

        it('show fields and code in view query', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.expectViewQueryHasFields();
        });

        it('show edit context', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.expectEditContextOpens();
        });
      });

      after(async () => {
        await removeOpenAIConnector?.();
        await esArchiver.unload(esArchiveIndex);
        await browser.refresh();
      });
    });
  });
}
