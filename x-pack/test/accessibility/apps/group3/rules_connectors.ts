/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for rules, logs and connectors page

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');

  // Failing: See https://github.com/elastic/kibana/issues/145452
  describe.skip('Kibana Alerts - rules tab accessibility tests', () => {
    before(async () => {
      await PageObjects.settings.navigateTo();
      await testSubjects.click('triggersActions');
    });
    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('a11y test on rules and connectors main page', async () => {
      await a11y.testAppSnapshot();
    });

    it('a11y test on create rules panel', async () => {
      await testSubjects.click('createFirstRuleButton');
      await a11y.testAppSnapshot();
    });
    // https://github.com/elastic/kibana/issues/144953
    it.skip('a11y test on inputs on rules panel', async () => {
      await testSubjects.click('ruleNameInput');
      await testSubjects.setValue('ruleNameInput', 'testRule');
      await testSubjects.click('tagsComboBox');
      await testSubjects.setValue('tagsComboBox', 'ruleTag');
      await testSubjects.click('intervalFormRow');
      await testSubjects.click('notifyWhenSelect');
      await testSubjects.click('onActiveAlert');
      await testSubjects.click('solutionsFilterButton');
      await a11y.testAppSnapshot();
      await testSubjects.click('solutionapmFilterOption');
      await testSubjects.setValue('solutionsFilterButton', 'solutionapmFilterOption');
      await testSubjects.click('apm.anomaly-SelectOption');
      await a11y.testAppSnapshot();
    });
    // https://github.com/elastic/kibana/issues/144953
    it.skip('a11y test on save rule without connectors panel', async () => {
      await toasts.dismissAll();
      await testSubjects.click('saveRuleButton');
      await a11y.testAppSnapshot();
    });
    // https://github.com/elastic/kibana/issues/144953
    it.skip('a11y test on alerts and logs page with one rule populated', async () => {
      await testSubjects.click('confirmModalConfirmButton');
      await a11y.testAppSnapshot();
      await testSubjects.click('checkboxSelectAll');
      await testSubjects.click('deleteActionHoverButton');
      await testSubjects.click('confirmModalConfirmButton');
    });

    // uncomment after rules tests a11y violations get fixed
    it.skip('a11y test on logs tab', async () => {
      await testSubjects.click('logsTab');
      await a11y.testAppSnapshot();
    });

    it('a11y test on connectors tab with create first connector message screen', async () => {
      await PageObjects.settings.navigateTo();
      await testSubjects.click('triggersActionsConnectors');
      await a11y.testAppSnapshot();
    });

    it('a11y test on create connector panel', async () => {
      await testSubjects.click('createFirstActionButton');
      await a11y.testAppSnapshot();
    });

    // Adding a11y test for one connector
    it('a11y test on email connectors', async () => {
      await testSubjects.click('.email-card');
      await a11y.testAppSnapshot();
      await testSubjects.click('create-connector-flyout-back-btn');
    });
  });
}
