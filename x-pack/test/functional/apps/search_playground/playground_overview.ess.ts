/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import expect from '@kbn/expect';
import type OpenAI from 'openai';
import { FtrProviderContext } from '../../ftr_provider_context';
// import { createOpenAIConnector } from './utils/create_openai_connector';
// import { MachineLearningCommonAPIProvider } from '../../services/ml/common_api';

import {
  createLlmProxy,
  LlmProxy,
} from '../../../observability_ai_assistant_api_integration/common/create_llm_proxy';

const indexName = 'basic_index';
const esArchiveIndex = 'test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

export default function (ftrContext: FtrProviderContext) {
  const { getService, getPageObjects } = ftrContext;
  const pageObjects = getPageObjects(['common', 'searchPlayground']);
  // const commonAPI = MachineLearningCommonAPIProvider(ftrContext);
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const log = getService('log');

  const createIndex = async () => await esArchiver.load(esArchiveIndex);

  async function deleteConnectors() {
    const response = await supertest.get('/api/actions/connectors').expect(200);
    for (const connector of response.body) {
      if (connector.connector_type_id === '.gen-ai') {
        await supertest
          .delete(`/api/actions/connector/${connector.id}`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      }
    }
  }

  describe('Playground', () => {
    let proxy: LlmProxy;
    before(async () => {
      await deleteConnectors();
      proxy = await createLlmProxy(log);
      await pageObjects.common.navigateToApp('enterpriseSearchApplications/playground');
    });

    after(async () => {
      await esArchiver.unload(esArchiveIndex);
      await deleteConnectors();
      proxy.close();
      // await removeOpenAIConnector?.();
    });

    describe('setup Page', () => {
      it('is loaded successfully', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundStartChatPageComponentsToExist();
      });

      describe('without gen ai connectors', () => {
        it('should display the set up connectors button', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectAddConnectorButtonExists();
        });

        it('creates a connector successfully', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenConnectorPagePlayground();
          await pageObjects.searchPlayground.PlaygroundStartChatPage.createOpenAIConnector(proxy);
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectAddedConnectorCallout();
        });
      });

      describe('with gen ai connectors', () => {
        it('hide gen ai panel', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectHideGenAIPanelConnector();
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
      });

      describe('with existing indices', () => {
        it('dropdown shows up', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectIndicesInDropdown();
        });

        it('can select index from dropdown and navigate to chat window', async () => {
          await pageObjects.searchPlayground.PlaygroundStartChatPage.expectToSelectIndicesAndStartButtonEnabled(
            indexName
          );
        });
      });
    });

    describe('chat page', () => {
      it('loads successfully', async () => {
        await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWindowLoaded();
      });

      describe('chat', () => {
        it('works', async () => {
          const titleInterceptor = proxy.intercept(
            'title',
            (body) =>
              (JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming).tools?.find(
                (fn) => fn.function.name === 'title_conversation'
              ) !== undefined
          );

          const conversationInterceptor = proxy.intercept(
            'conversation',
            (body) =>
              (JSON.parse(body) as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming).tools?.find(
                (fn) => fn.function.name === 'title_conversation'
              ) === undefined
          );

          await pageObjects.searchPlayground.PlaygroundChatPage.sendQuestion();

          const [conversationSimulator] = await Promise.all([
            // titleInterceptor.waitForIntercept(),
            conversationInterceptor.waitForIntercept(),
          ]);

          await conversationSimulator.next('My response');

          await conversationSimulator.complete();

          await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWorks();
        });
      });
    });
  });
}

// before(async () => {

//   // await titleSimulator.next('My title');

//   // await titleSimulator.complete();

//   // await header.waitUntilLoadingHasFinished();
// });

// await testSubjects.setValue(ui.pages.conversations.chatInput, 'hello');

// await testSubjects.pressEnter(ui.pages.conversations.chatInput);

// const response = await supertest
//   .post('/internal/search_playground/chat')
//   .set(commonAPI.getCommonRequestHeader())
//   .send({
//     data: {
//       citations: true,
//       connector_id: 'random_id',
//       doc_size: 3,
//       elasticsearch_query:
//         '{"retriever":{"rrf":{"retrievers":[{"standard":{"query":{"multi_match":{"query":"{query}","fields":["title"]}}}},{"standard":{"query":{"text_expansion":{"vector.tokens":{"model_id":".elser_model_2","model_text":"{query}"}}}}}]}}}',
//       indices: 'basic_index',
//       prompt: 'You are an assistant for question-answering tasks.',
//       source_fields: '{"basic_index":["text"]}',
//       summarization_model: 'gpt-3.5-turbo',
//     },
//     messages: [
//       {
//         role: 'human',
//         content: 'chat',
//       },
//     ],
//   });
// console.log('responses', response);
// expect(response.body.conversations.length).to.eql(2);
// expect(response.body.conversations[0].conversation.title).to.be('My title');

// let removeOpenAIConnector: () => Promise<void>;
// const createConnector = async () => {
//   removeOpenAIConnector = await createOpenAIConnector({
//     supertest,
//     requestHeader: commonAPI.getCommonRequestHeader(),
//   });
// };

// describe('Playground Overview', () => {
//   let proxy: LlmProxy;
//   before(async () => {
//     // await deleteConnectors();
//     proxy = await createLlmProxy(log);
//     await pageObjects.common.navigateToApp('enterpriseSearchApplications/playground');
//   });

//   after(async () => {
//     await esArchiver.unload(esArchiveIndex);
//     proxy.close();
//     // await removeOpenAIConnector?.();
//   });

//   describe('start chat page', () => {
//     it('playground app is loaded', async () => {
//       await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToExist();
//       await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundStartChatPageComponentsToExist();
//     });

//     describe('without a connector', () => {
//       it('should display the set up connectors button', async () => {
//         await pageObjects.searchPlayground.PlaygroundStartChatPage.expectAddConnectorButtonExists();
//       });

//       // it('click add connector button opens connector flyout', async () => {
//       //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenConnectorPagePlayground();
//       // });

//       describe('setting up a connector', async () => {
//         await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenConnectorPagePlayground();
//         await pageObjects.searchPlayground.PlaygroundStartChatPage.createOpenAIConnector(proxy);

//         // await testSubjects.click('.gen-ai-card');
//         // await testSubjects.setValue('nameInput', 'myConnector');
//         // await testSubjects.setValue('config.apiUrl-input', `http://localhost:${proxy.getPort()}`);

//         // await testSubjects.click(ui.pages.createConnectorFlyout.genAiCard);
//         //   await testSubjects.setValue(ui.pages.createConnectorFlyout.nameInput, 'myConnector');
//         //   await testSubjects.setValue(
//         //     ui.pages.createConnectorFlyout.urlInput,
//         //     `http://localhost:${proxy.getPort()}`
//         //   );
//         //   await testSubjects.setValue(ui.pages.createConnectorFlyout.apiKeyInput, 'myApiKey');

//           // intercept the request to set up the knowledge base,
//           // so we don't have to wait until it's fully downloaded
//           // await interceptRequest(
//           //   driver.driver,
//           //   '*kb\\/setup*',
//           //   (responseFactory) => {
//           //     return responseFactory.fail();
//           //   },
//           //   async () => {
//           //     await testSubjects.clickWhenNotDisabled(ui.pages.createConnectorFlyout.saveButton);
//           //   }
//           // );

//           // await retry.waitFor('Connector created toast', async () => {
//           //   const count = await toasts.getCount();
//           //   return count > 0;
//           // });

//           // await toasts.dismissAll();
//         });

//         it('creates a connector', async () => {
//           const response = await supertest.get('/api/actions/connectors').expect(200);
//           console.log('response', response);
//           expect(response.body.length).to.eql(1);
//         });
//       });
//     });

//     // it.skip('playground app is loaded', async () => {
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToExist();
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectAddConnectorButtonExists();
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundStartChatPageComponentsToExist();

//     // });

//     // it('show no index callout', async () => {
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectNoIndexCalloutExists();
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectCreateIndexButtonToExists();
//     // });

//     // it('hide no index callout when index added', async () => {
//     //   await createIndex();
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectSelectIndex(indexName);
//     // });

//     // it('show add connector button', async () => {
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectAddConnectorButtonExists();
//     // });

//     // it('click add connector button opens connector flyout', async () => {
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenConnectorPagePlayground();
//     // });

//     // it('hide gen ai panel when connector exists', async () => {
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectHideGenAIPanelConnector(
//     //     createConnector
//     //   );
//     // });

//     // it('show chat page', async () => {
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectSelectIndex(indexName);
//     //   await pageObjects.searchPlayground.PlaygroundStartChatPage.expectToStartChatPage();
//     // });
//   });

//     describe.skip('chat page', () => {
//       it('chat works', async () => {
//         await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWorks();
//       });

//       it('open view code', async () => {
//         await pageObjects.searchPlayground.PlaygroundChatPage.expectOpenViewCode();
//       });

//       it('show fields and code in view query', async () => {
//         await pageObjects.searchPlayground.PlaygroundChatPage.expectViewQueryHasFields();
//       });

//       it('show edit context', async () => {
//         await pageObjects.searchPlayground.PlaygroundChatPage.expectEditContextOpens();
//       });
//     });
//   });
// }
