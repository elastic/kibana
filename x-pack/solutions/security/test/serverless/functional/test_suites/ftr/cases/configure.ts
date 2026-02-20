/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { navigateToCasesApp } from '@kbn/test-suites-xpack-platform/serverless/shared/lib/cases/helpers';
import type { FtrProviderContext } from '../../../ftr_provider_context';

const owner = SECURITY_SOLUTION_OWNER;

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const common = getPageObject('common');
  const header = getPageObject('header');
  const svlCommonPage = getPageObject('svlCommonPage');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const svlCases = getService('svlCases');
  const toasts = getService('toasts');
  const retry = getService('retry');
  const find = getService('find');
  const comboBox = getService('comboBox');

  // Failing: See https://github.com/elastic/kibana/issues/251532
  describe.skip('Configure Case', function () {
    before(async () => {
      await svlCommonPage.loginAsAdmin();
      await navigateToCasesApp(getPageObject, getService, owner);

      await retry.waitFor('configure-case-button exist', async () => {
        return await testSubjects.exists('configure-case-button');
      });

      await common.clickAndValidate('configure-case-button', 'case-configure-title');
      await header.waitUntilLoadingHasFinished();

      await retry.waitFor('case-configure-title exist', async () => {
        return await testSubjects.exists('case-configure-title');
      });
    });

    after(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    describe('Closure options', function () {
      it('defaults the closure option correctly', async () => {
        await cases.common.assertRadioGroupValue('closure-options-radio-group', 'close-by-user');
      });

      it('change closure option successfully', async () => {
        await cases.common.selectRadioGroupValue('closure-options-radio-group', 'close-by-pushing');
        const toast = await toasts.getElementByIndex(1);
        expect(await toast.getVisibleText()).to.be('Settings successfully updated');
        await toasts.dismissAll();
      });
    });

    describe('Connectors', function () {
      it('defaults the connector to none correctly', async () => {
        await retry.waitFor('dropdown-connector-no-connector to exist', async () => {
          return await testSubjects.exists('dropdown-connector-no-connector-label');
        });
      });

      it('opens and closes the connectors flyout correctly', async () => {
        await common.clickAndValidate('add-new-connector', 'euiFlyoutCloseButton');
        await testSubjects.click('euiFlyoutCloseButton');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);
      });
    });

    describe('Custom fields', function () {
      it('adds a custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        await common.clickAndValidate('add-custom-field', 'common-flyout');

        await testSubjects.setValue('custom-field-label-input', 'Summary');

        await testSubjects.setCheckbox('text-custom-field-required-wrapper', 'check');

        await testSubjects.click('common-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await testSubjects.existOrFail('custom-fields-list');

        expect(await testSubjects.getVisibleText('custom-fields-list')).to.be('Summary\nText');
      });

      it('edits a custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        const textField = await find.byCssSelector('[data-test-subj*="-custom-field-edit"]');

        await textField.click();

        const input = await testSubjects.find('custom-field-label-input');

        await input.type('!!!');

        await testSubjects.click('common-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await testSubjects.existOrFail('custom-fields-list');

        expect(await testSubjects.getVisibleText('custom-fields-list')).to.be('Summary!!!\nText');
      });

      it('deletes a custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        const deleteButton = await find.byCssSelector('[data-test-subj*="-custom-field-delete"]');

        await deleteButton.click();

        await testSubjects.existOrFail('confirm-delete-modal');

        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.missingOrFail('custom-fields-list');
      });
    });

    describe('Templates', function () {
      it('adds a template', async () => {
        await testSubjects.existOrFail('templates-form-group');
        await common.clickAndValidate('add-template', 'common-flyout');

        await testSubjects.setValue('template-name-input', 'Template name');
        await comboBox.setCustom('template-tags', 'tag-t1');
        await testSubjects.setValue('template-description-input', 'Template description');

        const caseTitle = await find.byCssSelector(
          `[data-test-subj="input"][aria-describedby="caseTitle"]`
        );
        await caseTitle.focus();
        await caseTitle.type('case with template');

        await cases.create.setDescription('test description');

        await cases.create.setTags('tagme');
        await cases.create.setCategory('new');

        await testSubjects.click('common-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await retry.waitFor('templates-list', async () => {
          return await testSubjects.exists('templates-list');
        });

        expect(await testSubjects.getVisibleText('templates-list')).to.be('Template name\ntag-t1');
      });

      it('updates a template', async () => {
        await testSubjects.existOrFail('templates-form-group');
        const editButton = await find.byCssSelector('[data-test-subj*="-template-edit"]');

        await editButton.click();

        await testSubjects.setValue('template-name-input', 'Updated template name!');
        await comboBox.setCustom('template-tags', 'tag-t1');
        await testSubjects.setValue('template-description-input', 'Template description updated');

        const caseTitle = await find.byCssSelector(
          `[data-test-subj="input"][aria-describedby="caseTitle"]`
        );
        await caseTitle.focus();
        await caseTitle.type('!!');

        await cases.create.setDescription('test description!!');

        await cases.create.setTags('case-tag');
        await cases.create.setCategory('new!');

        await testSubjects.click('common-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await retry.waitFor('templates-list', async () => {
          return await testSubjects.exists('templates-list');
        });

        expect(await testSubjects.getVisibleText('templates-list')).to.be(
          'Updated template name!\ntag-t1'
        );
      });

      it('deletes a template', async () => {
        await testSubjects.existOrFail('templates-form-group');
        const deleteButton = await find.byCssSelector('[data-test-subj*="-template-delete"]');

        await deleteButton.click();

        await testSubjects.existOrFail('confirm-delete-modal');

        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.missingOrFail('template-list');
      });
    });
  });
};
