/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { CaseSeverity, CustomFieldTypes } from '@kbn/cases-plugin/common/types/domain';
import { OBSERVABILITY_OWNER } from '@kbn/cases-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { navigateToCasesApp } from '../../../../shared/lib/cases';

const owner = OBSERVABILITY_OWNER;

export default ({ getService, getPageObject }: FtrProviderContext) => {
  describe('Create Case', function () {
    const find = getService('find');
    const cases = getService('cases');
    const svlCases = getService('svlCases');
    const testSubjects = getService('testSubjects');
    const svlCommonPage = getPageObject('svlCommonPage');
    const config = getService('config');
    const header = getPageObject('header');

    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
    });

    beforeEach(async () => {
      await navigateToCasesApp(getPageObject, getService, owner);
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    it('creates a case', async () => {
      const caseTitle = 'test-' + uuidv4();
      await cases.create.openCreateCasePage();
      await cases.create.createCase({
        title: caseTitle,
        description: 'test description',
        tag: 'tagme',
        severity: CaseSeverity.HIGH,
        category: 'new',
      });

      await testSubjects.click('create-case-submit');

      await testSubjects.existOrFail('case-view-title', {
        timeout: config.get('timeouts.waitFor'),
      });

      // validate title
      const title = await find.byCssSelector('[data-test-subj="editable-title-header-value"]');
      expect(await title.getVisibleText()).equal(caseTitle);

      // validate description
      const description = await testSubjects.find('scrollable-markdown');
      expect(await description.getVisibleText()).equal('test description');

      // validate tag exists
      await testSubjects.existOrFail('tag-tagme');

      // validate category exists
      await testSubjects.existOrFail('category-viewer-new');

      // validate no connector added
      const button = await find.byCssSelector('[data-test-subj*="case-callout"] button');
      expect(await button.getVisibleText()).equal('Add connector');
    });

    describe('customFields', () => {
      it('creates a case with custom fields', async () => {
        const customFields = [
          {
            key: 'valid_key_1',
            label: 'Summary',
            type: CustomFieldTypes.TEXT as const,
            required: false,
          },
          {
            key: 'valid_key_2',
            label: 'Sync',
            type: CustomFieldTypes.TOGGLE as const,
            required: false,
          },
        ];

        await cases.api.createConfigWithCustomFields({ customFields, owner });

        const caseTitle = 'test-' + uuidv4();
        await cases.create.openCreateCasePage();

        // verify custom fields on create case page
        await testSubjects.existOrFail('caseCustomFields');

        await cases.create.setTitle(caseTitle);
        await cases.create.setDescription('this is a test description');

        // set custom field values
        const textCustomField = await testSubjects.find(
          `${customFields[0].key}-text-create-custom-field`
        );
        await textCustomField.type('This is a sample text!');

        const toggleCustomField = await testSubjects.find(
          `${customFields[1].key}-toggle-create-custom-field`
        );
        await toggleCustomField.click();

        await cases.create.submitCase();

        await header.waitUntilLoadingHasFinished();

        await testSubjects.existOrFail('case-view-title');

        // validate custom fields
        const summary = await testSubjects.find(`case-text-custom-field-${customFields[0].key}`);

        expect(await summary.getVisibleText()).equal('This is a sample text!');

        const sync = await testSubjects.find(
          `case-toggle-custom-field-form-field-${customFields[1].key}`
        );
        expect(await sync.getAttribute('aria-checked')).equal('true');
      });
    });
  });
};
