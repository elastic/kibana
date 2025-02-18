/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../ftr_provider_context';
import type { CasesCommon } from './common';

export interface CreateCaseParams {
  title?: string;
  description?: string;
  tag?: string;
  severity?: CaseSeverity;
  owner?: string;
  category?: string;
  assignees?: [];
}

export function CasesCreateViewServiceProvider(
  { getService, getPageObject }: FtrProviderContext,
  casesCommon: CasesCommon
) {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const comboBox = getService('comboBox');
  const retry = getService('retry');

  return {
    /**
     * Opens the create case page pressing the "create case" button.
     *
     * Doesn't do navigation. Only works if you are already inside a cases app page.
     * Does not work with the cases flyout.
     */
    async openCreateCasePage() {
      await testSubjects.click('createNewCaseBtn');
      await testSubjects.existOrFail('create-case-submit', {
        timeout: 5000,
      });
    },

    /**
     * it creates a new case from the create case page
     * and leaves the navigation in the case view page
     *
     * Doesn't do navigation. Only works if you are already inside a cases app page.
     */
    async createCase({
      title = 'test-' + uuidv4(),
      description = 'desc' + uuidv4(),
      tag = 'tagme',
      severity = CaseSeverity.LOW,
      category,
      owner,
    }: CreateCaseParams) {
      if (owner) {
        await this.setSolution(owner);
      }

      await this.setTitle(title);
      await this.setDescription(description);
      await this.setTags(tag);

      if (category) {
        await this.setCategory(category);
      }

      if (severity !== CaseSeverity.LOW) {
        await this.setSeverity(severity);
      }

      await this.submitCase();
    },

    async setTitle(title: string) {
      await testSubjects.setValue('input', title);
    },

    async setDescription(description: string) {
      const descriptionArea = await find.byCssSelector('textarea.euiMarkdownEditorTextArea');
      await descriptionArea.focus();
      await descriptionArea.type(description);
    },

    async setTags(tag: string) {
      await comboBox.setCustom('caseTags', tag);
    },

    async setCategory(category: string) {
      await comboBox.setCustom('categories-list', category);
    },

    async setSolution(owner: string) {
      await testSubjects.click('caseOwnerSuperSelect');
      await testSubjects.click(`${owner}OwnerOption`);
    },

    async setSeverity(severity: CaseSeverity) {
      await common.clickAndValidate(
        'case-severity-selection',
        `case-severity-selection-${severity}`
      );
    },

    async submitCase() {
      await testSubjects.click('create-case-submit');
    },

    async assertCreateCaseFlyoutVisible(expectVisible = true) {
      await retry.tryForTime(5000, async () => {
        if (expectVisible) {
          await testSubjects.existOrFail('create-case-flyout');
        } else {
          await testSubjects.missingOrFail('create-case-flyout');
        }
      });
    },

    async creteCaseFromFlyout(params: CreateCaseParams) {
      await this.assertCreateCaseFlyoutVisible(true);
      await this.createCase(params);
      await this.assertCreateCaseFlyoutVisible(false);
    },

    async createCaseFromModal(params: CreateCaseParams) {
      await casesCommon.assertCaseModalVisible(true);

      await retry.tryForTime(10000, async () => {
        await testSubjects.click('cases-table-add-case-filter-bar');
        await casesCommon.assertCaseModalVisible(false);
      });

      await this.creteCaseFromFlyout(params);
    },
  };
}
