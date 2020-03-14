/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  describe('classification cloning', function() {
    this.tags(['smoke', 'dima']);

    const testDataList: Array<{
      suiteTitle: string;
      job: Partial<DataFrameAnalyticsConfig>;
    }> = [
      {
        suiteTitle: 'classification job supported by the form',
        job: {
          id: 'bm_classification_job',
          source: {
            index: ['bank-marketing'],
            query: {
              match_all: {},
            },
          },
          dest: {
            index: 'dest_bank_1',
            results_field: 'ml',
          },
          analysis: {
            classification: {
              dependent_variable: 'y',
              training_percent: 2,
            },
          },
          analyzed_fields: {
            includes: [],
            excludes: [],
          },
          model_memory_limit: '350mb',
          allow_lazy_start: false,
        },
      },
    ];

    before(async () => {
      await esArchiver.load('ml/bm_classification');
      // Create jobs for cloning
      for (const testData of testDataList) {
        await ml.api.createDataFrameAnalyticsJob(testData.job as DataFrameAnalyticsConfig);
      }

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await esArchiver.unload('ml/bm_classification');
    });

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function() {
        before(async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();
          await ml.dataFrameAnalyticsTable.waitForAnalyticsToLoad();
          await ml.dataFrameAnalyticsTable.filterWithSearchString(testData.job.id as string);
        });

        after(async () => {
          await ml.api.deleteIndices(testData.job.dest!.index);
        });

        it('should open the flyout with a proper header', async () => {
          await ml.dataFrameAnalyticsTable.cloneJob(testData.job.id as string);
          expect(await ml.dataFrameAnalyticsCreation.getHeaderText()).to.be(
            'Clone job from bm_classification_job'
          );
        });
      });
    }
  });
}
