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

  describe('Custom threshold rule', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const dataView1 = 'filebeat-*';
    const dataView2 = 'metricbeat-*';
    const timeFieldName = '@timestamp';

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      // create two data views
      await supertest
        .post(`/api/saved_objects/index-pattern`)
        .set('kbn-xsrf', 'true')
        .send({ attributes: { title: dataView1, timeFieldName } });
      await supertest
        .post(`/api/saved_objects/index-pattern`)
        .set('kbn-xsrf', 'true')
        .send({ attributes: { title: dataView2, timeFieldName } });
      await observability.alerts.common.navigateToRulesPage();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('shows the custom threshold rule in the observability section', async () => {
      await observability.alerts.rulesPage.clickCreateRuleButton();
      await observability.alerts.rulesPage.clickOnObservabilityCategory();
      await testSubjects.existOrFail('observability.rules.custom_threshold-SelectOption');
      await observability.alerts.rulesPage.clickOnCustomThresholdRule();
    });

    it('can add name and tags', async () => {
      await testSubjects.setValue('ruleNameInput', 'test custom threshold rule');
      await testSubjects.setValue('comboBoxSearchInput', 'tag1');
    });

    it('can add data view', async () => {
      // select data view
      await testSubjects.click('selectDataViewExpression');
      await testSubjects.setValue('indexPattern-switcher--input', 'metricbeat-*');
      const dataViewExpression = await find.byCssSelector(
        '[data-test-subj="indexPattern-switcher--input"]'
      );
      await dataViewExpression.pressKeys(Key.ENTER);
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

      // set second aggregation
      await testSubjects.click('thresholdRuleCustomEquationEditorAddAggregationFieldButton');
      await testSubjects.click('aggregationNameB');
      await testSubjects.setValue('ruleKqlFilterSearchField', 'service.name : "opbeans-node"');
      await testSubjects.click('o11yClosablePopoverTitleButton');
    });

    // it('can set custom equation', async () => {
    // set custom equation
    // await testSubjects.click('customEquation');
    // const customEquationField = await find.byCssSelector(
    //   '[data-test-subj="thresholdRuleCustomEquationEditorFieldText"]'
    // );
    // await customEquationField.click();
    // await customEquationField.type('A - B');
    // await testSubjects.click('o11yClosablePopoverTitleButton');
    // });

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
      thresholdField2.type('250');
      await find.clickByCssSelector('[aria-label="Close"]');
    });

    it('can set equation label', async () => {
      // set equation label
      await testSubjects.setValue('thresholdRuleCustomEquationEditorFieldText', 'test equation');
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
        .set('kbn-xsrf', 'true')
        .send({
          page: 1,
          per_page: 10,
          filter: `{
            "type": "function",
            "function": "or",
            "arguments": [
              {
                "type": "function",
                "function": "is",
                "arguments": [
                  {
                    "type": "literal",
                    "value": "alert.attributes.alertTypeId",
                    "isQuoted": false
                  },
                  {
                    "type": "literal",
                    "value": "observability.rules.custom_threshold",
                    "isQuoted": false
                  }
                ]
              }
            ]
          }`,
          sort_field: 'name',
          sort_order: 'asc',
          filter_consumers: ['apm', 'infrastructure', 'logs', 'uptime', 'slo', 'observability'],
        });
      expect(rules.data.length).toEqual(1);
      expect(rules.data[0]).toEqual(
        expect.objectContaining({
          name: 'test custom threshold rule',
          tags: ['tag1'],
          params: expect.objectContaining({
            alertOnGroupDisappear: true,
            alertOnNoData: true,
            criteria: [
              {
                comparator: '>',
                label: 'test equation',
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
            // searchConfiguration: {
            //   index: 'ef4deffb-805f-4aed-ad80-f481ee47d40b',
            //   query: {
            //     language: 'kuery',
            //     query: '',
            //   },
            // },
          }),
        })
      );
    });
  });
};
