/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { createRulesPageHelpers, type RuleResponse } from '../helpers';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const observability = getService('observability');

  const RULE_ALERT_INDEX_PATTERN = '.alerts-stack.alerts-*';

  const PageObjects = getPageObjects(['header']);

  const { getRuleByName, deleteRuleById, navigateAndOpenRuleTypeModal } =
    createRulesPageHelpers(getService);

  describe('Custom threshold rule with ad-hoc data view', function () {
    this.tags('includeFirefox');

    const AD_HOC_DATA_VIEW_PATTERN = '.alerts-*';
    const CUSTOM_THRESHOLD_RULE_NAME = 'Custom threshold rule with ad-hoc data view';
    // A dummy data view is needed so the "Explore matching indices" button appears
    // (the button only shows when dataViewsList.length > 0)
    const DUMMY_DATA_VIEW_ID = 'dummy-data-view-for-test';
    const DUMMY_DATA_VIEW_TITLE = 'dummy-pattern-*';

    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/infra/metrics_and_logs'
      );
      await observability.alerts.common.navigateWithoutFilter();
      await esClient.deleteByQuery({
        index: RULE_ALERT_INDEX_PATTERN,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await kibanaServer.savedObjects.cleanStandardList();

      // Create a dummy data view so the data view list is not empty
      const logger = getService('log');
      await observability.alerts.common.createDataView({
        supertest,
        id: DUMMY_DATA_VIEW_ID,
        name: 'Dummy Data View',
        title: DUMMY_DATA_VIEW_TITLE,
        logger,
      });
    });

    after(async () => {
      const rule = await getRuleByName(CUSTOM_THRESHOLD_RULE_NAME);
      if (rule) {
        await deleteRuleById(rule.id);
      }

      // Clean up the dummy data view
      const logger = getService('log');
      await observability.alerts.common.deleteDataView({
        supertest,
        id: DUMMY_DATA_VIEW_ID,
        logger,
      });

      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/infra/metrics_and_logs'
      );
      await esClient.deleteByQuery({
        index: RULE_ALERT_INDEX_PATTERN,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should create a custom threshold rule with an ad-hoc data view', async () => {
      await navigateAndOpenRuleTypeModal();

      // Select custom threshold rule type
      await observability.alerts.rulesPage.clickOnObservabilityCategory();
      await observability.alerts.rulesPage.clickOnCustomThresholdRule();

      await retry.waitFor(
        'Rule form is visible',
        async () => await testSubjects.exists('ruleForm')
      );

      // Set rule name
      await testSubjects.setValue('ruleDetailsNameInput', CUSTOM_THRESHOLD_RULE_NAME);

      // Type the pattern to trigger "Explore matching indices" button
      await testSubjects.click('selectDataViewExpression');
      await testSubjects.setValue('indexPattern-switcher--input', AD_HOC_DATA_VIEW_PATTERN);

      // Wait for the "Explore matching indices" button to appear (async index check with 250ms debounce)
      await retry.waitFor('Explore matching indices button to appear', async () =>
        testSubjects.exists('explore-matching-indices-button')
      );

      // Click the button to create an ad-hoc data view
      await testSubjects.click('explore-matching-indices-button');

      await retry.waitFor('data view selection to happen', async () => {
        const dataViewSelector = await testSubjects.find('selectDataViewExpression');
        return (await dataViewSelector.getVisibleText()).includes(AD_HOC_DATA_VIEW_PATTERN);
      });

      // Save the rule
      await testSubjects.click('rulePageFooterSaveButton');
      await testSubjects.click('confirmModalConfirmButton');

      await PageObjects.header.waitUntilLoadingHasFinished();

      // Verify the rule was created correctly
      let rule: RuleResponse | undefined;
      await retry.waitFor('rule to be created', async () => {
        rule = await getRuleByName(CUSTOM_THRESHOLD_RULE_NAME);
        return rule !== undefined;
      });
      // The ad-hoc data view should have the pattern as its title
      expect((rule!.params.searchConfiguration.index as { title: string }).title).to.eql(
        AD_HOC_DATA_VIEW_PATTERN
      );
    });
  });
};
