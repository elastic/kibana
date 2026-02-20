/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import { testHasEmbeddedConsole } from '../embedded_console';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../services';
import { createOpenAIConnector } from './utils/create_openai_connector';
import type { LlmProxy } from './utils/create_llm_proxy';
import { createLlmProxy } from './utils/create_llm_proxy';

const esArchiveIndex =
  'src/platform/test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'searchPlayground',
    'embeddedConsole',
    'solutionNavigation',
    'svlSearchCreateIndexPage',
  ]);
  const svlSearchNavigation = getService('svlSearchNavigation');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const createIndex = async () => await esArchiver.load(esArchiveIndex);
  const deleteIndex = async () => await esArchiver.unload(esArchiveIndex);

  let roleAuthc: RoleCredentials;

  describe('Serverless Playground Overview', function () {
    // see details: https://github.com/elastic/kibana/issues/183893
    this.tags(['failsOnMKI']);

    let removeOpenAIConnector: () => Promise<void>;
    let createOpenaiConnector: () => Promise<void>;
    let proxy: LlmProxy;
    const openaiConnectorName = 'test-openai-connector';
    const indexName = 'my-test-index';

    before(async () => {
      proxy = await createLlmProxy(log);
      await pageObjects.svlCommonPage.loginWithRole('admin');

      const requestHeader = svlCommonApi.getInternalRequestHeader();
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      createOpenaiConnector = async () => {
        removeOpenAIConnector = await createOpenAIConnector({
          supertest: supertestWithoutAuth,
          requestHeader,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          proxy,
        });
      };
    });
    beforeEach(async () => {
      await svlSearchNavigation.navigateToSearchPlayground();
    });

    after(async () => {
      try {
        await removeOpenAIConnector?.();
      } catch {
        // we can ignore  if this fails
      }
      await deleteIndex();
      proxy.close();
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('setup chat experience', () => {
      it('setup page is loaded successfully', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToDisabled();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundStartChatPageComponentsToExist();
      });

      describe('with existing LLM connectors', () => {
        before(async () => {
          await createOpenaiConnector();
          await browser.refresh();
        });

        after(async () => {
          await removeOpenAIConnector?.();
          await browser.refresh();
        });
        it('should show success llm button', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectShowSuccessLLMText();
        });
      });

      describe('without existing LLM connectors', () => {
        after(async () => {
          await svlSearchNavigation.navigateToLandingPage();

          await pageObjects.solutionNavigation.sidenav.clickLink({ navId: 'admin_and_settings' });
          await pageObjects.svlCommonNavigation.sidenav.clickPanelLink(
            'management:triggersActionsConnectors'
          );
          await pageObjects.searchPlayground.PlaygroundStartChatPage.deleteConnector(
            openaiConnectorName
          );

          await browser.refresh();
        });
        it('should be able to set up connectors from flyout', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.clickConnectLLMButton();
          await pageObjects.searchPlayground.PlaygroundStartChatPage.createConnectorFlyoutIsVisible();
          await pageObjects.searchPlayground.PlaygroundStartChatPage.createOpenAiConnector(
            openaiConnectorName
          );
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectShowSuccessLLMText();
        });
      });

      describe('with existing indices', () => {
        before(async () => {
          await createOpenaiConnector();
          await createIndex();
        });

        beforeEach(async () => {
          await pageObjects.searchPlayground.session.setSession();
          await browser.refresh();
        });

        it('load start page after selecting index', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectToSelectIndicesAndLoadChat();
          await deleteIndex();
          await browser.refresh();
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectCreateIndexButtonToExists();
        });

        after(async () => {
          await removeOpenAIConnector?.();
          await deleteIndex();
          await browser.refresh();
        });
      });

      describe('when selecting indices with no fields should show error in add data flyout', () => {
        before(async () => {
          await es.indices.create({ index: indexName });
        });
        after(async () => {
          await esDeleteAllIndices(indexName);
        });
        it('selecting index with no fields should show error', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectSelectingIndicesWithNoFieldtoShowError();
        });
      });

      describe('without any indices', () => {
        describe('create index from API', () => {
          it('show create index button', async () => {
            await pageObjects.searchPlayground.PlaygroundStartChatPage.expectCreateIndexButtonToExists();
          });
          it('add data source and creating an LLM should show chat start page', async () => {
            await createOpenaiConnector();
            await browser.refresh();
            await createIndex();
            await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenFlyoutAndSelectIndex();
            await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWindowLoaded();
          });
          after(async () => {
            await deleteIndex();
            await removeOpenAIConnector?.();
            await browser.refresh();
          });
        });
        describe('create index from UI', () => {
          after(async () => {
            await esDeleteAllIndices(indexName);
            await removeOpenAIConnector?.();
            await browser.refresh();
          });
          it('should be able to create index from UI', async () => {
            await pageObjects.searchPlayground.PlaygroundStartChatPage.expectCreateIndexButtonToExists();
            await pageObjects.searchPlayground.PlaygroundStartChatPage.clickCreateIndex();
            await pageObjects.svlSearchCreateIndexPage.expectToBeOnCreateIndexPage();
            await pageObjects.searchPlayground.PlaygroundStartChatPage.setIndexNameValue(indexName);
            await pageObjects.searchPlayground.PlaygroundStartChatPage.expectCreateIndexButtonToBeEnabled();
            await pageObjects.searchPlayground.PlaygroundStartChatPage.clickCreateIndexButton();
            await pageObjects.searchPlayground.PlaygroundStartChatPage.expectToBeOnIndexDetailsPage();

            // add mapping
            await es.indices.putMapping({
              index: indexName,
              properties: {
                text: {
                  type: 'text',
                },
              },
            });

            await svlSearchNavigation.navigateToSearchPlayground();
          });

          it('add data source and creating an LLM should show chat start page', async () => {
            await createOpenaiConnector();
            await browser.refresh();
            await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenFlyoutAndSelectIndex();
            await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWindowLoaded();
          });
        });
      });
    });

    describe('chat page', () => {
      before(async () => {
        await createOpenaiConnector();
        await createIndex();
        await browser.refresh();
        await pageObjects.searchPlayground.session.clearSession();
        await pageObjects.searchPlayground.PlaygroundChatPage.navigateToChatPage();
      });
      it('loads successfully', async () => {
        await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWindowLoaded();
      });

      describe('chat', () => {
        it('can send question and start chat ', async () => {
          const conversationInterceptor = proxy.intercept(
            'conversation',
            (body) =>
              (JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming).tools?.find(
                (fn) => fn.function.name === 'title_conversation'
              ) === undefined
          );

          await pageObjects.searchPlayground.session.expectSession();

          await pageObjects.searchPlayground.PlaygroundChatPage.sendQuestion();

          const conversationSimulator = await conversationInterceptor.waitForIntercept();

          await conversationSimulator.next('My response');

          await conversationSimulator.complete();

          await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWorks();
          await pageObjects.searchPlayground.PlaygroundChatPage.expectTokenTooltipExists();
          await pageObjects.searchPlayground.PlaygroundChatPage.expectCanRegenerateQuestion();
          await pageObjects.searchPlayground.PlaygroundChatPage.clearChat();
        });
        it('can toggle to include or remove citations', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.expectCanChangeCitations();
        });
        it('can change number of documents', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.expectCanChangeNumberOfDocumentsSent();
        });

        it('open view code', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.expectOpenViewCode();
        });

        it('can edit context', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.openChatMode();
          await pageObjects.searchPlayground.PlaygroundChatPage.expectEditContextOpens(
            'basic_index',
            ['bar', 'baz', 'baz.keyword', 'foo', 'nestedField', 'nestedField.child']
          );
          await pageObjects.searchPlayground.PlaygroundChatPage.editContext(
            'basic_index',
            'nestedField.child'
          );
        });

        it('save selected fields between modes', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.expectSaveFieldsBetweenModes();
        });

        it('show fields and code in view query', async () => {
          await pageObjects.searchPlayground.PlaygroundQueryPage.openQueryMode();
          await pageObjects.searchPlayground.PlaygroundQueryPage.expectViewQueryHasFields();
        });

        it('allows running the elasticsearch query', async () => {
          await pageObjects.searchPlayground.PlaygroundQueryPage.openQueryMode();
          await pageObjects.searchPlayground.PlaygroundQueryPage.setQueryModeQuestion('hello');
          await pageObjects.searchPlayground.PlaygroundQueryPage.expectCanRunQuery();
          await pageObjects.searchPlayground.PlaygroundQueryPage.expectQueryModeResultsContains(
            '"took":'
          );
        });

        it('allows user to edit the elasticsearch query', async () => {
          await pageObjects.searchPlayground.PlaygroundQueryPage.openQueryMode();
          const newQuery = `{"query":{"multi_match":{"query":"{query}","fields":["baz"]}}}`;
          await pageObjects.searchPlayground.PlaygroundQueryPage.expectCanEditElasticsearchQuery(
            newQuery
          );
          await pageObjects.searchPlayground.PlaygroundQueryPage.resetElasticsearchQuery();
          await pageObjects.searchPlayground.PlaygroundQueryPage.expectQueryCodeToBe(
            '{\n"retriever":{\n"standard":{\n"query":{\n"multi_match":{\n"query":"{query}",\n"fields":[\n"baz"\n]\n}\n}\n}\n}\n}'
          );
        });

        it('loads a session from localstorage', async () => {
          await pageObjects.searchPlayground.session.setSession();
          await browser.refresh();
          await pageObjects.searchPlayground.PlaygroundChatPage.navigateToChatPage();
          await pageObjects.searchPlayground.PlaygroundChatPage.expectPromptToBe(
            'You are a fireman in london that helps answering question-answering tasks.'
          );
        });

        it("saves a session to localstorage when it's updated", async () => {
          await pageObjects.searchPlayground.session.setSession();
          await browser.refresh();
          await pageObjects.searchPlayground.PlaygroundChatPage.navigateToChatPage();
          await pageObjects.searchPlayground.PlaygroundChatPage.updatePrompt("You're a doctor");
          await pageObjects.searchPlayground.PlaygroundChatPage.updateQuestion('i have back pain');
          // wait for session debounce before trying to load new session state.
          await retry.try(
            async () => {
              await pageObjects.searchPlayground.session.expectInSession(
                'prompt',
                "You're a doctor"
              );
              await pageObjects.searchPlayground.session.expectInSession('question', undefined);
            },
            undefined,
            200
          );
        });

        it('click on manage connector button', async () => {
          await pageObjects.searchPlayground.PlaygroundChatPage.clickManageButton();
        });
      });

      after(async () => {
        await removeOpenAIConnector?.();
        await deleteIndex();
        await browser.refresh();
      });
    });

    it('has embedded console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });

    describe('connectors enabled on serverless search', () => {
      it('has all LLM connectors', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.clickConnectLLMButton();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.createConnectorFlyoutIsVisible();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundLLMConnectorOptionsExists();
      });
    });
  });
}
