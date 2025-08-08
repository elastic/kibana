/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexTemplateName } from '@kbn/apm-synthtrace/src/lib/logs/custom_logsdb_index_templates';
import { DatasetQualityFtrProviderContext } from './config';
import {
  createFailedLogRecord,
  datasetNames,
  defaultNamespace,
  getLogsForDataset,
  processors,
} from './data';

export default function ({ getService, getPageObjects }: DatasetQualityFtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
  ]);
  const testSubjects = getService('testSubjects');
  const synthtrace = getService('logSynthtraceEsClient');
  const type = 'logs';

  const failedDatasetName = datasetNames[1];
  const failedDataStreamName = `${type}-${failedDatasetName}-${defaultNamespace}`;

  describe('Failed docs flyout', function () {
    // This disables the forward-compatibility test for Elasticsearch 8.19 with Kibana and ES 9.0.
    // These versions are not expected to work together. Note: Failure store is not available in ES 9.0,
    // and running these tests will result in an "unknown index privilege [read_failure_store]" error.
    this.onlyEsVersion('8.19 || >=9.1');

    describe('failed docs flyout open-close', () => {
      before(async () => {
        await synthtrace.createCustomPipeline(processors, 'synth.2@pipeline');
        await synthtrace.createComponentTemplate({
          name: 'synth.2@custom',
          dataStreamOptions: {
            failure_store: {
              enabled: true,
            },
          },
        });
        await synthtrace.createIndexTemplate(IndexTemplateName.Synht2);

        await synthtrace.index([
          createFailedLogRecord({
            to: new Date().toISOString(),
            count: 2,
            dataset: failedDatasetName,
          }),
          getLogsForDataset({
            to: new Date().toISOString(),
            count: 4,
            dataset: failedDatasetName,
          }),
        ]);
      });

      after(async () => {
        await synthtrace.clean();
        await synthtrace.deleteIndexTemplate(IndexTemplateName.Synht2);
        await synthtrace.deleteComponentTemplate('synth.2@custom');
        await synthtrace.deleteCustomPipeline('synth.2@pipeline');
      });

      it('should open and close the flyout when user clicks on the expand button', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: failedDataStreamName,
        });

        await PageObjects.datasetQuality.openFailedDocsFlyout();

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedFieldFlyout
        );
        await PageObjects.datasetQuality.doesTextExist(
          'datasetQualityDetailsFailedDocsFieldFlyoutFieldValue-cause',
          'Error messages'
        );

        await PageObjects.datasetQuality.closeFlyout();

        await testSubjects.missingOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedFieldFlyout
        );
      });

      it('should open the flyout when navigating to the page with degradedField in URL State', async () => {
        await PageObjects.datasetQuality.navigateToDetailsV2({
          dataStream: failedDataStreamName,
          expandedQualityIssue: {
            name: 'failedDocs',
            type: 'failed',
          },
        });

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedFieldFlyout
        );

        await PageObjects.datasetQuality.doesTextExist(
          'datasetQualityDetailsFailedDocsFieldFlyoutFieldValue-cause',
          'Error messages'
        );

        await PageObjects.datasetQuality.closeFlyout();
      });
    });
  });
}
