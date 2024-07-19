/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelConfig } from '@kbn/inference_integration_flyout/types';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'inferenceManagement']);
  const browser = getService('browser');
  const ml = getService('ml');

  /* Due to a race condition between registrating an app and license subscription, 
    the FTR tests can not access the desired application.
  */
  describe.skip('ESS Inference Management UI', function () {
    this.tags('skipMKI');

    before(async () => {
      await pageObjects.common.navigateToApp('home');
      await pageObjects.common.navigateToApp('enterprise_search/overview');
      await pageObjects.common.navigateToApp('inferenceManagement');
    });

    describe.skip('endpoint empty view', () => {
      it('is loaded successfully', async () => {
        await pageObjects.inferenceManagement.InferenceEmptyPage.expectComponentsToBeExist();
      });
      it('opens add inference flyout', async () => {
        await pageObjects.inferenceManagement.InferenceEmptyPage.expectFlyoutTobeOpened();
      });
    });

    describe.skip('endpoint tabular view', () => {
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
        await pageObjects.inferenceManagement.InferenceTabularPage.expectHeaderToBeExist();
        await pageObjects.inferenceManagement.InferenceTabularPage.expectTabularViewToBeLoaded();
      });

      it('can copy an endpoint id', async () => {
        await pageObjects.inferenceManagement.InferenceTabularPage.expectToCopyEndpoint();
      });

      it('can delete an endpoint', async () => {
        await pageObjects.inferenceManagement.InferenceTabularPage.expectEndPointTobeDeleted();
      });
    });
  });
}
