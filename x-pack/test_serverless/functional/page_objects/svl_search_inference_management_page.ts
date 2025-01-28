/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlSearchInferenceManagementPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    InferenceTabularPage: {
      async expectHeaderToBeExist() {
        await testSubjects.existOrFail('allInferenceEndpointsPage');
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

      async expectPreconfiguredEndpointsCannotBeDeleted() {
        const preconfigureEndpoints = await testSubjects.findAll(
          'inferenceUIDeleteAction-preconfigured'
        );
        for (const endpoint of preconfigureEndpoints) {
          expect(await endpoint.isEnabled()).to.be(false);
        }
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
        const table = await testSubjects.find('inferenceEndpointTable');
        const rows = await table.findAllByClassName('euiTableRow');

        const elserCopyEndpointId = await rows[0].findByTestSubject(
          'inference-endpoints-action-copy-id-label'
        );

        await elserCopyEndpointId.click();
        expect((await browser.getClipboardValue()).includes('.elser-2-elasticsearch')).to.be(true);
      },
    },

    AddInferenceFlyout: {
      async expectInferenceEndpointToBeVisible() {
        await testSubjects.click('add-inference-endpoint-header-button');
        await testSubjects.existOrFail('create-inference-flyout');

        await testSubjects.click('provider-select');
        await testSubjects.setValue('provider-super-select-search-box', 'Cohere');
        await testSubjects.click('provider');

        await testSubjects.existOrFail('api_key-password');
        await testSubjects.click('completion');
        await testSubjects.existOrFail('inference-endpoint-input-field');
        (await testSubjects.getVisibleText('inference-endpoint-input-field')).includes(
          'cohere-completion'
        );

        await testSubjects.click('add-inference-endpoint-submit-button');
        expect(await testSubjects.isEnabled('add-inference-endpoint-submit-button')).to.be(false);
      },
    },
  };
}
