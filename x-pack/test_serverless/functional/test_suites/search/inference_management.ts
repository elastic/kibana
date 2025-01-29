/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';

import { testHasEmbeddedConsole } from './embedded_console';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'embeddedConsole',
    'svlSearchInferenceManagementPage',
    'header',
  ]);
  const svlSearchNavigation = getService('svlSearchNavigation');
  const browser = getService('browser');
  const ml = getService('ml');

  describe('Serverless Inference Management UI', function () {
    // see details: https://github.com/elastic/kibana/issues/204539
    this.tags(['failsOnMKI']);
    const endpoint = 'endpoint-1';
    const taskType = 'sparse_embedding';
    const modelConfig = {
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 1,
        num_threads: 1,
        model_id: '.elser_model_2',
      },
    };

    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('developer');
    });

    beforeEach(async () => {
      await svlSearchNavigation.navigateToInferenceManagementPage();
    });

    describe('endpoint tabular view', () => {
      it('is loaded successfully', async () => {
        await pageObjects.svlSearchInferenceManagementPage.InferenceTabularPage.expectHeaderToBeExist();
        await pageObjects.svlSearchInferenceManagementPage.InferenceTabularPage.expectTabularViewToBeLoaded();
      });

      it('preconfigured endpoints can not be deleted', async () => {
        await pageObjects.svlSearchInferenceManagementPage.InferenceTabularPage.expectPreconfiguredEndpointsCannotBeDeleted();
      });
    });

    describe('copy endpoint id action', () => {
      it('can copy an endpoint id', async () => {
        await pageObjects.svlSearchInferenceManagementPage.InferenceTabularPage.expectToCopyEndpoint();
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/204507
    describe.skip('delete action', () => {
      const usageIndex = 'elser_index';
      beforeEach(async () => {
        await ml.api.createInferenceEndpoint(endpoint, taskType, modelConfig);
        await browser.refresh();
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await ml.api.deleteIndices(usageIndex);
        await ml.api.deleteIngestPipeline(endpoint);
      });

      it('deletes modal successfully without any usage', async () => {
        await pageObjects.svlSearchInferenceManagementPage.InferenceTabularPage.expectEndpointWithoutUsageTobeDelete();
      });

      it('deletes modal successfully with usage', async () => {
        const indexMapping: estypes.MappingTypeMapping = {
          properties: {
            content: {
              type: 'text',
            },
            content_embedding: {
              type: 'semantic_text',
              inference_id: endpoint,
            },
          },
        };
        await ml.api.createIngestPipeline(endpoint);
        await ml.api.createIndex(usageIndex, indexMapping);

        await pageObjects.svlSearchInferenceManagementPage.InferenceTabularPage.expectEndpointWithUsageTobeDelete();
      });
    });

    describe('create inference flyout', () => {
      it('renders successfully', async () => {
        await pageObjects.svlSearchInferenceManagementPage.AddInferenceFlyout.expectInferenceEndpointToBeVisible();
      });
    });

    describe('edit inference flyout', () => {
      it('renders successfully', async () => {
        await pageObjects.svlSearchInferenceManagementPage.EditInferenceFlyout.expectEditInferenceEndpointFlyoutToBeVisible();
      });
    });

    it('has embedded dev console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });
  });
}
