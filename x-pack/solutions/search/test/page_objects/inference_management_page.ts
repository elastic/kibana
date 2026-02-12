/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from './ftr_provider_context';

export function SearchInferenceManagementPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  return {
    InferenceTabularPage: {
      async expectHeaderToBeExist() {
        await testSubjects.existOrFail('allInferenceEndpointsPage');
        await testSubjects.existOrFail('eis-documentation');
        await testSubjects.existOrFail('api-documentation');
        await testSubjects.existOrFail('view-your-models');
        await testSubjects.existOrFail('add-inference-endpoint-header-button');
      },

      async expectTabularViewToBeLoaded() {
        await testSubjects.existOrFail('search-field-endpoints');
        await testSubjects.existOrFail('type-field-endpoints');
        await testSubjects.existOrFail('service-field-endpoints');

        const table = await testSubjects.find('inferenceEndpointTable');
        const rows = await table.findAllByClassName('euiTableRow');
        // we need at least one (ELSER) otherwise index_mapping might experience some issues
        expect(rows.length).to.greaterThan(1);

        const texts = await Promise.all(rows.map((row) => row.getVisibleText()));
        const hasElser2 = texts.some((text) => text.includes('.elser-2'));
        const hasE5 = texts.some((text) => text.includes('.multilingual-e5'));

        expect(hasElser2).to.be(true);
        expect(hasE5).to.be(true);
      },

      async expectEndpointStatsToBeDisplayed() {
        // Verify the endpoint stats bar exists
        await testSubjects.existOrFail('endpointStats');
        await testSubjects.existOrFail('endpointStatsServicesCount');
        await testSubjects.existOrFail('endpointStatsModelsCount');
        await testSubjects.existOrFail('endpointStatsTypesCount');
        await testSubjects.existOrFail('endpointStatsEndpointsCount');

        // Verify stats show non-zero counts (we have preconfigured endpoints)
        const servicesCount = parseInt(
          await testSubjects.getVisibleText('endpointStatsServicesCount'),
          10
        );
        const modelsCount = parseInt(
          await testSubjects.getVisibleText('endpointStatsModelsCount'),
          10
        );
        const typesCount = parseInt(
          await testSubjects.getVisibleText('endpointStatsTypesCount'),
          10
        );
        const endpointsCount = parseInt(
          await testSubjects.getVisibleText('endpointStatsEndpointsCount'),
          10
        );

        // We should have at least 1 service, 1 model, 1 type, and 1 endpoint (preconfigured)
        expect(servicesCount).to.greaterThan(0);
        expect(modelsCount).to.greaterThan(0);
        expect(typesCount).to.greaterThan(0);
        expect(endpointsCount).to.greaterThan(0);
      },

      async expectEndpointStatsToUpdateOnFilter() {
        // Get initial endpoint count
        const initialCount = parseInt(
          await testSubjects.getVisibleText('endpointStatsEndpointsCount'),
          10
        );

        // Apply a search filter to reduce results
        const searchField = await testSubjects.find('search-field-endpoints');
        await searchField.clearValue();
        await searchField.type('elser');

        // Wait for table to update and check stats using retry
        await retry.try(async () => {
          const filteredCount = parseInt(
            await testSubjects.getVisibleText('endpointStatsEndpointsCount'),
            10
          );

          // Filtered count should be strictly less than initial count to confirm filter works
          expect(filteredCount).to.be.lessThan(initialCount);
          expect(filteredCount).to.greaterThan(0);
        });

        // Clear the search field
        await searchField.clearValue();
      },

      async expectModelColumnToBeDisplayed() {
        // Verify model column cells exist using data-test-subj
        const modelCells = await testSubjects.findAll('modelCell');
        expect(modelCells.length).to.greaterThan(0);
      },

      async expectSearchByModelName() {
        // Search for a model name that exists in preconfigured endpoints
        const searchField = await testSubjects.find('search-field-endpoints');
        await searchField.clearValue();
        await searchField.type('elser_model');

        // Wait for the table to update
        const table = await testSubjects.find('inferenceEndpointTable');
        const rows = await table.findAllByClassName('euiTableRow');

        // Verify results are filtered and contain the searched model
        expect(rows.length).to.greaterThan(0);
        const texts = await Promise.all(rows.map((row) => row.getVisibleText()));
        const allContainElser = texts.every((text) => text.toLowerCase().includes('elser'));
        expect(allContainElser).to.be(true);

        // Clear the search field
        await searchField.clearValue();
      },

      async expectPreconfiguredEndpointsCannotBeDeleted() {
        const actionButton = await testSubjects.find('euiCollapsedItemActionsButton');
        await actionButton.click();

        await testSubjects.existOrFail('inferenceUIDeleteAction-preconfigured');
        const preconfigureEndpoint = await testSubjects.find(
          'inferenceUIDeleteAction-preconfigured'
        );

        const isEnabled = await preconfigureEndpoint.isEnabled();
        expect(isEnabled).to.be(false);
      },

      async expectEndpointWithoutUsageTobeDelete() {
        const userDefinedEdnpoint = await testSubjects.find('inferenceUIDeleteAction-user-defined');
        await userDefinedEdnpoint.click();
        await testSubjects.existOrFail('deleteModalForInferenceUI');
        await testSubjects.existOrFail('deleteModalInferenceEndpointName');

        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.existOrFail('inferenceEndpointTable');
      },

      async expectEndpointWithUsageTobeDelete() {
        const userDefinedEdnpoint = await testSubjects.find('inferenceUIDeleteAction-user-defined');
        await userDefinedEdnpoint.click();
        await testSubjects.existOrFail('deleteModalForInferenceUI');
        await testSubjects.existOrFail('deleteModalInferenceEndpointName');

        const items = await testSubjects.findAll('usageItem');
        expect(items.length).to.equal(2);

        const index = await items[0].getVisibleText();
        const pipeline = await items[1].getVisibleText();

        expect(index.includes('elser_index')).to.be(true);
        expect(pipeline.includes('endpoint-1')).to.be(true);

        expect(await testSubjects.isEnabled('confirmModalConfirmButton')).to.be(false);

        await testSubjects.click('warningCheckbox');

        expect(await testSubjects.isEnabled('confirmModalConfirmButton')).to.be(true);
        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.existOrFail('inferenceEndpointTable');
      },

      async expectToCopyEndpoint() {
        const actionButton = await testSubjects.find('euiCollapsedItemActionsButton');
        await actionButton.click();

        await testSubjects.existOrFail('inference-endpoints-action-copy-id-label');
        const elserCopyEndpointId = await testSubjects.find(
          'inference-endpoints-action-copy-id-label'
        );

        await elserCopyEndpointId.click();
        expect((await browser.getClipboardValue()).includes('.elser-2-elasticsearch')).to.be(true);
      },
    },

    AddInferenceFlyout: {
      async expectInferenceEndpointToBeVisible() {
        await testSubjects.click('add-inference-endpoint-header-button');
        await testSubjects.existOrFail('inference-flyout');

        await testSubjects.click('provider-select');
        await testSubjects.setValue('provider-super-select-search-box', 'Cohere');
        await testSubjects.click('Cohere-provider');

        await testSubjects.existOrFail('api_key-password');
        await testSubjects.click('inference-endpoint-additional-settings-button');
        await testSubjects.click('completion');
        await testSubjects.existOrFail('inference-endpoint-input-field');
        (await testSubjects.getVisibleText('inference-endpoint-input-field')).includes(
          'cohere-completion'
        );

        expect(await testSubjects.isEnabled('inference-endpoint-submit-button')).to.be(true);
      },

      async expectInferenceEndpointToAllowCustomHeaders() {
        await testSubjects.click('add-inference-endpoint-header-button');
        await testSubjects.existOrFail('inference-flyout');

        await testSubjects.click('provider-select');
        await testSubjects.setValue('provider-super-select-search-box', 'OpenAI');
        await testSubjects.click('OpenAI-provider');

        await testSubjects.existOrFail('inference-endpoint-more-options');
        await testSubjects.click('inference-endpoint-more-options-accordion-button');
        // Toggle switch to show custom headers
        await testSubjects.existOrFail('headers-switch-unchecked');
        await testSubjects.click('headers-switch-unchecked');
        await testSubjects.existOrFail('headers-switch-checked');
        // Set firstset key/value of custom headers
        await testSubjects.setValue('headers-key-0', 'First-header-key');
        await testSubjects.setValue('headers-value-0', 'First-header-value');
        await testSubjects.existOrFail('headers-delete-button-0');
        await testSubjects.click('headers-add-button');
        // Set second set key/value of custom headers
        await testSubjects.setValue('headers-key-1', 'Second-header-key');
        await testSubjects.setValue('headers-value-1', 'Second-header-value');
        await testSubjects.existOrFail('headers-delete-button-1');
        // Delete first set of custom headers
        await testSubjects.click('headers-delete-button-0');
        const headerKeyValue = await testSubjects.getAttribute('headers-key-0', 'value');
        const headerValueValue = await testSubjects.getAttribute('headers-value-0', 'value');
        // Confirm second headers are now first/only set of headers
        expect(headerKeyValue).to.be('Second-header-key');
        expect(headerValueValue).to.be('Second-header-value');

        await testSubjects.existOrFail('api_key-password');
        await testSubjects.click('inference-endpoint-additional-settings-button');
        await testSubjects.click('completion');
        await testSubjects.existOrFail('inference-endpoint-input-field');
        (await testSubjects.getVisibleText('inference-endpoint-input-field')).includes(
          'openai-completion'
        );

        expect(await testSubjects.isEnabled('inference-endpoint-submit-button')).to.be(true);
      },
    },

    EditInferenceFlyout: {
      async expectEditInferenceEndpointFlyoutToBeVisible() {
        const actionButton = await testSubjects.find('euiCollapsedItemActionsButton');
        await actionButton.click();

        await testSubjects.existOrFail('inference-endpoints-action-view-endpoint-label');
        const elserViewEndpoint = await testSubjects.find(
          'inference-endpoints-action-view-endpoint-label'
        );

        await elserViewEndpoint.click();
        await testSubjects.existOrFail('inference-flyout');
        (await testSubjects.getVisibleText('provider-select')).includes('Elasticsearch');
        (await testSubjects.getVisibleText('model_id-input')).includes('.elser_model_2');

        await testSubjects.missingOrFail('inference-endpoint-submit-button');
      },
    },
  };
}
