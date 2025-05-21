/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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

  describe('Serverless Inference Management UI', function () {
    // see details: https://github.com/elastic/kibana/issues/204539
    this.tags(['failsOnMKI']);

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
