/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('outlier detection creation', function() {
    this.tags(['smoke']);
    before(async () => {
      await esArchiver.load('ml/egs_regression');
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await esArchiver.unload('ml/egs_regression');
    });

    const testDataList = [
      {
        suiteTitle: 'electrical grid stability',
        jobType: 'regression',
        jobId: `egs_1_${Date.now()}`,
        source: 'egs_regression',
        get destinationIndex(): string {
          return `dest_${this.jobId}`;
        },
        dependentVariable: 'stab',
        trainingPercent: '20',
        modelMemory: '105mb',
        createIndexPattern: true,
        expected: {
          row: {
            type: 'regression',
            status: 'stopped',
            progress: '100',
          },
        },
      },
    ];

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function() {
        after(async () => {
          await ml.api.deleteIndices(testData.destinationIndex);
        });

        it('loads the data frame analytics page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();
        });

        it('loads the job creation flyout', async () => {
          await ml.dataFrameAnalytics.startAnalyticsCreation();
        });

        it('selects the job type', async () => {
          await ml.dataFrameAnalyticsCreation.assertJobTypeSelectExists();
          await ml.dataFrameAnalyticsCreation.selectJobType(testData.jobType);
        });

        it('inputs the job id', async () => {
          await ml.dataFrameAnalyticsCreation.assertJobIdInputExists();
          await ml.dataFrameAnalyticsCreation.setJobId(testData.jobId);
        });

        it('selects the source index', async () => {
          await ml.dataFrameAnalyticsCreation.assertSourceIndexInputExists();
          await ml.dataFrameAnalyticsCreation.selectSourceIndex(testData.source);
        });

        it('inputs the destination index', async () => {
          await ml.dataFrameAnalyticsCreation.assertDestIndexInputExists();
          await ml.dataFrameAnalyticsCreation.setDestIndex(testData.destinationIndex);
        });

        it('inputs the dependent variable', async () => {
          await ml.dataFrameAnalyticsCreation.assertDependentVariableInputExists();
          await ml.dataFrameAnalyticsCreation.selectDependentVariable(testData.dependentVariable);
        });

        it('inputs the training percent', async () => {
          await ml.dataFrameAnalyticsCreation.assertTrainingPercentInputExists();
          await ml.dataFrameAnalyticsCreation.setTrainingPercent(testData.trainingPercent);
        });

        it('inputs the model memory limit', async () => {
          await ml.dataFrameAnalyticsCreation.assertModelMemoryInputExists();
          await ml.dataFrameAnalyticsCreation.setModelMemory(testData.modelMemory);
        });

        it('sets the create index pattern switch', async () => {
          await ml.dataFrameAnalyticsCreation.assertCreateIndexPatternSwitchExists();
          await ml.dataFrameAnalyticsCreation.setCreateIndexPatternSwitchState(
            testData.createIndexPattern
          );
        });

        it('creates the analytics job', async () => {
          await ml.dataFrameAnalyticsCreation.assertCreateButtonExists();
          await ml.dataFrameAnalyticsCreation.createAnalyticsJob();
        });

        it('starts the analytics job', async () => {
          await ml.dataFrameAnalyticsCreation.assertStartButtonExists();
          await ml.dataFrameAnalyticsCreation.startAnalyticsJob();
        });

        it('closes the create job flyout', async () => {
          await ml.dataFrameAnalyticsCreation.assertCloseButtonExists();
          await ml.dataFrameAnalyticsCreation.closeCreateAnalyticsJobFlyout();
        });

        it('finishes analytics processing', async () => {
          await ml.dataFrameAnalytics.waitForAnalyticsCompletion(testData.jobId);
        });

        it('displays the analytics table', async () => {
          await ml.dataFrameAnalytics.assertAnalyticsTableExists();
        });

        it('displays the stats bar', async () => {
          await ml.dataFrameAnalytics.assertAnalyticsStatsBarExists();
        });

        it('displays the created job in the analytics table', async () => {
          await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
          await ml.dataFrameAnalyticsTable.filterWithSearchString(testData.jobId);
          const rows = await ml.dataFrameAnalyticsTable.parseAnalyticsTable();
          const filteredRows = rows.filter(row => row.id === testData.jobId);
          expect(filteredRows).to.have.length(
            1,
            `Filtered analytics table should have 1 row for job id '${testData.jobId}' (got matching items '${filteredRows}')`
          );
        });

        it('displays details for the created job in the analytics table', async () => {
          await ml.dataFrameAnalyticsTable.assertAnalyticsRowFields(testData.jobId, {
            id: testData.jobId,
            sourceIndex: testData.source,
            destinationIndex: testData.destinationIndex,
            type: testData.expected.row.type,
            status: testData.expected.row.status,
            progress: testData.expected.row.progress,
          });
        });

        it('creates the destination index and writes results to it', async () => {
          await ml.api.assertIndicesExist(testData.destinationIndex);
          await ml.api.assertIndicesNotEmpty(testData.destinationIndex);
        });
      });
    }
  });
}
