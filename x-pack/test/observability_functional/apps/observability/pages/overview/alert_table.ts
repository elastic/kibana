/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const ALL_ALERTS = 10;

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');

  describe('Observability overview >', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const retry = getService('retry');
    const rulesService = getService('rules');

    describe('Without data', function () {
      it('navigate and open alerts section', async () => {
        await observability.overview.common.navigateToOverviewPageWithoutAlerts();
        await observability.overview.common.waitForOverviewNoDataPrompt();
      });
    });

    describe('With data', function () {
      before(async () => {
        await rulesService.api.createRule({
          name: 'Test',
          consumer: 'logs',
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
        await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      });

      after(async () => {
        await rulesService.api.deleteAllRules();
        await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      });

      it('navigate and open alerts section', async () => {
        await observability.overview.common.navigateToOverviewPageWithAlerts();
        await observability.overview.common.openAlertsSectionAndWaitToAppear();
      });

      it('should show alerts correctly', async () => {
        await retry.try(async () => {
          const tableRows = await observability.alerts.common.getTableCellsInRows();
          expect(tableRows.length).to.be(ALL_ALERTS);
        });
      });
    });
  });
};
