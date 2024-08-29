/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlADJobTable } from './job_table';
import { MlJobAnnotations } from './job_annotations_table';

export function MachineLearningJobExpandedDetailsProvider(
  { getService, getPageObject }: FtrProviderContext,
  jobTable: MlADJobTable,
  jobAnnotationsTable: MlJobAnnotations
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const headerPage = getPageObject('header');

  return {
    async openAnnotationsTab(jobId: string) {
      await retry.tryForTime(10000, async () => {
        await jobTable.ensureDetailsOpen(jobId);
        await testSubjects.click(jobTable.detailsSelector(jobId, 'mlJobListTab-annotations'));
        await testSubjects.existOrFail('mlAnnotationsTable');
      });
    },

    async clickEditAnnotationAction(jobId: string, annotationId: string) {
      await jobAnnotationsTable.ensureAnnotationsActionsMenuOpen(annotationId);
      await testSubjects.click('mlAnnotationsActionEdit');
      await testSubjects.existOrFail('mlAnnotationFlyout', {
        timeout: 3_000,
      });
    },

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

    async openForecastJob(jobId: string): Promise<void> {
      await jobTable.ensureDetailsOpen(jobId);
      await this.openForecastTab(jobId);
      await testSubjects.click('mlJobListForecastTabOpenSingleMetricViewButton', 5000);
      await testSubjects.existOrFail('mlSingleMetricViewerChart');
    },

    async clearSearchButton() {
      if (await testSubjects.exists('clearSearchButton')) {
        await testSubjects.click('clearSearchButton');
        await testSubjects.missingOrFail('clearSearchButton');
      }
    },

    async assertAnnotationsFromApi(annotationsFromApi: any) {
      const length = annotationsFromApi.length;
      expect(length).to.eql(
        1,
        `Expect annotations from api to have length of 1, but got [${length}]`
      );
    },

    async openAnnotationInSingleMetricViewer(
      jobId: string,
      annotationsFromApi: any
    ): Promise<void> {
      await this.assertAnnotationsFromApi(annotationsFromApi);

      const { _id: annotationId }: { _id: string } = annotationsFromApi[0];

      await jobTable.ensureDetailsOpen(jobId);
      await jobTable.openAnnotationsTab(jobId);
      await this.clearSearchButton();
      await jobAnnotationsTable.ensureAnnotationsActionsMenuOpen(annotationId);
      await testSubjects.click('mlAnnotationsActionOpenInSingleMetricViewer');
      await testSubjects.existOrFail('mlSingleMetricViewerChart');
    },

    async editAnnotation(
      jobId: string,
      newAnnotationText: string,
      annotationsFromApi: any
    ): Promise<void> {
      await this.assertAnnotationsFromApi(annotationsFromApi);

      await jobTable.ensureDetailsOpen(jobId);
      await jobTable.openAnnotationsTab(jobId);
      await this.clearSearchButton();

      const { _id: annotationId }: { _id: string } = annotationsFromApi[0];

      await this.clickEditAnnotationAction(jobId, annotationId);

      await testSubjects.setValue('mlAnnotationsFlyoutTextInput', newAnnotationText, {
        clearWithKeyboard: true,
      });
      await testSubjects.click('annotationFlyoutUpdateOrCreateButton');
      await testSubjects.missingOrFail('mlAnnotationsFlyoutTextInput');
      await jobTable.ensureDetailsClosed(jobId);

      await jobTable.withDetailsOpen(jobId, async () => {
        await jobTable.openAnnotationsTab(jobId);
        await this.clearSearchButton();
        const visibleText = await testSubjects.getVisibleText(
          jobTable.detailsSelector(jobId, 'mlAnnotationsColumnAnnotation')
        );
        expect(visibleText).to.be(newAnnotationText);
      });
    },

    async assertDataFeedFlyout(jobId: string): Promise<void> {
      await jobTable.withDetailsOpen(jobId, async () => {
        await jobTable.openAnnotationsTab(jobId);
        await this.clearSearchButton();
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
      await retry.tryForTime(60_000, async () => {
        await jobTable.ensureDetailsOpen(jobId);
        await testSubjects.click(jobTable.detailsSelector(jobId, 'mlJobListTab-forecasts'), 3_000);
        await headerPage.waitUntilLoadingHasFinished();
        await this.assertJobDetailsTabOpen('mlJobListTab-forecasts');
      });
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

    async assertJobListMultiSelectionText(expectedMsg: string): Promise<void> {
      const visibleText = await testSubjects.getVisibleText('~mlADJobListMultiSelectActionsArea');
      expect(visibleText).to.be(expectedMsg);
    },
  };
}
