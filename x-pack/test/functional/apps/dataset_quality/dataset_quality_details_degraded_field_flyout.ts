/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityFtrProviderContext } from './config';
import {
  createDegradedFieldsRecord,
  datasetNames,
  defaultNamespace,
  getInitialTestLogs,
  ANOTHER_1024_CHARS,
  MORE_THAN_1024_CHARS,
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
  const retry = getService('retry');
  const to = '2024-01-01T12:00:00.000Z';
  const degradedDatasetName = datasetNames[2];
  const degradedDataStreamName = `logs-${degradedDatasetName}-${defaultNamespace}`;

  describe('Degraded fields flyout', () => {
    before(async () => {
      await synthtrace.index([
        // Ingest basic logs
        getInitialTestLogs({ to, count: 4 }),
        // Ingest Degraded Logs
        createDegradedFieldsRecord({
          to: new Date().toISOString(),
          count: 2,
          dataset: degradedDatasetName,
        }),
      ]);
    });

    after(async () => {
      await synthtrace.clean();
    });

    describe('degraded field flyout open-close', () => {
      it('should open and close the flyout when user clicks on the expand button', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: degradedDataStreamName,
        });

        await PageObjects.datasetQuality.openDegradedFieldFlyout('test_field');

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedFieldFlyout
        );

        await PageObjects.datasetQuality.closeFlyout();

        await testSubjects.missingOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedFieldFlyout
        );
      });

      it('should open the flyout when navigating to the page with degradedField in URL State', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: degradedDataStreamName,
          expandedDegradedField: 'test_field',
        });

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedFieldFlyout
        );

        await PageObjects.datasetQuality.closeFlyout();
      });
    });

    describe('values exist', () => {
      it('should display the degraded field values', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: degradedDataStreamName,
          expandedDegradedField: 'test_field',
        });

        await retry.tryForTime(5000, async () => {
          const cloudAvailabilityZoneValueExists = await PageObjects.datasetQuality.doesTextExist(
            'datasetQualityDetailsDegradedFieldFlyoutFieldValue-values',
            ANOTHER_1024_CHARS
          );
          const cloudAvailabilityZoneValue2Exists = await PageObjects.datasetQuality.doesTextExist(
            'datasetQualityDetailsDegradedFieldFlyoutFieldValue-values',
            MORE_THAN_1024_CHARS
          );
          expect(cloudAvailabilityZoneValueExists).to.be(true);
          expect(cloudAvailabilityZoneValue2Exists).to.be(true);
        });

        await PageObjects.datasetQuality.closeFlyout();
      });
    });
  });
}
