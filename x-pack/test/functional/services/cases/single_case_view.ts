/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const replaceNewLinesWithSpace = (str: string) => str.replace(/\n/g, ' ');

export function CasesSingleViewServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');
  const header = getPageObject('header');
  const find = getService('find');

  return {
    async deleteCase() {
      await common.clickAndValidate('property-actions-ellipses', 'property-actions-trash');
      await common.clickAndValidate('property-actions-trash', 'confirmModalConfirmButton');
      await testSubjects.click('confirmModalConfirmButton');
      await header.waitUntilLoadingHasFinished();
    },

    async verifyUserAction(dataTestSubj: string, contentToMatch: string) {
      const userAction = await find.byCssSelector(
        `[data-test-subj^="${dataTestSubj}"] .euiCommentEvent`
      );

      const userActionText = replaceNewLinesWithSpace(await userAction.getVisibleText());

      expect(userActionText).contain(contentToMatch);
    },
  };
}
