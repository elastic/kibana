/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

const ALL_ALERTS = 10;

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('Observability overview >', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const retry = getService('retry');
    const rulesService = getService('rules');

    describe('Without data', function () {
      it('navigates to onboarding page if click on add data', async () => {
        await observability.overview.common.navigateToOverviewPageWithoutAlerts();
        await observability.overview.common.waitForOverviewNoDataPrompt();
        await observability.overview.common.clickAddDataButton();
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('observabilityOnboarding');
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
        await esArchiver.load(
          'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
        );
      });

      after(async () => {
        await rulesService.api.deleteAllRules();
        await esArchiver.unload(
          'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
        );
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
