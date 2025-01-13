/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');

  describe('Observability alerts page / State synchronization', function () {
    this.tags('includeFirefox');

    const find = getService('find');
    const testSubjects = getService('testSubjects');
    const observability = getService('observability');
    const pageObjects = getPageObjects(['common', 'observability', 'timePicker']);

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/simple_logs');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/simple_logs');
    });

    it('should read page state from URL', async () => {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'observability',
        '/alerts',
        `?_a=(kuery:'kibana.alert.evaluation.threshold > 75',rangeFrom:now-30d,rangeTo:now-10d,workflowStatus:closed)`,
        { ensureCurrentUrl: false }
      );

      await assertAlertsPageState({
        kuery: 'kibana.alert.evaluation.threshold > 75',
        // workflowStatus: 'Closed',
        timeRange: '~ a month ago - ~ 10 days ago',
      });
    });

    it('should not sync URL state to shared time range on page load ', async () => {
      await pageObjects.observability.clickSolutionNavigationEntry(
        'observability-overview',
        'overview'
      );

      const observabilityPageDateRange = await pageObjects.observability.getDatePickerRangeText();

      expect(observabilityPageDateRange).to.be('Last 15 minutes');
    });

    it('should apply defaults if URL state is missing', async () => {
      await (await find.byLinkText('Alerts')).click();

      await assertAlertsPageState({
        kuery: '',
        // workflowStatus: 'Open',
        timeRange: 'Last 24 hours',
      });
    });

    it('should use shared time range if set', async () => {
      await pageObjects.observability.clickSolutionNavigationEntry(
        'observability-overview',
        'overview'
      );
      await setTimeRangeToXDaysAgo(10);
      await pageObjects.observability.clickSolutionNavigationEntry(
        'observability-overview',
        'alerts'
      );

      expect(await observability.alerts.common.getTimeRange()).to.be('Last 10 days');
    });

    it('should set the shared time range', async () => {
      await setTimeRangeToXDaysAgo(100);
      await pageObjects.observability.clickSolutionNavigationEntry(
        'observability-overview',
        'overview'
      );

      const observabilityPageDateRange = await pageObjects.observability.getDatePickerRangeText();

      expect(observabilityPageDateRange).to.be('Last 100 days');
    });

    async function assertAlertsPageState(expected: {
      kuery: string;
      // workflowStatus: string;
      timeRange: string;
    }) {
      expect(await (await observability.alerts.common.getQueryBar()).getVisibleText()).to.be(
        expected.kuery
      );
      // expect(await observability.alerts.common.getWorkflowStatusFilterValue()).to.be(
      //   expected.workflowStatus
      // );
      const timeRange = await observability.alerts.common.getTimeRange();
      expect(timeRange).to.be(expected.timeRange);
    }

    async function setTimeRangeToXDaysAgo(numberOfDays: number) {
      await (await testSubjects.find('superDatePickerToggleQuickMenuButton')).click();
      const numberField = await find.byCssSelector('[aria-label="Time value"]');
      await numberField.clearValueWithKeyboard();
      await numberField.type(numberOfDays.toString());
      const unitField = await find.byCssSelector('[aria-label="Time unit"]');
      await unitField.type('Days');
      await find.clickByButtonText('Apply');
    }
  });
};
