/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService, getPageObject }: FtrProviderContext) => {
  const common = getPageObject('common');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const find = getService('find');
  const logger = getService('log');
  const retry = getService('retry');

  describe('Custom threshold preview chart', () => {
    const observability = getService('observability');
    const DATA_VIEW_1 = 'metricbeat-*';
    const DATA_VIEW_1_ID = 'data-view-id_1';
    const DATA_VIEW_1_NAME = 'test-data-view-name_1';

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await observability.alerts.common.createDataView({
        supertest,
        name: DATA_VIEW_1_NAME,
        id: DATA_VIEW_1_ID,
        title: DATA_VIEW_1,
        logger,
      });
      await observability.alerts.common.navigateToRulesPage();
      // TODO Remove when it's fixed https://github.com/elastic/kibana/issues/201805
      await common.sleep(1000);
      if (await testSubjects.exists('toastCloseButton')) {
        await testSubjects.click('toastCloseButton');
      }
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      // This also deletes the created data views
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('does render the empty chart only once at bootstrap', async () => {
      await observability.alerts.rulesPage.clickCreateRuleButton();
      await observability.alerts.rulesPage.clickOnObservabilityCategory();
      await observability.alerts.rulesPage.clickOnCustomThresholdRule();
      await common.sleep(1000);
      expect(await find.existsByCssSelector('[data-rendering-count="2"]')).toBe(true);
    });

    it('does render the correct error message', async () => {
      await testSubjects.setValue('ruleNameInput', 'test custom threshold rule');

      await testSubjects.click('customEquation');
      const customEquationField = await find.byCssSelector(
        '[data-test-subj="thresholdRuleCustomEquationEditorFieldText"]'
      );
      await customEquationField.click();
      // set an invalid equation
      await customEquationField.type('A + ');

      await testSubjects.click('o11yClosablePopoverTitleButton');

      await testSubjects.existOrFail('embeddable-lens-failure');
      const el = await find.byCssSelector('[data-test-subj="embeddable-lens-failure"] p');
      const textContent = await el.getVisibleText();
      expect(textContent).toBe('An error occurred while rendering the chart');
    });

    it('does render the chart after fixing the error', async () => {
      await testSubjects.click('customEquation');
      const customEquationField = await find.byCssSelector(
        '[data-test-subj="thresholdRuleCustomEquationEditorFieldText"]'
      );
      await customEquationField.click();
      // fix the equation
      await customEquationField.type('A');
      await testSubjects.click('o11yClosablePopoverTitleButton');

      // check no error is visible
      await testSubjects.missingOrFail('embeddable-lens-failure');
      await retry.waitFor('Chart rendered correctly', () => {
        return find.existsByCssSelector('[data-render-complete="true"]');
      });
    });
  });
};
