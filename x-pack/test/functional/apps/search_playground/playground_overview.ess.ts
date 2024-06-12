/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { createOpenAIConnector } from './utils/create_openai_connector';
import { MachineLearningCommonAPIProvider } from '../../services/ml/common_api';

const indexName = 'basic_index';
const esArchiveIndex = 'test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

export default function (ftrContext: FtrProviderContext) {
  const { getService, getPageObjects } = ftrContext;
  const pageObjects = getPageObjects(['common', 'searchPlayground']);
  const commonAPI = MachineLearningCommonAPIProvider(ftrContext);
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const createIndex = async () => await esArchiver.load(esArchiveIndex);
  let removeOpenAIConnector: () => Promise<void>;
  const createConnector = async () => {
    removeOpenAIConnector = await createOpenAIConnector({
      supertest,
      requestHeader: commonAPI.getCommonRequestHeader(),
    });
  };

  describe('Playground Overview', () => {
    before(async () => {
      await pageObjects.common.navigateToApp('enterpriseSearchApplications/playground');
    });

    after(async () => {
      await esArchiver.unload(esArchiveIndex);
      await removeOpenAIConnector?.();
    });

    describe('start chat page', () => {
      it('playground app is loaded', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundStartChatPageComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundHeaderComponentsToExist();
      });

      it('show no index callout', async () => {
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectNoIndexCalloutExists();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectCreateIndexButtonToExists();
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
