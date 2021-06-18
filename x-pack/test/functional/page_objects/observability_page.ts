/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

export function ObservabilityPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    async expectCreateCaseButtonEnabled() {
      const button = await testSubjects.find('createNewCaseBtn', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be(null);
    },

    async expectCreateCaseButtonDisabled() {
      const button = await testSubjects.find('createNewCaseBtn', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be('true');
    },

    async expectReadOnlyCallout() {
      await testSubjects.existOrFail('case-callout-e41900b01c9ef0fa81dd6ff326083fb3');
    },

    async expectNoReadOnlyCallout() {
      await testSubjects.missingOrFail('case-callout-e41900b01c9ef0fa81dd6ff326083fb3');
    },

    async expectCreateCase() {
      await testSubjects.existOrFail('case-creation-form-steps');
    },

    async expectAddCommentButton() {
      const button = await testSubjects.find('submit-comment', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be(null);
    },

    async expectAddCommentButtonDisabled() {
      const button = await testSubjects.find('submit-comment', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be('true');
    },

    async expectForbidden() {
      const h2 = await find.byCssSelector('body', 20000);
      const text = await h2.getVisibleText();
      expect(text).to.contain('Kibana feature privileges required');
    },
  };
}
