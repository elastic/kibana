/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlADJobTable } from './job_table';

export function MachineLearningExpandedJobDetailsProvider(
  { getService }: FtrProviderContext,
  jobTable: MlADJobTable
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');

  return {
    async assertCalendarPresent(jobId: string, expectedCalendar: string): Promise<void> {
      await jobTable.withDetailsOpen(jobId, async function verifyCalendar() {
        const calendarSelector = `${jobId}-${expectedCalendar}`;
        await testSubjects.existOrFail(calendarSelector, {
          timeout: 3_000,
        });
        const calendarVisibleText = await testSubjects.getVisibleText(calendarSelector);
        expect(calendarVisibleText).to.be(expectedCalendar);
      });
    },

    async assertForecastElements(jobId: string): Promise<void> {
      await jobTable.withDetailsOpen(jobId, async () => {
        await this.openForecastTab(jobId);
        await testSubjects.existOrFail('mlJobListForecastTabOpenSingleMetricViewButton', {
          timeout: 3_000,
        });
      });
    },

    async openForecastTab(jobId: string) {
      await testSubjects.click(jobTable.detailsSelector(jobId, 'mlJobListTab-forecasts'), 3_000);
    },

    async assertAnnotationsEdit(jobId: string): Promise<void> {
      const newAnnotation = 'appex qa rox';
      await jobTable.withDetailsOpen(jobId, async () => {
        await jobTable.openAnnotationsTab(jobId);
        if (await testSubjects.exists('clearSearchButton'))
          await testSubjects.click('clearSearchButton');

        await testSubjects.click(jobTable.detailsSelector(jobId, 'euiCollapsedItemActionsButton'));
        await testSubjects.click('mlAnnotationsActionEdit');

        await testSubjects.setValue('mlAnnotationsFlyoutTextInput', newAnnotation, {
          clearWithKeyboard: true,
        });
        await testSubjects.click('annotationFlyoutUpdateOrCreateButton');
      });

      await jobTable.withDetailsOpen(jobId, async () => {
        await jobTable.openAnnotationsTab(jobId);
        if (await testSubjects.exists('clearSearchButton'))
          await testSubjects.click('clearSearchButton');
        const visibleText = await testSubjects.getVisibleText(
          jobTable.detailsSelector(jobId, 'mlAnnotationsColumnAnnotation')
        );
        expect(visibleText).to.be(newAnnotation);
      });
    },

    async assertDataFeedFlyout(jobId: string): Promise<void> {
      await jobTable.withDetailsOpen(jobId, async () => {
        await jobTable.openAnnotationsTab(jobId);
        if (await testSubjects.exists('clearSearchButton'))
          await testSubjects.click('clearSearchButton');
        await testSubjects.click(jobTable.detailsSelector(jobId, 'euiCollapsedItemActionsButton'));
        await testSubjects.click('mlAnnotationsActionViewDatafeed');
        const visibleText = await testSubjects.getVisibleText(
          'mlAnnotationsViewDatafeedFlyoutTitle'
        );
        expect(visibleText).to.be(`Datafeed chart for ${jobId}`);
        await testSubjects.click('euiFlyoutCloseButton');
      });
    },

    async openModelSnapshotTab(jobId: string) {
      await retry.tryForTime(3_000, async () => {
        await jobTable.ensureDetailsOpen(jobId);
        await testSubjects.click(jobTable.detailsSelector(jobId, 'mlJobListTab-modelSnapshots'));
      });
    },

    async assertModelSnapshotManagement(jobId: string): Promise<void> {
      await jobTable.withDetailsOpen(jobId, async () => {
        await this.openModelSnapshotTab(jobId);
        await testSubjects.existOrFail('mlADModelSnapShotRevertButton');
        await testSubjects.existOrFail('mlADModelSnapShotsEditButton');
      });
    },

    async selectAllJobs(): Promise<void> {
      await testSubjects.click('checkboxSelectAll');
    },

    async assertJobListMultiSelectionText(expectedMsg: string): Promise<void> {
      const visibleText = await testSubjects.getVisibleText('~mlADJobListMultiSelectActionsArea');
      expect(visibleText).to.be(expectedMsg);
    },

    async assertColumnState(buttonText: string, columnJobState: string): Promise<void> {
      await find.clickByButtonText(buttonText);
      const visibleText = await testSubjects.getVisibleText('mlJobListColumnJobState');
      expect(visibleText).to.be(columnJobState);
    },

    async assertColumnId(expectedId: string): Promise<void> {
      const visibleText = await testSubjects.getVisibleText('mlJobListColumnId');
      expect(visibleText).to.be(expectedId);
    },
  };
}
