/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { CaseSeverity } from '@kbn/cases-plugin/common/api';
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
      });

      await testSubjects.existOrFail('case-view-title', {
        timeout: config.get('timeouts.waitFor'),
      });

      // validate title
      const title = await find.byCssSelector('[data-test-subj="header-page-title"]');
      expect(await title.getVisibleText()).equal(caseTitle);

      // validate description
      const description = await testSubjects.find('scrollable-markdown');
      expect(await description.getVisibleText()).equal('test description');

      // validate tag exists
      await testSubjects.existOrFail('tag-tagme');

      // validate no connector added
      const button = await find.byCssSelector('[data-test-subj*="case-callout"] button');
      expect(await button.getVisibleText()).equal('Add connector');
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
        await testSubjects.existOrFail('user-profile-assigned-user-group-cases_all_user');
        await testSubjects.existOrFail('user-profile-assigned-user-group-cases_all_user2');
      });
    });
  });
};
