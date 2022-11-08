/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { Annotation } from '../../../../../plugins/ml/common/types/annotations';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('annotations', function () {
    this.tags(['mlqa']);
    const jobId = `fq_single_1_smv_${Date.now()}`;

    const annotation = {
      timestamp: 1455142431586,
      end_timestamp: 1455200689604,
      annotation: 'Test annotation',
      job_id: jobId,
      type: 'annotation' as Annotation['type'],
      detector_index: 0,
      event: 'user',
      create_time: 1626129498464,
      create_username: 'user1',
      modified_time: 1626129498464,
      modified_username: 'user2',
    };

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      const JOB_CONFIG = ml.commonConfig.getADFqSingleMetricJobConfig(jobId);
      const DATAFEED_CONFIG = ml.commonConfig.getADFqDatafeedConfig(jobId);

      await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);

      // Points the read/write aliases of annotations to an index with wrong mappings
      // so we can simulate errors when requesting annotations.
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    describe('creating', function () {
      const newText = 'Created annotation text';

      it('creates annotation', async () => {
        await ml.testExecution.logTestStep('loads from job list row link');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.jobTable.filterWithSearchString(jobId, 1);

        await ml.jobTable.clickOpenJobInSingleMetricViewerButton(jobId);
        await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

        await ml.singleMetricViewer.assertAnnotationsExists('loaded');

        await ml.testExecution.logTestStep('creates new annotation');
        await ml.jobAnnotations.createAnnotation(newText);

        await ml.testExecution.logTestStep('displays newly created annotation');
        await ml.jobAnnotations.ensureSingleMetricViewerAnnotationsPanelOpen();
        await ml.jobAnnotations.assertAnnotationExists({
          annotation: newText,
          event: 'user',
        });
      });

      it('displays newly created annotation in anomaly explorer and job list', async () => {
        await ml.testExecution.logTestStep('should display created annotation in anomaly explorer');
        await ml.navigation.navigateToAnomalyExplorerViaSingleMetricViewer();
        await ml.anomalyExplorer.assertAnnotationsPanelExists('loaded');

        await ml.jobAnnotations.ensureAnomalyExplorerAnnotationsPanelOpen();
        await ml.jobAnnotations.assertAnnotationExists({
          annotation: newText,
          event: 'user',
        });

        await ml.testExecution.logTestStep('should display created annotation in job list');
        await ml.navigation.navigateToJobManagement();
        await ml.jobTable.filterWithSearchString(jobId, 1);
        await ml.jobTable.openAnnotationsTab(jobId);
        await ml.jobAnnotations.assertAnnotationExists({
          annotation: newText,
          event: 'user',
        });
      });
    });

    describe('editing', function () {
      const annotationId = `edit-annotation-id-${Date.now()}`;
      const newText = 'Edited annotation text';
      const expectedOriginalAnnotation = {
        annotation: annotation.annotation,
        from: '2016-02-10 22:13:51',
        to: '2016-02-11 14:24:49',
        modifiedTime: '2021-07-12 22:38:18',
        modifiedBy: annotation.modified_username,
        event: annotation.event,
      };
      const expectedEditedAnnotation = {
        annotation: newText,
        event: annotation.event,
      };

      before(async () => {
        await ml.api.indexAnnotation(annotation as Partial<Annotation>, annotationId);
      });

      it('displays the original annotation correctly', async () => {
        await ml.testExecution.logTestStep('loads from job list row link');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.jobTable.filterWithSearchString(jobId, 1);
        await ml.jobTable.openAnnotationsTab(jobId);
        await ml.jobAnnotations.assertAnnotationContentById(
          annotationId,
          expectedOriginalAnnotation
        );

        await ml.jobTable.clickOpenJobInSingleMetricViewerButton(jobId);
        await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
        await ml.singleMetricViewer.assertAnnotationsExists('loaded');

        await ml.testExecution.logTestStep('displays annotation content');
        await ml.jobAnnotations.ensureSingleMetricViewerAnnotationsPanelOpen();
        await ml.jobAnnotations.assertAnnotationsRowExists(annotationId);
        await ml.jobAnnotations.assertAnnotationContentById(
          annotationId,
          expectedOriginalAnnotation
        );
      });

      it('edits the annotation', async () => {
        await ml.testExecution.logTestStep('opens edit annotation flyout');
        await ml.jobAnnotations.clickAnnotationsEditAction(annotationId);

        await ml.testExecution.logTestStep('displays annotation content');
        await ml.jobAnnotations.assertAnnotationsEditFlyoutContent({
          'Job ID': jobId,
          Start: 'February 10th 2016, 22:13:51',
          End: 'February 11th 2016, 14:24:49',
          Created: 'July 12th 2021, 22:38:18',
          'Created by': annotation.create_username,
          'Last modified': 'July 12th 2021, 22:38:18',
          'Modified by': annotation.modified_username,
          Detector: 'mean(responsetime)',
        });

        await ml.testExecution.logTestStep('edits and saves new annotation text');
        await ml.jobAnnotations.setAnnotationText(newText);

        await ml.testExecution.logTestStep('displays annotation with newly edited text');
        await ml.jobAnnotations.assertAnnotationContentById(annotationId, expectedEditedAnnotation);
      });

      it('displays newly edited annotation in anomaly explorer and job list', async () => {
        await ml.testExecution.logTestStep('should display edited annotation in anomaly explorer');
        await ml.navigation.navigateToAnomalyExplorerViaSingleMetricViewer();
        await ml.anomalyExplorer.assertAnnotationsPanelExists('loaded');

        await ml.jobAnnotations.ensureAnomalyExplorerAnnotationsPanelOpen();
        await ml.jobAnnotations.assertAnnotationContentById(annotationId, expectedEditedAnnotation);

        await ml.testExecution.logTestStep('should display edited annotation in job list');
        await ml.navigation.navigateToJobManagement();
        await ml.jobTable.filterWithSearchString(jobId, 1);
        await ml.jobTable.openAnnotationsTab(jobId);
        await ml.jobAnnotations.assertAnnotationContentById(annotationId, expectedEditedAnnotation);
      });
    });

    describe('data feed flyout', function () {
      const annotationId = `data-feed-flyout-annotation-id-${Date.now()}`;

      before(async () => {
        await ml.api.indexAnnotation(annotation as Partial<Annotation>, annotationId);
      });

      it('displays delayed data chart for annotation', async () => {
        await ml.testExecution.logTestStep(
          'should display delayed data action in annotations table'
        );

        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();
        await ml.jobTable.filterWithSearchString(jobId, 1);
        await ml.jobTable.openAnnotationsTab(jobId);

        await ml.jobAnnotations.openDatafeedChartFlyout(annotationId, jobId);
        await ml.jobAnnotations.assertDelayedDataChartExists();
      });
    });

    describe('deleting', function () {
      const annotationId = `delete-annotation-id-${Date.now()}`;

      before(async () => {
        await ml.api.indexAnnotation(annotation as Partial<Annotation>, annotationId);
      });

      it('displays the original annotation', async () => {
        await ml.testExecution.logTestStep('loads from job list row link');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.jobTable.filterWithSearchString(jobId, 1);

        await ml.jobTable.clickOpenJobInSingleMetricViewerButton(jobId);
        await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
        await ml.singleMetricViewer.assertAnnotationsExists('loaded');

        await ml.testExecution.logTestStep('displays annotation content');
        await ml.jobAnnotations.ensureSingleMetricViewerAnnotationsPanelOpen();
        await ml.jobAnnotations.assertAnnotationsRowExists(annotationId);
        await ml.jobAnnotations.assertAnnotationContentById(annotationId, {
          annotation: annotation.annotation,
          from: '2016-02-10 22:13:51',
          to: '2016-02-11 14:24:49',
          modifiedTime: '2021-07-12 22:38:18',
          modifiedBy: annotation.modified_username,
          event: annotation.event,
        });
      });

      it('deletes the annotation', async () => {
        await ml.jobAnnotations.deleteAnnotation(annotationId);
        await ml.jobAnnotations.assertAnnotationsRowMissing(annotationId);
      });

      it('does not display the deleted annotation in anomaly explorer and job list', async () => {
        await ml.testExecution.logTestStep(
          'does not show the deleted annotation in anomaly explorer'
        );
        await ml.navigation.navigateToAnomalyExplorerViaSingleMetricViewer();
        await ml.anomalyExplorer.assertAnnotationsPanelExists('loaded');
        await ml.jobAnnotations.ensureAnomalyExplorerAnnotationsPanelOpen();
        await ml.jobAnnotations.assertAnnotationsRowMissing(annotationId);

        await ml.testExecution.logTestStep('does not show the deleted annotation in job list');
        await ml.navigation.navigateToJobManagement();
        await ml.jobTable.filterWithSearchString(jobId, 1);
        await ml.jobTable.openAnnotationsTab(jobId);
        await ml.jobAnnotations.assertAnnotationsRowMissing(annotationId);
      });
    });
  });
}
