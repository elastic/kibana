/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  describe('Create case ', function () {
    const common = getPageObject('common');
    const find = getService('find');
    const casesApp = getService('casesApp');

    before(async () => {
      await common.navigateToApp('casesStackManagement');
    });

    after(async () => {
      casesApp.api.deleteAllCases();
    });

    describe('creating a case', () => {
      it('creates a case from the stack managament page', async () => {
        const caseTitle = 'test-' + uuid.v4();
        await casesApp.common.createCaseFromCreateCasePage(caseTitle);
        const title = await find.byCssSelector('[data-test-subj="header-page-title"]');
        expect(await title.getVisibleText()).equal(caseTitle);
      });
    });
  });
};
