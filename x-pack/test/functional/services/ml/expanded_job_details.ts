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
  const find = getService('find');

  return {
    async assertJobRowCalendars(
      jobId: string,
      expectedCalendars: string[],
      checkForExists: boolean = true
    ): Promise<void> {
      await jobTable.withDetailsOpen(jobId, async function verifyJobRowCalendars(): Promise<void> {
        for await (const expectedCalendar of expectedCalendars) {
          const calendarSelector = `mlJobDetailsCalendar-${expectedCalendar}`;
          await testSubjects[checkForExists ? 'existOrFail' : 'missingOrFail'](calendarSelector, {
            timeout: 3_000,
          });
          if (checkForExists)
            expect(await testSubjects.getVisibleText(calendarSelector)).to.be(expectedCalendar);
        }
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

    async editAnnotation(jobId: string, newAnnotationText: string): Promise<void> {
      await jobTable.withDetailsOpen(jobId, async () => {
        await jobTable.openAnnotationsTab(jobId);
        if (await testSubjects.exists('clearSearchButton')) {
          await testSubjects.click('clearSearchButton');
          await testSubjects.missingOrFail('clearSearchButton');
        }

        await testSubjects.click(jobTable.detailsSelector(jobId, 'euiCollapsedItemActionsButton'));
        await testSubjects.click('mlAnnotationsActionEdit');
        await testSubjects.existOrFail('mlAnnotationFlyout', {
          timeout: 3_000,
        });

        await testSubjects.setValue('mlAnnotationsFlyoutTextInput', newAnnotationText, {
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
        expect(visibleText).to.be(newAnnotationText);
      });
    },

    async assertDataFeedFlyout(jobId: string): Promise<void> {
      await jobTable.withDetailsOpen(jobId, async () => {
        await jobTable.openAnnotationsTab(jobId);
        if (await testSubjects.exists('clearSearchButton'))
          await testSubjects.click('clearSearchButton');
        await testSubjects.click(jobTable.detailsSelector(jobId, 'euiCollapsedItemActionsButton'));
        await testSubjects.click('mlAnnotationsActionViewDatafeed');
        await testSubjects.existOrFail('mlAnnotationsViewDatafeedFlyoutChart');
        const visibleText = await testSubjects.getVisibleText(
          'mlAnnotationsViewDatafeedFlyoutTitle'
        );
        expect(visibleText).to.be(`Datafeed chart for ${jobId}`);
        await testSubjects.click('euiFlyoutCloseButton');
      });
    },

    async openForecastTab(jobId: string) {
      await jobTable.ensureDetailsOpen(jobId);
      await testSubjects.click(jobTable.detailsSelector(jobId, 'mlJobListTab-forecasts'), 3_000);
      await this.assertJobDetailsTabOpen('mlJobListTab-forecasts');
    },

    async assertJobDetailsTabOpen(tabSubj: string) {
      const isSelected = await testSubjects.getAttribute(tabSubj, 'aria-selected');
      expect(isSelected).to.eql(
        'true',
        `Expected job details tab [${tabSubj}] to be open, got: isSelected=[${isSelected}]`
      );
    },

    async openModelSnapshotTab(jobId: string) {
      await jobTable.ensureDetailsOpen(jobId);
      await testSubjects.click(jobTable.detailsSelector(jobId, 'mlJobListTab-modelSnapshots'));
      await this.assertJobDetailsTabOpen('mlJobListTab-modelSnapshots');
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
