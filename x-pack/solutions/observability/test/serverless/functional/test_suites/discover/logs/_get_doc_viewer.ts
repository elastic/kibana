/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import { log, timerange } from '@kbn/synthtrace-client';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { MORE_THAN_1024_CHARS, STACKTRACE_MESSAGE } from '../const';
import { clickWithRetry } from '../../../utils/click_with_retry';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'svlCommonPage']);
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const retry = getService('retry');
  const dataViews = getService('dataViews');
  const synthtrace = getService('svlLogsSynthtraceClient');
  const queryBar = getService('queryBar');

  const click = (action: () => Promise<void>, timeoutMs?: number) =>
    clickWithRetry(retry, action, timeoutMs);

  const start = moment().subtract(30, 'minutes').valueOf();
  const end = moment().add(30, 'minutes').valueOf();

  describe('observability logs getDocViewer ', function () {
    before(async () => {
      await synthtrace.index([
        timerange(start, end)
          .interval('1m')
          .rate(5)
          .generator((timestamp: number, index: number) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset('synth.discover')
              .namespace('default')
              .logLevel(index % 2 === 0 ? MORE_THAN_1024_CHARS : 'info')
              .defaults({
                'service.name': 'synth-discover',
                ...(index % 2 === 0 && { 'error.stack_trace': STACKTRACE_MESSAGE }),
              })
          ),
      ]);

      await PageObjects.svlCommonPage.loginAsAdmin();

      await PageObjects.common.navigateToActualUrl('discover', undefined, {
        ensureCurrentUrl: false,
      });

      // Required as some other test switches data view to metric-*
      await dataViews.switchTo('All logs');

      await queryBar.setQuery('error.stack_trace : * and _ignored : *');
      await queryBar.submitQuery();
      await PageObjects.discover.waitUntilTabIsLoaded();
    });

    after(async () => {
      await synthtrace.clean();
    });

    afterEach(async () => {
      await dataGrid.closeFlyout();
    });

    describe('renders docViewer', () => {
      it('should open the flyout with stacktrace and quality issues accordion closed when expand is clicked', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        // Ensure Log overview flyout is open
        const tabButton = await testSubjects.find('docViewerTab-doc_view_logs_overview');
        await tabButton.click();

        // Quality Issues accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewDegradedFieldsAccordion');

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'false'
        );

        // Stacktrace accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewStacktraceAccordion');

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'false'
        );
      });

      it('should open the flyout with stacktrace accordion open and quality issues accordion closed when stacktrace icon is clicked', async () => {
        await dataGrid.clickStacktraceLeadingControl(1);

        // Ensure Log overview flyout is open
        await testSubjects.existOrFail('docViewerTab-doc_view_logs_overview');

        // Quality Issues accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewDegradedFieldsAccordion');

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'false'
        );

        // Stacktrace accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewStacktraceAccordion');

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'true'
        );
      });

      it('should open the flyout with stacktrace accordion closed and quality issues accordion open when quality issues icon is clicked', async () => {
        await dataGrid.clickQualityIssueLeadingControl(2);

        // Ensure Log overview flyout is open
        await testSubjects.existOrFail('docViewerTab-doc_view_logs_overview');

        // Quality Issues accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewDegradedFieldsAccordion');

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'true'
        );

        // Stacktrace accordion to be present and collapsed
        await testSubjects.existOrFail('unifiedDocViewLogsOverviewStacktraceAccordion');

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'false'
        );
      });

      it('should keep old accordion open when 1st stacktrace and then quality issue control for the same row is clicked', async () => {
        await dataGrid.clickStacktraceLeadingControl(0);

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'true'
        );

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'false'
        );

        // Clicking on Quality Issue control of the same row while the Flyout is still open

        await dataGrid.clickQualityIssueLeadingControl(0);

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'true'
        );

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'true'
        );
      });

      it('should toggle to quality issue accordion when 1st stacktrace and then quality issue control is clicked for different row', async () => {
        await dataGrid.clickStacktraceLeadingControl(0);

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'true'
        );

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'false'
        );

        // Clicking on Quality Issue control of the same row while the Flyout is still open

        await dataGrid.clickQualityIssueLeadingControl(1);

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'false'
        );

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'true'
        );
      });

      it('should keep old accordion open when 1st quality issue and then stacktrace control for the same row is clicked', async () => {
        await dataGrid.clickQualityIssueLeadingControl(0);

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'true'
        );

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'false'
        );

        // Clicking on Stacktrace control of the same row while the Flyout is still open
        await dataGrid.clickStacktraceLeadingControl(0);

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'true'
        );

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'true'
        );
      });

      it('should toggle to stacktrace accordion when 1st quality issue and then stacktrace control is clicked for different row', async () => {
        await dataGrid.clickQualityIssueLeadingControl(0);

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'true'
        );

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'false'
        );

        // Clicking on Stacktrace control of the same row while the Flyout is still open
        await dataGrid.clickStacktraceLeadingControl(1);

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewStacktraceAccordion',
          'true'
        );

        await testSubjects.waitForAccordionState(
          'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          'false'
        );
      });

      describe('when flyout is already open on a different tab', () => {
        it('should switch tab to logs overview and open quality issues accordion, when user clicks on quality issue control of same row', async () => {
          await dataGrid.clickRowToggle({ rowIndex: 0 });

          // Switch to JSON tab
          const jsonTabButton = await testSubjects.find('docViewerTab-doc_view_source');
          await jsonTabButton.click();

          // Click to open Quality Issue control on the same row
          await click(() => dataGrid.clickQualityIssueLeadingControl(0));

          await testSubjects.waitForAccordionState(
            'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
            'true'
          );

          await testSubjects.waitForAccordionState(
            'unifiedDocViewLogsOverviewStacktraceAccordion',
            'false'
          );
        });

        it('should switch tab to logs overview and open quality issues accordion, when user clicks on quality issue control of different row', async () => {
          await dataGrid.clickRowToggle({ rowIndex: 0 });

          // Switch to JSON tab
          const jsonTabButton = await testSubjects.find('docViewerTab-doc_view_source');
          await jsonTabButton.click();

          // Click to open Quality Issue control on the same row
          await click(() => dataGrid.clickQualityIssueLeadingControl(1));

          await testSubjects.waitForAccordionState(
            'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
            'true'
          );

          await testSubjects.waitForAccordionState(
            'unifiedDocViewLogsOverviewStacktraceAccordion',
            'false'
          );
        });

        it('should switch tab to logs overview and open stacktrace accordion, when user clicks on stacktrace control of same row', async () => {
          await dataGrid.clickRowToggle({ rowIndex: 0 });

          // Switch to JSON tab
          const jsonTabButton = await testSubjects.find('docViewerTab-doc_view_source');
          await jsonTabButton.click();

          // Click to open Stacktrace control on the same row
          await click(() => dataGrid.clickStacktraceLeadingControl(0));

          await testSubjects.waitForAccordionState(
            'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
            'false'
          );

          await testSubjects.waitForAccordionState(
            'unifiedDocViewLogsOverviewStacktraceAccordion',
            'true'
          );
        });

        it('should switch tab to logs overview and open stacktrace accordion, when user clicks on stacktrace control of different row', async () => {
          await dataGrid.clickRowToggle({ rowIndex: 0 });

          // Switch to JSON tab
          const jsonTabButton = await testSubjects.find('docViewerTab-doc_view_source');
          await jsonTabButton.click();

          // Click to open Stacktrace control on a different row
          await click(() => dataGrid.clickStacktraceLeadingControl(1));

          await testSubjects.waitForAccordionState(
            'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
            'false'
          );

          await testSubjects.waitForAccordionState(
            'unifiedDocViewLogsOverviewStacktraceAccordion',
            'true'
          );
        });
      });
    });
  });
}
