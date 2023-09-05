/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';
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

    it('trims fields correctly while creating a case', async () => {
      const titleWithSpace = 'This is a title with spaces       ';
      const descriptionWithSpace =
        'This is a case description with empty spaces at the end!!             ';
      const categoryWithSpace = 'security        ';
      const tagWithSpace = 'coke     ';

      await cases.create.openCreateCasePage();
      await cases.create.createCase({
        title: titleWithSpace,
        description: descriptionWithSpace,
        tag: tagWithSpace,
        severity: CaseSeverity.HIGH,
        category: categoryWithSpace,
      });

      // validate title is trimmed
      const title = await find.byCssSelector('[data-test-subj="editable-title-header-value"]');
      expect(await title.getVisibleText()).equal(titleWithSpace.trim());

      // validate description is trimmed
      const description = await testSubjects.find('scrollable-markdown');
      expect(await description.getVisibleText()).equal(descriptionWithSpace.trim());

      // validate tag exists and is trimmed
      const tag = await testSubjects.find(`tag-${tagWithSpace.trim()}`);
      expect(await tag.getVisibleText()).equal(tagWithSpace.trim());

      // validate category exists and is trimmed
      const category = await testSubjects.find(`category-viewer-${categoryWithSpace.trim()}`);
      expect(await category.getVisibleText()).equal(categoryWithSpace.trim());
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
  });
};
