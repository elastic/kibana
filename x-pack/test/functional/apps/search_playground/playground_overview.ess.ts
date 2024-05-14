/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import runCommonTests from './playground_overview.common';
import { createOpenAIConnector } from './utils/create_openai_connector';
import { MachineLearningCommonAPIProvider } from '../../services/ml/common_api';

export default function (ftrContext: FtrProviderContext) {
  const pageObjects = ftrContext.getPageObjects(['common']);
  const configService = ftrContext.getService('config');
  const commonAPI = MachineLearningCommonAPIProvider(context);
  const supertest = ftrContext.getService('supertest');
  const openAIConnectorGen = createOpenAIConnector({
    configService,
    supertest,
    requestHeader: commonAPI.getCommonRequestHeader(),
  });

  describe('Playground Overview', () => {
    let closeOpenAIConnector: () => Promise<void> | undefined;

    before(async () => {
      await pageObjects.common.navigateToApp('enterpriseSearchApplications/playground');

      closeOpenAIConnector = (await openAIConnectorGen.next()).value;
    });

    after(async () => {
      await closeOpenAIConnector?.();
    });

    runCommonTests(ftrContext, {
      createConnector: async () => {
        await openAIConnectorGen.next();
      },
    });
  });
}
