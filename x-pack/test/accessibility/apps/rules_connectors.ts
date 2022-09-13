/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for spaces, space selection and space creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');

  describe('Kibana Alerts - rules tab accessibility tests', () => {
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

    it('a11y test on inputs on rules panel - name', async () => {
      await testSubjects.setValue('ruleNameInput', 'testRule');
      await a11y.testAppSnapshot();
    });

    it('a11y test on inputs on rules panel - tags', async () => {
      await testSubjects.setValue('comboBoxInput', 'ruleTag');
      await a11y.testAppSnapshot();
    });

    it('a11y test on inputs on rules panel - interval form', async () => {
      await testSubjects.click('intervalFormRow');
      await a11y.testAppSnapshot();
    });

    it('a11y test on inputs on rules panel - notify panel', async () => {
      await testSubjects.click('notifyWhenSelect');
      await a11y.testAppSnapshot();
    });

    it('a11y test on inputs on rules panel - filter solutions panel', async () => {
      await testSubjects.click('onActionGroupChange');
      await testSubjects.click('solutionsFilterButton');
      await a11y.testAppSnapshot();
    });

    it('a11y test on inputs on rules panel after selecting apm anomaly', async () => {
      await testSubjects.click('apm.anomaly-SelectOption');
      await a11y.testAppSnapshot();
    });

    it('a11y test on save rule without connectors panel', async () => {
      await testSubjects.click('saveRuleButton');
      await a11y.testAppSnapshot();
    });

    it('a11y test on alerts and connectors page with one rule populated', async () => {
      await testSubjects.click('confirmModalConfirmButton');
      await a11y.testAppSnapshot();
    });

    it('a11y test on connectors tab with create first connector message screen', async () => {
      await testSubjects.click('connectorsTab');
      await a11y.testAppSnapshot();
    });

    it('a11y test on create connector panel', async () => {
      await testSubjects.click('createFirstActionButton');
      await a11y.testAppSnapshot();
    });

    // Adding a11y test for two connectors
    it('a11y test on email connectors', async () => {
      await testSubjects.click('.email-card');
      await a11y.testAppSnapshot();
      await testSubjects.click('create-connector-flyout-back-btn');
    });

    it('a11y test on service now itom card connector', async () => {
      await testSubjects.click('.servicenow-itom-card');
      await a11y.testAppSnapshot();
      await testSubjects.click('euiFlyoutCloseButton');
    });

    it('a11y test on logs tab', async () => {
      await testSubjects.click('logsTab');
      await a11y.testAppSnapshot();
    });
  });
}
