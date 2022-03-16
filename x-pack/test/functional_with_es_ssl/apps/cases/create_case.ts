/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  describe('Create case ', function () {
    const common = getPageObject('common');
    const testSubjects = getService('testSubjects');
    const find = getService('find');
    const comboBox = getService('comboBox');
    const casesApp = getService('casesApp');
    before(async () => {
      await common.navigateToApp('casesStackManagement');
    });

    after(async () => {});

    it('creates a case from the stack managament page', async () => {
      await casesApp.openCreateCasePage();

      // case name
      await testSubjects.setValue('input', 'test ' + uuid.v4());

      // case tag
      await comboBox.setCustom('comboBoxInput', 'tagme');

      // case description
      const descriptionArea = await find.byCssSelector('textarea.euiMarkdownEditorTextArea');
      await descriptionArea.focus();
      await descriptionArea.type('Test description');

      // save
      testSubjects.click('create-case-submit');

      await testSubjects.existOrFail('case-view-title');
    });
  });
};
