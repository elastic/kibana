/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelConfig } from '@kbn/inference_integration_flyout/types';

import { testHasEmbeddedConsole } from './embedded_console';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'svlInferenceManagementPage',
  ]);
  const browser = getService('browser');
  const ml = getService('ml');

  describe('Serverless Inference Management UI', function () {
    this.tags('skipMKI');

    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('admin');
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'searchInferenceEndpoints',
      });
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('endpoint empty view', () => {
      it('is loaded successfully', async () => {
        await pageObjects.svlInferenceManagementPage.InferenceEmptyPage.expectComponentsToBeExist();
      });
      it('opens add inference flyout', async () => {
        await pageObjects.svlInferenceManagementPage.InferenceEmptyPage.expectFlyoutTobeOpened();
      });
    });

    describe('endpoint tabular view', () => {
      before(async () => {
        const modelConfig: ModelConfig = {
          service: 'elser',
          service_settings: {
            num_allocations: 1,
            num_threads: 1,
          },
        };
        await ml.api.createInferenceEndpoint('endpoint-1', 'sparse_embedding', modelConfig);
        await browser.refresh();
      });

      it('is loaded successfully', async () => {
        await pageObjects.svlInferenceManagementPage.InferenceTabularPage.expectHeaderToBeExist();
        await pageObjects.svlInferenceManagementPage.InferenceTabularPage.expectTabularViewToBeLoaded();
      });

      it('can copy an endpoint id', async () => {
        await pageObjects.svlInferenceManagementPage.InferenceTabularPage.expectToCopyEndpoint();
      });

      it('can delete an endpoint', async () => {
        await pageObjects.svlInferenceManagementPage.InferenceTabularPage.expectEndPointTobeDeleted();
      });
    });

    it('has embedded dev console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });
  });
}
