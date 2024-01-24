/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { CaseSeverity, CustomFieldTypes } from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../../cases_api_integration/common/lib/authentication';
import { users, roles, casesAllUser, casesAllUser2 } from '../common';

export default ({ getService, getPageObject }: FtrProviderContext) => {
  describe('Create case', function () {
    const find = getService('find');
    const cases = getService('cases');
    const testSubjects = getService('testSubjects');
    const config = getService('config');
    const comboBox = getService('comboBox');
    const header = getPageObject('header');

    beforeEach(async () => {
      await cases.navigation.navigateToApp();
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('creates a case from the stack management page', async () => {
      const caseTitle = 'test-' + uuidv4();
      await cases.create.openCreateCasePage();
      await cases.create.createCase({
        title: caseTitle,
        description: 'test description',
        tag: 'tagme',
        severity: CaseSeverity.HIGH,
        category: 'new',
      });

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

    it('displays errors correctly while creating a case', async () => {
      const caseTitle = Array(161).fill('x').toString();
      const longTag = Array(256).fill('a').toString();
      const longCategory = Array(51).fill('x').toString();

      await cases.create.openCreateCasePage();
      await cases.create.createCase({
        title: caseTitle,
        description: '',
        tag: longTag,
        severity: CaseSeverity.HIGH,
        category: longCategory,
      });

      const title = await find.byCssSelector('[data-test-subj="caseTitle"]');
      expect(await title.getVisibleText()).contain(
        'The length of the name is too long. The maximum length is 160 characters.'
      );

      const description = await testSubjects.find('caseDescription');
      expect(await description.getVisibleText()).contain('A description is required.');

      const tags = await testSubjects.find('caseTags');
      expect(await tags.getVisibleText()).contain(
        'The length of the tag is too long. The maximum length is 256 characters.'
      );

      const category = await testSubjects.find('case-create-form-category');
      expect(await category.getVisibleText()).contain(
        'The length of the category is too long. The maximum length is 50 characters.'
      );
    });

    describe('Assignees', function () {
      before(async () => {
        await createUsersAndRoles(getService, users, roles);
        await cases.api.activateUserProfiles([casesAllUser, casesAllUser2]);
      });

      after(async () => {
        await deleteUsersAndRoles(getService, users, roles);
      });

      it('creates a case with assignees', async () => {
        const caseTitle = 'test-' + uuidv4();
        await cases.create.openCreateCasePage();

        await cases.create.setTitle(caseTitle);
        await comboBox.set('createCaseAssigneesComboBox', 'cases_all_user');
        await comboBox.set('createCaseAssigneesComboBox', 'cases_all_user2');
        await cases.create.setDescription('my description');

        await cases.create.submitCase();

        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('case-view-title');
        await testSubjects.existOrFail('user-profile-assigned-user-cases_all_user-remove-group');
        await testSubjects.existOrFail('user-profile-assigned-user-cases_all_user2-remove-group');
      });
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

        await cases.api.createConfigWithCustomFields({ customFields, owner: 'cases' });

        const caseTitle = 'test-' + uuidv4();
        await cases.create.openCreateCasePage();

        // verify custom fields on create case page
        await testSubjects.existOrFail('create-case-custom-fields');

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

      it('creates a case with custom fields that have default values', async () => {
        const customFields = [
          {
            key: 'valid_key_3',
            label: 'Summary required',
            type: CustomFieldTypes.TEXT as const,
            defaultValue: 'Default value',
            required: true,
          },
          {
            key: 'valid_key_4',
            label: 'Sync required',
            type: CustomFieldTypes.TOGGLE as const,
            defaultValue: true,
            required: true,
          },
        ];

        await cases.api.createConfigWithCustomFields({ customFields, owner: 'cases' });

        const caseTitle = 'test-' + uuidv4();
        await cases.create.openCreateCasePage();

        // verify custom fields on create case page
        await testSubjects.existOrFail('create-case-custom-fields');

        await cases.create.setTitle(caseTitle);
        await cases.create.setDescription('this is a test description');

        // submit without touching the custom fields
        await cases.create.submitCase();

        await header.waitUntilLoadingHasFinished();

        await testSubjects.existOrFail('case-view-title');

        // validate custom fields
        const textCustomField = await testSubjects.find(
          `case-text-custom-field-${customFields[0].key}`
        );

        expect(await textCustomField.getVisibleText()).equal(customFields[0].defaultValue);

        const toggleCustomField = await testSubjects.find(
          `case-toggle-custom-field-form-field-${customFields[1].key}`
        );
        expect(await toggleCustomField.getAttribute('aria-checked')).equal('true');
      });
    });
  });
};
