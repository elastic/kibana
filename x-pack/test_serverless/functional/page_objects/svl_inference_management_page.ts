/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlInferenceManagementPage({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    InferenceEmptyPage: {
      async expectComponentsToBeExist() {
        const endpointDesc = await testSubjects.find('createFirstInferenceEndpointDescription');
        const endpointDescMsg = await endpointDesc.getVisibleText();
        expect(endpointDescMsg).to.contain(
          'Connect to your third-party model provider to create an inference endpoint for semantic search.'
        );
        await testSubjects.existOrFail('addEndpointButtonForEmptyPrompt');
        await testSubjects.existOrFail('createFirstElserInferenceEndpointDescription');
        await testSubjects.existOrFail('createFirstE5InferenceEndpointDescription');
      },

      async expectFlyoutTobeOpened() {
        await testSubjects.click('addEndpointButtonForEmptyPrompt');
        await testSubjects.existOrFail('addInferenceEndpoint');
        await testSubjects.click('euiFlyoutCloseButton');
      },
    },
    InferenceTabularPage: {
      async expectHeaderToBeExist() {
        await testSubjects.existOrFail('allInferenceEndpointsPage');
        await testSubjects.existOrFail('addEndpointButtonForAllInferenceEndpoints');
        expect(await testSubjects.isEnabled('addEndpointButtonForAllInferenceEndpoints')).to.be(
          true
        );
      },

      async expectTabularViewToBeLoaded() {
        await testSubjects.existOrFail('inferenceSearchField');
        await testSubjects.existOrFail('inferenceTypeField');
        await testSubjects.existOrFail('inferenceServiceField');

        const table = await testSubjects.find('inferenceEndpointTable');
        const rows = await table.findAllByClassName('euiTableRow');
        expect(rows.length).to.equal(1);

        await testSubjects.existOrFail('deploymentCell');

        const endpointCell = await testSubjects.find('endpointCell');
        const endpointName = await endpointCell.getVisibleText();
        expect(endpointName).to.contain('endpoint-1');

        const providerCell = await testSubjects.find('providerCell');
        const providerName = await providerCell.getVisibleText();
        expect(providerName).to.equal('ELSER');

        const typeCell = await testSubjects.find('typeCell');
        const typeName = await typeCell.getVisibleText();
        expect(typeName).to.equal('sparse_embedding');
      },

      async expectEndPointTobeDeleted() {
        await testSubjects.click('inference-tableRow-action-button');
        await testSubjects.click('inference-endpoints-action-delete-endpoint');
        await testSubjects.click('confirmModalConfirmButton');
        await testSubjects.missingOrFail('inferenceEndpointTable');
      },

      async expectToCopyEndpoint() {
        await testSubjects.click('inference-tableRow-action-button');
        await testSubjects.click('inference-endpoints-action-copy-id-label');

        expect((await browser.getClipboardValue()).includes('endpoint-1')).to.be(true);
      },
    },
  };
}
