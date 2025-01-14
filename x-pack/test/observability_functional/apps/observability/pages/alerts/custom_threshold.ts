/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Key } from 'selenium-webdriver';
import expect from 'expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const find = getService('find');
  const logger = getService('log');
  const retry = getService('retry');

  // FLAKY: https://github.com/elastic/kibana/issues/196766
  describe.skip('Custom threshold rule', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const DATA_VIEW_1 = 'filebeat-*';
    const DATA_VIEW_1_ID = 'data-view-id_1';
    const DATA_VIEW_1_NAME = 'test-data-view-name_1';
    const DATA_VIEW_2 = 'metricbeat-*';
    const DATA_VIEW_2_ID = 'data-view-id_2';
    const DATA_VIEW_2_NAME = 'test-data-view-name_2';

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      // create two data views
      await observability.alerts.common.createDataView({
        supertest,
        name: DATA_VIEW_1_NAME,
        id: DATA_VIEW_1_ID,
        title: DATA_VIEW_1,
        logger,
      });
      await observability.alerts.common.createDataView({
        supertest,
        name: DATA_VIEW_2_NAME,
        id: DATA_VIEW_2_ID,
        title: DATA_VIEW_2,
        logger,
      });
      await observability.alerts.common.navigateToRulesPage();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      // This also deletes the created data views
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('shows the custom threshold rule in the observability section', async () => {
      await observability.alerts.rulesPage.clickCreateRuleButton();
      await observability.alerts.rulesPage.clickOnObservabilityCategory();
      await observability.alerts.rulesPage.clickOnCustomThresholdRule();
    });

    it('can add name and tags', async () => {
      await testSubjects.setValue('ruleNameInput', 'test custom threshold rule');
      await testSubjects.setValue('comboBoxSearchInput', 'tag1');
    });

    it('can add data view', async () => {
      // select data view
      await testSubjects.click('selectDataViewExpression');
      await testSubjects.setValue('indexPattern-switcher--input', 'test-data-view-name_2');
      const dataViewExpression = await find.byCssSelector(
        '[data-test-subj="indexPattern-switcher--input"]'
      );
      await dataViewExpression.pressKeys(Key.ENTER);
      await retry.waitFor('data view selection to happen', async () => {
        const dataViewSelector = await testSubjects.find('selectDataViewExpression');
        return (await dataViewSelector.getVisibleText()) === 'DATA VIEW\ntest-data-view-name_2';
      });
    });

    it('can select aggregation', async () => {
      // select aggregation
      await testSubjects.click('aggregationNameA');
      await testSubjects.click('aggregationTypeSelect');
      // assert all options are available
      await find.byCssSelector('option[value="avg"]');
      await find.byCssSelector('option[value="min"]');
      await find.byCssSelector('option[value="max"]');
      await find.byCssSelector('option[value="sum"]');
      await find.byCssSelector('option[value="count"]');
      await find.byCssSelector('option[value="cardinality"]');
      await find.byCssSelector('option[value="p99"]');
      await find.byCssSelector('option[value="p95"]');
      await find.byCssSelector('option[value="rate"]');

      // set first aggregation
      await find.clickByCssSelector(`option[value="avg"]`);
      const input1 = await find.byCssSelector('[data-test-subj="aggregationField"] input');
      await input1.type('metricset.rtt');
      await testSubjects.click('o11yClosablePopoverTitleButton');
      await retry.waitFor('first aggregation to happen', async () => {
        const aggregationNameA = await testSubjects.find('aggregationNameA');
        return (await aggregationNameA.getVisibleText()) === 'AVERAGE\nmetricset.rtt';
      });
      await new Promise((r) => setTimeout(r, 1000));

      // set second aggregation
      await testSubjects.click('thresholdRuleCustomEquationEditorAddAggregationFieldButton');
      await testSubjects.click('aggregationNameB');
      await testSubjects.setValue('o11ySearchField', 'service.name : "opbeans-node"');
      await testSubjects.click('o11yClosablePopoverTitleButton');
      await retry.waitFor('first aggregation to happen', async () => {
        const aggregationNameB = await testSubjects.find('aggregationNameB');
        return (await aggregationNameB.getVisibleText()) === 'COUNT\nservice.name : "opbeans-node"';
      });
      await new Promise((r) => setTimeout(r, 1000));
    });

    it('can set custom equation', async () => {
      // set custom equation
      await testSubjects.click('customEquation');
      const customEquationField = await find.byCssSelector(
        '[data-test-subj="thresholdRuleCustomEquationEditorFieldText"]'
      );
      await customEquationField.click();
      await customEquationField.type('A - B');
      await testSubjects.click('o11yClosablePopoverTitleButton');
      await retry.waitFor('custom equation update to happen', async () => {
        const customEquation = await testSubjects.find('customEquation');
        return (await customEquation.getVisibleText()) === 'EQUATION\nA - B';
      });
      await new Promise((r) => setTimeout(r, 1000));
    });

    it('can set threshold', async () => {
      // set threshold
      await testSubjects.click('thresholdPopover');
      await testSubjects.click('comparatorOptionsComboBox');
      // assert all options are available
      await find.byCssSelector('option[value=">="]');
      await find.byCssSelector('option[value="<="]');
      await find.byCssSelector('option[value=">"]');
      await find.byCssSelector('option[value="<"]');
      await find.byCssSelector('option[value="between"]');
      await find.byCssSelector('option[value="notBetween"]');
      // select an option
      await find.clickByCssSelector(`option[value="notBetween"]`);
      const thresholdField1 = await find.byCssSelector('[data-test-subj="alertThresholdInput0"]');
      await thresholdField1.click();
      await new Promise((r) => setTimeout(r, 1000));
      await thresholdField1.pressKeys(Key.BACK_SPACE);
      await new Promise((r) => setTimeout(r, 1000));
      await thresholdField1.pressKeys(Key.BACK_SPACE);
      await new Promise((r) => setTimeout(r, 1000));
      await thresholdField1.pressKeys(Key.BACK_SPACE);
      await thresholdField1.type('200');
      const thresholdField2 = await find.byCssSelector('[data-test-subj="alertThresholdInput1"]');
      await thresholdField2.type('250');
      await find.clickByCssSelector('[aria-label="Close"]');
      await retry.waitFor('comparator selection to happen', async () => {
        const customEquation = await testSubjects.find('thresholdPopover');
        return (await customEquation.getVisibleText()) === 'IS NOT BETWEEN\n200 AND 250';
      });
    });

    it('can set equation label', async () => {
      // set equation label
      await testSubjects.setValue(
        'thresholdRuleCustomEquationEditorFieldTextLabel',
        'test equation'
      );
    });

    it('can set time range', async () => {
      // set time range
      await testSubjects.click('forLastExpression');
      await new Promise((r) => setTimeout(r, 1000));
      const timeRangeField = await find.byCssSelector('[data-test-subj="timeWindowSizeNumber"]');
      await timeRangeField.click();
      await new Promise((r) => setTimeout(r, 1000));
      await timeRangeField.pressKeys(Key.BACK_SPACE);
      await timeRangeField.type('2');
      // assert all options are available
      await testSubjects.click('timeWindowUnitSelect');
      await find.byCssSelector('option[value="s"]');
      await find.byCssSelector('option[value="m"]');
      await find.byCssSelector('option[value="h"]');
      await find.byCssSelector('option[value="d"]');
      // select an option
      await new Promise((r) => setTimeout(r, 3000));
      await find.clickByCssSelector('[data-test-subj="timeWindowUnitSelect"] option[value="d"]');
      await find.clickByCssSelector('[aria-label="Close"]');
    });

    it('can set groupby', async () => {
      // set group by
      const groupByField = await find.byCssSelector(
        '[data-test-subj="thresholdRuleMetricsExplorer-groupBy"] [data-test-subj="comboBoxSearchInput"]'
      );
      await groupByField.type('docker.container.name');
    });

    it('can save the rule', async () => {
      await testSubjects.click('saveRuleButton');
      await testSubjects.click('confirmModalConfirmButton');
      await find.byCssSelector('button[title="test custom threshold rule"]');
    });

    it('saved the rule correctly', async () => {
      const { body: rules } = await supertest
        .post('/internal/alerting/rules/_find')
        .set('kbn-xsrf', 'kibana')
        .send({});

      expect(rules.data.length).toEqual(1);
      expect(rules.data[0]).toEqual(
        expect.objectContaining({
          name: 'test custom threshold rule',
          tags: ['tag1'],
          params: expect.objectContaining({
            alertOnGroupDisappear: false,
            alertOnNoData: false,
            criteria: [
              {
                comparator: 'notBetween',
                label: 'test equation',
                equation: 'A - B',
                metrics: [
                  {
                    aggType: 'avg',
                    field: 'metricset.rtt',
                    name: 'A',
                  },
                  {
                    aggType: 'count',
                    filter: 'service.name : "opbeans-node"',
                    name: 'B',
                  },
                ],
                threshold: [200, 250],
                timeSize: 2,
                timeUnit: 'd',
              },
            ],
            groupBy: ['docker.container.name'],
            searchConfiguration: {
              index: 'data-view-id_2',
              query: { query: '', language: 'kuery' },
            },
          }),
        })
      );
    });
  });
};
