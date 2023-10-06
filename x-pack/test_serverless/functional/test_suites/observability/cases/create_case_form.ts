/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';
import { OBSERVABILITY_OWNER } from '@kbn/cases-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { navigateToCasesApp } from '../../../../shared/lib/cases';

const owner = OBSERVABILITY_OWNER;

export default ({ getService, getPageObject }: FtrProviderContext) => {
  describe('Create Case', function () {
    // security_exception: action [indices:data/write/delete/byquery] is unauthorized for user [elastic] with effective roles [superuser] on restricted indices [.kibana_alerting_cases], this action is granted by the index privileges [delete,write,all]
    this.tags(['failsOnMKI']);
    const find = getService('find');
    const cases = getService('cases');
    const testSubjects = getService('testSubjects');
    const svlCommonPage = getPageObject('svlCommonPage');
    const config = getService('config');
    const header = getPageObject('header');

    before(async () => {
      await svlCommonPage.login();
    });

    beforeEach(async () => {
      await navigateToCasesApp(getPageObject, getService, owner);
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await cases.api.deleteAllCases();
      await svlCommonPage.forceLogout();
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
  });
};
