/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import runCommonTests from './playground_overview.common';
import { createOpenAIConnector } from './utils/create_openai_connector';

export default function (ftrContext: FtrProviderContext) {
  const pageObjects = ftrContext.getPageObjects(['svlCommonPage', 'svlCommonNavigation']);
  const svlCommonApi = ftrContext.getService('svlCommonApi');
  const svlUserManager = ftrContext.getService('svlUserManager');
  const configService = ftrContext.getService('config');
  const supertestWithoutAuth = ftrContext.getService('supertestWithoutAuth');
  let openAIConnectorGen;
  let roleAuthc;

  describe('Serverless Playground Overview', () => {
    let closeOpenAIConnector: () => Promise<void> | undefined;

    before(async () => {
      await pageObjects.svlCommonPage.login();
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'searchPlayground',
      });

      const requestHeader = svlCommonApi.getInternalRequestHeader();
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      openAIConnectorGen = createOpenAIConnector({
        configService,
        supertest: supertestWithoutAuth,
        requestHeader,
        apiKeyHeader: roleAuthc.apiKeyHeader,
      });

      closeOpenAIConnector = (await openAIConnectorGen.next()).value;
    });

    after(async () => {
      await closeOpenAIConnector?.();
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
      await pageObjects.svlCommonPage.forceLogout();
    });

    runCommonTests(ftrContext, {
      createConnector: async () => {
        await openAIConnectorGen.next();
      },
    });
  });
}
