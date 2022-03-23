/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  describe('Create case', function () {
    const find = getService('find');
    const cases = getService('cases');
    const testSubjects = getService('testSubjects');

    before(async () => {
      await cases.navigation.navigateToApp();
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('creates a case from the stack management page', async () => {
      const caseTitle = 'test-' + uuid.v4();
      await cases.common.createCaseFromCreateCasePage({
        title: caseTitle,
        description: 'test description',
        tag: 'tagme',
      });

      // validate title
      const title = await find.byCssSelector('[data-test-subj="header-page-title"]');
      expect(await title.getVisibleText()).equal(caseTitle);

      // validate description
      const description = await testSubjects.find('user-action-markdown');
      expect(await description.getVisibleText()).equal('test description');

      // validate tag exists
      await testSubjects.existOrFail('tag-tagme');

      // validate no connector added
      const button = await find.byCssSelector('[data-test-subj*="case-callout"] button');
      expect(await button.getVisibleText()).equal('Add connector');
    });
  });
};
