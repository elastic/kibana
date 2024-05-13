/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAISimulator } from '@kbn/actions-simulators-plugin/server/openai_simulation';
import { isServerlessKibanaFlavor } from '@kbn/security-solution-plugin/scripts/endpoint/common/stack_services';
import { FtrProviderContext } from '../../ftr_provider_context';

const indexName = 'basic_index';
const esArchiveIndex = 'test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

async function* createOpenAIConnector(configService, supertest) {
  const simulator = new OpenAISimulator({
    returnError: false,
    proxy: {
      config: configService.get('kbnTestServer.serverArgs'),
    },
  });
  yield simulator;

  const config = {
    apiProvider: 'OpenAI',
    defaultModel: 'gpt-4',
    apiUrl: await simulator.start(),
  };
  // eslint-disable-next-line prefer-const
  let connector;

  yield async () => {
    if (connector) {
      await supertest
        .delete(`/api/actions/connector/${connector.id}`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo')
        .expect(204);
    }

    await simulator.close();
  };

  connector = (
    await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .set('x-elastic-internal-origin', 'foo')
      .send({
        name: 'test Open AI',
        connector_type_id: '.gen-ai',
        config,
        secrets: {
          apiKey: 'genAiApiKey',
        },
      })
      .expect(200)
  ).body;

  yield connector;
}

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'searchPlayground']);
  const configService = getService('config');
  const supertest = getService('supertest');

  const esArchiver = getService('esArchiver');
  const openAIConnectorGen = createOpenAIConnector(configService, supertest);
  let simulator;
  let connector;
  const log = getService('log');
  const kbnClient = getService('kibanaServer');
  const createConnector = async () => {
    connector = await openAIConnectorGen.next().value;
  };
  const createIndex = async () => await esArchiver.load(esArchiveIndex);

  describe('Playground', () => {
    let closeOpenAIConnector;

    before(async () => {
      simulator = (await openAIConnectorGen.next()).value;
      closeOpenAIConnector = (await openAIConnectorGen.next()).value;

      if (await isServerlessKibanaFlavor(kbnClient)) {
        log.info('login for serverless environment');
        const serverlessPageObjects = getPageObjects(['svlCommonPage', 'svlCommonNavigation']);
        await serverlessPageObjects.svlCommonPage.login();
        await serverlessPageObjects.svlCommonNavigation.sidenav.clickLink({
          deepLinkId: 'searchPlayground',
        });
      } else {
        await pageObjects.common.navigateToApp('enterpriseSearchApplications/playground');
      }
    });

    after(async () => {
      await closeOpenAIConnector?.();
      await esArchiver.unload(esArchiveIndex);

      if (await isServerlessKibanaFlavor(kbnClient)) {
        const serverlessPageObjects = getPageObjects(['svlCommonPage']);
        await serverlessPageObjects.svlCommonPage.forceLogout();
      }
    });

    describe('start chat page', () => {
      it('playground app is loaded', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundStartChatPageComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToExist();
      });

      it('show no index callout', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectNoIndexCalloutExists();
      });

      it('hide no index callout when index added', async () => {
        await createIndex();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectSelectIndex(indexName);
      });

      it('show add connector button', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectAddConnectorButtonExists();
      });

      it('click add connector button opens connector flyout', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectOpenConnectorPagePlayground();
      });

      it('hide gen ai panel when connector exists', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectHideGenAIPanelConnector(
          createConnector
        );
      });

      it('show chat page', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectSelectIndex(indexName);
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectToStartChatPage();
      });
    });

    describe('chat page', () => {
      it('chat works', async () => {
        await pageObjects.searchPlayground.PlaygroundChatPage.expectChatWorks();
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
  });
}
