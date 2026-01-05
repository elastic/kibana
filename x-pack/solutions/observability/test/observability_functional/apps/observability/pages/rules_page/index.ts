/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { createRulesPageHelpers } from './helpers';

const RULE_ALERT_INDEX_PATTERN = '.alerts-stack.alerts-*';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');
  const rulesService = getService('rules');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const RULE_ENDPOINT = '/api/alerting/rule';

  const PageObjects = getPageObjects(['header']);

  const { getRuleByName, deleteRuleById, navigateAndOpenRuleTypeModal } =
    createRulesPageHelpers(getService);

  async function createRule(rule: any): Promise<string> {
    const ruleResponse = await supertest.post(RULE_ENDPOINT).set('kbn-xsrf', 'foo').send(rule);
    expect(ruleResponse.status).to.eql(200);
    return ruleResponse.body.id;
  }

  const getRulesList = async (tableRows: any[]) => {
    const rows = [];
    for (const euiTableRow of tableRows) {
      const $ = await euiTableRow.parseDomContent();
      rows.push({
        name: $.findTestSubjects('rulesTableCell-name').text(),
        enabled: $.findTestSubjects('rulesTableCell-status').find('button').attr('title'),
      });
    }
    return rows;
  };

  const selectAndFillInEsQueryRule = async (ruleName: string) => {
    await testSubjects.click(`.es-query-SelectOption`);
    await retry.waitFor(
      'Create Rule form is visible',
      async () => await testSubjects.exists('ruleForm')
    );

    await testSubjects.setValue('ruleDetailsNameInput', ruleName);
    await testSubjects.click('queryFormType_esQuery');
    await testSubjects.click('selectIndexExpression');
    const indexComboBox = await find.byCssSelector('#indexSelectSearchBox');
    await indexComboBox.click();
    await indexComboBox.type('*');
    const filterSelectItems = await find.allByCssSelector(`.euiFilterSelectItem`);
    await filterSelectItems[1].click();
    await testSubjects.click('thresholdAlertTimeFieldSelect');
    await retry.try(async () => {
      const fieldOptions = await find.allByCssSelector('#thresholdTimeField option');
      expect(fieldOptions[1]).not.to.be(undefined);
      await fieldOptions[1].click();
    });
    await testSubjects.click('closePopover');
  };

  describe('Observability Rules page', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');

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
    });

    after(async () => {
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

    describe('Feature flag', () => {
      it('Link point to O11y Rules pages by default', async () => {
        const manageRulesPageHref =
          (await observability.alerts.rulesPage.getManageRulesPageHref()) ?? '';
        expect(new URL(manageRulesPageHref).pathname).equal('/app/observability/alerts/rules');
      });
    });

    describe('Rules table', () => {
      let metricThresholdRuleId: string;
      let logThresholdRuleId: string;
      before(async () => {
        const metricThresholdRule = {
          params: {
            criteria: [
              {
                aggType: 'avg',
                comparator: '>',
                threshold: [0.5],
                timeSize: 5,
                timeUnit: 'm',
                metric: 'system.cpu.user.pct',
              },
            ],
            sourceId: 'default',
            alertOnNoData: true,
            alertOnGroupDisappear: true,
          },
          consumer: 'infrastructure',
          tags: ['infrastructure'],
          name: 'metric-threshold',
          schedule: { interval: '1m' },
          rule_type_id: 'metrics.alert.threshold',
          notify_when: 'onActionGroupChange',
          actions: [],
        };
        const logThresholdRule = {
          params: {
            logView: {
              logViewId: 'Default',
              type: 'log-view-reference',
            },
            timeSize: 5,
            timeUnit: 'm',
            count: { value: 75, comparator: 'more than' },
            criteria: [{ field: 'log.level', comparator: 'equals', value: 'error' }],
          },
          consumer: 'alerts',
          schedule: { interval: '1m' },
          tags: [],
          name: 'error-log',
          rule_type_id: 'logs.alert.document.count',
          notify_when: 'onActionGroupChange',
          actions: [],
        };
        metricThresholdRuleId = await createRule(metricThresholdRule);
        logThresholdRuleId = await createRule(logThresholdRule);
        await observability.alerts.common.navigateToRulesPage();
      });
      after(async () => {
        await deleteRuleById(metricThresholdRuleId);
        await deleteRuleById(logThresholdRuleId);
      });
    });

    describe('User permissions', () => {
      describe('permission prompt', function () {
        this.tags('skipFIPS');
        it(`shows the no permission prompt when the user has no permissions`, async () => {
          // We kept this test to make sure that the stack management rule page
          // is showing the right prompt corresponding to the right privileges.
          // Knowing that o11y alert page won't come up if you do not have any
          // kind of privileges to o11y
          await observability.users.setTestUserRole({
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [
              {
                base: [],
                feature: {
                  discover: ['read'],
                },
                spaces: ['*'],
              },
            ],
          });
          await observability.alerts.common.navigateToRulesPage();
          await retry.waitFor(
            'No permissions prompt',
            async () => await testSubjects.exists('noPermissionPrompt')
          );
          await observability.users.restoreDefaultTestUserRole();
        });
      });
    });

    describe('Stack alerts consumer', () => {
      it('should create an ES Query rule and NOT display it when consumer is stackAlerts', async () => {
        const name = 'ES Query with stackAlerts consumer';
        await rulesService.api.createRule({
          name,
          consumer: 'stackAlerts',
          ruleTypeId: '.es-query',
          params: {
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            index: ['alert-test-data'],
            timeField: 'date',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            timeWindowSize: 20,
            timeWindowUnit: 's',
          },
          schedule: { interval: '1m' },
        });

        await observability.alerts.common.navigateToRulesPage();
        await testSubjects.missingOrFail('rule-row');
      });
    });
  });
};
