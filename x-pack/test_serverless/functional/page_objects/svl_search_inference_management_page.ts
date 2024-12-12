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
      },

      async expectTabularViewToBeLoaded() {
        await testSubjects.existOrFail('search-field-endpoints');
        await testSubjects.existOrFail('type-field-endpoints');
        await testSubjects.existOrFail('service-field-endpoints');

        const table = await testSubjects.find('inferenceEndpointTable');
        const rows = await table.findAllByClassName('euiTableRow');
        expect(rows.length).to.equal(2);

        const elserEndpointCell = await rows[0].findByTestSubject('endpointCell');
        const elserEndpointName = await elserEndpointCell.getVisibleText();
        expect(elserEndpointName).to.contain('.elser-2-elasticsearch');

        const elserProviderCell = await rows[0].findByTestSubject('providerCell');
        const elserProviderName = await elserProviderCell.getVisibleText();
        expect(elserProviderName).to.contain('Elasticsearch');
        expect(elserProviderName).to.contain('.elser_model_2');

        const elserTypeCell = await rows[0].findByTestSubject('typeCell');
        const elserTypeName = await elserTypeCell.getVisibleText();
        expect(elserTypeName).to.contain('sparse_embedding');

        const e5EndpointCell = await rows[1].findByTestSubject('endpointCell');
        const e5EndpointName = await e5EndpointCell.getVisibleText();
        expect(e5EndpointName).to.contain('.multilingual-e5-small-elasticsearch');

        const e5ProviderCell = await rows[1].findByTestSubject('providerCell');
        const e5ProviderName = await e5ProviderCell.getVisibleText();
        expect(e5ProviderName).to.contain('Elasticsearch');
        expect(e5ProviderName).to.contain('.multilingual-e5-small');

        const e5TypeCell = await rows[1].findByTestSubject('typeCell');
        const e5TypeName = await e5TypeCell.getVisibleText();
        expect(e5TypeName).to.contain('text_embedding');
      },

      async expectPreconfiguredEndpointsCannotBeDeleted() {
        const table = await testSubjects.find('inferenceEndpointTable');
        const rows = await table.findAllByClassName('euiTableRow');

        const elserDeleteAction = await rows[0].findByTestSubject('inferenceUIDeleteAction');
        const e5DeleteAction = await rows[1].findByTestSubject('inferenceUIDeleteAction');

        expect(await elserDeleteAction.isEnabled()).to.be(false);
        expect(await e5DeleteAction.isEnabled()).to.be(false);
      },

      async expectEndpointWithoutUsageTobeDelete() {
        const table = await testSubjects.find('inferenceEndpointTable');
        const rows = await table.findAllByClassName('euiTableRow');

        const userCreatedEndpoint = await rows[2].findByTestSubject('inferenceUIDeleteAction');

        await userCreatedEndpoint.click();
        await testSubjects.existOrFail('deleteModalForInferenceUI');
        await testSubjects.existOrFail('deleteModalInferenceEndpointName');

        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.existOrFail('inferenceEndpointTable');
      },

      async expectEndpointWithUsageTobeDelete() {
        const table = await testSubjects.find('inferenceEndpointTable');
        const rows = await table.findAllByClassName('euiTableRow');

        const userCreatedEndpoint = await rows[2].findByTestSubject('inferenceUIDeleteAction');

        await userCreatedEndpoint.click();
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
  };
}
