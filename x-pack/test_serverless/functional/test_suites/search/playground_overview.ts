/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { testHasEmbeddedConsole } from './embedded_console';
import { FtrProviderContext } from '../../ftr_provider_context';
import { RoleCredentials } from '../../../shared/services';

const indexName = 'basic_index';
const esArchiveIndex = 'test/api_integration/fixtures/es_archiver/index_patterns/basic_index';
async function createOpenAIConnector({
  supertest,
  requestHeader = {},
  apiKeyHeader = {},
}: {
  supertest: SuperTest.Agent;
  requestHeader?: Record<string, string>;
  apiKeyHeader?: Record<string, string>;
}): Promise<() => Promise<void>> {
  const config = {
    apiProvider: 'OpenAI',
    defaultModel: 'gpt-4',
    apiUrl: 'http://localhost:3002',
  };

  const connector: { id: string } | undefined = (
    await supertest
      .post('/api/actions/connector')
      .set(requestHeader)
      .set(apiKeyHeader)
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

  return async () => {
    if (connector) {
      await supertest
        .delete(`/api/actions/connector/${connector.id}`)
        .set(requestHeader)
        .set(apiKeyHeader)
        .expect(204);
    }
  };
}

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'svlCommonNavigation', 'searchPlayground']);
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const createIndex = async () => await esArchiver.load(esArchiveIndex);
  let roleAuthc: RoleCredentials;

  describe('Serverless Playground Overview', function () {
    // see details: https://github.com/elastic/kibana/issues/183893
    this.tags(['failsOnMKI']);

    let removeOpenAIConnector: () => Promise<void>;
    let createConnector: () => Promise<void>;

    before(async () => {
      await pageObjects.svlCommonPage.login();
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'searchPlayground',
      });

      const requestHeader = svlCommonApi.getInternalRequestHeader();
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      createConnector = async () => {
        removeOpenAIConnector = await createOpenAIConnector({
          supertest: supertestWithoutAuth,
          requestHeader,
          apiKeyHeader: roleAuthc.apiKeyHeader,
        });
      };
    });

    after(async () => {
      await removeOpenAIConnector?.();
      await esArchiver.unload(esArchiveIndex);
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('start chat page', () => {
      it('playground app is loaded', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundStartChatPageComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToExist();
      });

      it('show no index callout', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectNoIndexCalloutExists();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectCreateIndexButtonToMissed();
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

    it('has embedded console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });
  });
}
