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
  const retry = getService('retry');

  return {
    InferenceEmptyPage: {
      async expectComponentsToBeExist() {
        const endpointDesc = await testSubjects.find('createFirstInferenceEndpointDescription');
        const endpointDescMsg = await endpointDesc.getVisibleText();
        expect(endpointDescMsg).to.contain(
          "Inference endpoints enable you to perform inference tasks using NLP models provided by third-party services or Elastic's built-in models like ELSER and E5. Set up tasks such as text embedding, completions, reranking, and more by using the Create Inference API."
        );
        await testSubjects.existOrFail('learn-how-to-create-inference-endpoints');
        await testSubjects.existOrFail('view-your-models');
        await testSubjects.existOrFail('semantic-search-with-elser');
        await testSubjects.existOrFail('semantic-search-with-e5');
      },
    },
    InferenceTabularPage: {
      async expectHeaderToBeExist() {
        await testSubjects.existOrFail('allInferenceEndpointsPage');
        await testSubjects.existOrFail('api-documentation');
        await testSubjects.existOrFail('view-your-models');
      },

      async expectTabularViewToBeLoaded() {
        await testSubjects.existOrFail('search-field-endpoints');
        await testSubjects.existOrFail('type-field-endpoints');
        await testSubjects.existOrFail('service-field-endpoints');

        const table = await testSubjects.find('inferenceEndpointTable');
        const rows = await table.findAllByClassName('euiTableRow');
        expect(rows.length).to.equal(1);

        const endpointCell = await rows[0].findByTestSubject('endpointCell');
        const endpointName = await endpointCell.getVisibleText();
        expect(endpointName).to.contain('endpoint-1');

        const providerCell = await rows[0].findByTestSubject('providerCell');
        const providerName = await providerCell.getVisibleText();
        expect(providerName).to.contain('Elasticsearch');
        expect(providerName).to.contain('.elser_model_2');

        const typeCell = await rows[0].findByTestSubject('typeCell');
        const typeName = await typeCell.getVisibleText();
        expect(typeName).to.contain('sparse_embedding');
      },

      async expectEndpointWithoutUsageTobeDelete() {
        await testSubjects.click('inferenceUIDeleteAction');
        await testSubjects.existOrFail('deleteModalForInferenceUI');
        await testSubjects.existOrFail('deleteModalInferenceEndpointName');

        await testSubjects.click('confirmModalConfirmButton');

        await retry.waitForWithTimeout('delete modal to disappear', 5000, () =>
          testSubjects
            .missingOrFail('confirmModalConfirmButton')
            .then(() => true)
            .catch(() => false)
        );
      },

      async expectEndpointWithUsageTobeDelete() {
        await testSubjects.click('inferenceUIDeleteAction');
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

        await retry.waitForWithTimeout('delete modal to disappear', 5000, () =>
          testSubjects
            .missingOrFail('confirmModalConfirmButton')
            .then(() => true)
            .catch(() => false)
        );
      },

      async expectToCopyEndpoint() {
        await testSubjects.click('inference-endpoints-action-copy-id-label');
        expect((await browser.getClipboardValue()).includes('endpoint-1')).to.be(true);
      },
    },
  };
}
