/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

const RULE_ALERT_INDEX_PATTERN = '.alerts-stack.alerts-*';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const rulesService = getService('rules');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('Observability Rules page', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');

    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
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
