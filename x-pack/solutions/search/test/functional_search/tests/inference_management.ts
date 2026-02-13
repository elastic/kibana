/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { testHasEmbeddedConsole } from './embedded_console';

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'common',
    'embeddedConsole',
    'searchInferenceManagementPage',
    'header',
  ]);
  const searchSpace = getService('searchSpace');
  describe('Inference Management UI', function () {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      ({ cleanUp, spaceCreated } = await searchSpace.createTestSpace(
        'search-inference-management-ftr'
      ));
      await searchSpace.navigateTo(spaceCreated.id);
    });

    after(async () => {
      // Clean up space created
      if (!cleanUp) return;
      await cleanUp();
    });

    beforeEach(async () => {
      // Navigate to search solution space
      await searchSpace.navigateTo(spaceCreated.id);
      // Navigate to index management app
      await pageObjects.common.navigateToApp('searchInferenceEndpoints', {
        basePath: `s/${spaceCreated.id}`,
      });
    });

    describe('endpoint tabular view', () => {
      it('is loaded successfully', async () => {
        await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectHeaderToBeExist();
        await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectTabularViewToBeLoaded();
      });

      it('displays model column with model ids', async () => {
        await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectModelColumnToBeDisplayed();
      });

      it('can search by model name', async () => {
        await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectSearchByModelName();
      });

      it('preconfigured endpoints can not be deleted', async () => {
        await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectPreconfiguredEndpointsCannotBeDeleted();
      });

      it('displays endpoint stats bar with counts', async () => {
        await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectEndpointStatsToBeDisplayed();
      });

      it('endpoint stats update when filters are applied', async () => {
        await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectEndpointStatsToUpdateOnFilter();
      });
    });

    describe('copy endpoint id action', () => {
      it('can copy an endpoint id', async () => {
        await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectToCopyEndpoint();
      });
    });

    describe('create inference flyout', () => {
      it('renders successfully', async () => {
        await pageObjects.searchInferenceManagementPage.AddInferenceFlyout.expectInferenceEndpointToBeVisible();
      });
      it('renders successfully with custom headers', async () => {
        await pageObjects.searchInferenceManagementPage.AddInferenceFlyout.expectInferenceEndpointToAllowCustomHeaders();
      });
    });

    describe('edit inference flyout', () => {
      it('renders successfully', async () => {
        await pageObjects.searchInferenceManagementPage.EditInferenceFlyout.expectEditInferenceEndpointFlyoutToBeVisible();
      });
    });

    it('has embedded dev console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });
  });
}
