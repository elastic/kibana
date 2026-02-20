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
    'svlCommonPage',
    'embeddedConsole',
    'searchInferenceManagementPage',
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
      describe('group by', () => {
        it('defaults to group by models', async () => {
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectGroupBySelection(
            'Models'
          );
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectGroupByViewToBeDisplayed();
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectGroupByTable(
            'elastic'
          );
        });
        it('can switch to group by none', async () => {
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.selectGroupByOption(
            'none'
          );
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectGroupBySelection(
            'None'
          );
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectTabularViewToBeLoaded();
        });

        it('can collapse group accordions', async () => {
          const modelGroup = 'elastic';
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectGroupByViewToBeDisplayed();
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectGroupByAccordionsToBeOpen(
            modelGroup
          );
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.toggleGroupByAccordion(
            modelGroup
          );
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectGroupByAccordionsToBeClosed(
            modelGroup
          );
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.toggleGroupByAccordion(
            modelGroup
          );
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectGroupByAccordionsToBeOpen(
            modelGroup
          );
        });
      });

      describe('group by None', () => {
        beforeEach(async () => {
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.expectGroupBySelection(
            'Models'
          );
          await pageObjects.searchInferenceManagementPage.InferenceTabularPage.selectGroupByOption(
            'none'
          );
        });

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
