/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { generateShortId, log, timerange } from '@kbn/apm-synthtrace-client';
import {
  createDegradedFieldsRecord,
  datasetNames,
  defaultNamespace,
  getInitialTestLogs,
  ANOTHER_1024_CHARS,
  MORE_THAN_1024_CHARS,
} from './data';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
    'svlCommonPage',
  ]);
  const testSubjects = getService('testSubjects');
  const synthtrace = getService('svlLogsSynthtraceClient');
  const retry = getService('retry');
  const to = new Date().toISOString();
  const degradedDatasetName = datasetNames[2];
  const degradedDataStreamName = `logs-${degradedDatasetName}-${defaultNamespace}`;

  const degradedDatasetWithLimitsName = 'degraded.dataset.rca';
  const degradedDatasetWithLimitDataStreamName = `logs-${degradedDatasetWithLimitsName}-${defaultNamespace}`;
  const serviceName = 'test_service';
  const count = 5;

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
      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
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

    describe('testing root cause for ignored fields', () => {
      before(async () => {
        // Ingest Degraded Logs with 25 fields
        await synthtrace.index([
          timerange(moment(to).subtract(count, 'minute'), moment(to))
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return Array(1)
                .fill(0)
                .flatMap(() =>
                  log
                    .create()
                    .dataset(degradedDatasetWithLimitsName)
                    .message('a log message')
                    .logLevel(MORE_THAN_1024_CHARS)
                    .service(serviceName)
                    .namespace(defaultNamespace)
                    .defaults({
                      'service.name': serviceName,
                      'trace.id': generateShortId(),
                      test_field: [MORE_THAN_1024_CHARS, 'hello world'],
                    })
                    .timestamp(timestamp)
                );
            }),
        ]);

        // Set Limit of 25
        await PageObjects.datasetQuality.setDataStreamSettings(
          degradedDatasetWithLimitDataStreamName,
          {
            'mapping.total_fields.limit': 25,
          }
        );

        // Ingest Degraded Logs with 26 field
        await synthtrace.index([
          timerange(moment(to).subtract(count, 'minute'), moment(to))
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return Array(1)
                .fill(0)
                .flatMap(() =>
                  log
                    .create()
                    .dataset(degradedDatasetWithLimitsName)
                    .message('a log message')
                    .logLevel(MORE_THAN_1024_CHARS)
                    .service(serviceName)
                    .namespace(defaultNamespace)
                    .defaults({
                      'service.name': serviceName,
                      'trace.id': generateShortId(),
                      test_field: [MORE_THAN_1024_CHARS, 'hello world'],
                      'cloud.region': 'us-east-1',
                    })
                    .timestamp(timestamp)
                );
            }),
        ]);

        // Rollover Datastream to reset the limit to default which is 1000
        await PageObjects.datasetQuality.rolloverDataStream(degradedDatasetWithLimitDataStreamName);

        // Ingest docs with 26 fields again
        await synthtrace.index([
          timerange(moment(to).subtract(count, 'minute'), moment(to))
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return Array(1)
                .fill(0)
                .flatMap(() =>
                  log
                    .create()
                    .dataset(degradedDatasetWithLimitsName)
                    .message('a log message')
                    .logLevel(MORE_THAN_1024_CHARS)
                    .service(serviceName)
                    .namespace(defaultNamespace)
                    .defaults({
                      'log.file.path': '/my-service.log',
                      'service.name': serviceName,
                      'trace.id': generateShortId(),
                      test_field: [MORE_THAN_1024_CHARS, 'hello world'],
                      'cloud.region': 'us-east-1',
                    })
                    .timestamp(timestamp)
                );
            }),
        ]);
      });

      describe('field ignored', () => {
        it('should display cause as "field ignored" when a field is ignored due to field above issue', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'test_field',
          });

          await retry.tryForTime(5000, async () => {
            const fieldIgnoredMessageExists = await PageObjects.datasetQuality.doesTextExist(
              'datasetQualityDetailsDegradedFieldFlyoutFieldValue-cause',
              'field ignored'
            );
            expect(fieldIgnoredMessageExists).to.be(true);
          });

          await PageObjects.datasetQuality.closeFlyout();
        });

        it('should display values when cause is "field ignored"', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'test_field',
          });

          await retry.tryForTime(5000, async () => {
            const testFieldValueExists = await PageObjects.datasetQuality.doesTextExist(
              'datasetQualityDetailsDegradedFieldFlyoutFieldValue-values',
              MORE_THAN_1024_CHARS
            );
            expect(testFieldValueExists).to.be(true);
          });

          await PageObjects.datasetQuality.closeFlyout();
        });
      });

      describe('field limit exceeded', () => {
        it('should display cause as "field limit exceeded" when a field is ignored due to field limit issue', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'cloud',
          });

          await retry.tryForTime(5000, async () => {
            const fieldLimitMessageExists = await PageObjects.datasetQuality.doesTextExist(
              'datasetQualityDetailsDegradedFieldFlyoutFieldValue-cause',
              'field limit exceeded'
            );
            expect(fieldLimitMessageExists).to.be(true);
          });

          await PageObjects.datasetQuality.closeFlyout();
        });

        it('should display the limit when the cause is "field limit exceeded"', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'cloud',
          });

          await retry.tryForTime(5000, async () => {
            const limitExists = await PageObjects.datasetQuality.doesTextExist(
              'datasetQualityDetailsDegradedFieldFlyoutFieldValue-mappingLimit',
              '25'
            );
            expect(limitExists).to.be(true);
          });

          await PageObjects.datasetQuality.closeFlyout();
        });

        it('should warn users about the issue not present in latest backing index', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'cloud',
          });

          await testSubjects.existOrFail(
            PageObjects.datasetQuality.testSubjectSelectors
              .datasetQualityDetailsDegradedFieldFlyoutIssueDoesNotExist
          );
        });
      });

      describe('current quality issues', () => {
        it('should display issues only from latest backing index when current issues toggle is on', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
          });

          const currentIssuesToggleState =
            await PageObjects.datasetQuality.getQualityIssueSwitchState();

          expect(currentIssuesToggleState).to.be(false);

          const rows =
            await PageObjects.datasetQuality.getDatasetQualityDetailsDegradedFieldTableRows();

          expect(rows.length).to.eql(3);

          await testSubjects.click(
            PageObjects.datasetQuality.testSubjectSelectors
              .datasetQualityDetailsOverviewDegradedFieldToggleSwitch
          );

          const newCurrentIssuesToggleState =
            await PageObjects.datasetQuality.getQualityIssueSwitchState();

          expect(newCurrentIssuesToggleState).to.be(true);

          const newRows =
            await PageObjects.datasetQuality.getDatasetQualityDetailsDegradedFieldTableRows();

          expect(newRows.length).to.eql(2);
        });

        it('should keep the toggle on when url state says so', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'test_field',
            showCurrentQualityIssues: true,
          });

          const currentIssuesToggleState =
            await PageObjects.datasetQuality.getQualityIssueSwitchState();

          expect(currentIssuesToggleState).to.be(true);
        });

        it('should display count from latest backing index when current issues toggle is on in the table and in the flyout', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'test_field',
            showCurrentQualityIssues: true,
          });

          // Check value in Table
          const table = await PageObjects.datasetQuality.parseDegradedFieldTable();
          const countColumn = table['Docs count'];
          expect(await countColumn.getCellTexts()).to.eql(['5', '5']);

          // Check value in Flyout
          await retry.tryForTime(5000, async () => {
            const countValue = await PageObjects.datasetQuality.doesTextExist(
              'datasetQualityDetailsDegradedFieldFlyoutFieldsList-docCount',
              '5'
            );
            expect(countValue).to.be(true);
          });

          // Toggle the switch
          await testSubjects.click(
            PageObjects.datasetQuality.testSubjectSelectors
              .datasetQualityDetailsOverviewDegradedFieldToggleSwitch
          );

          // Check value in Table
          const newTable = await PageObjects.datasetQuality.parseDegradedFieldTable();
          const newCountColumn = newTable['Docs count'];
          expect(await newCountColumn.getCellTexts()).to.eql(['15', '15', '5']);

          // Check value in Flyout
          await retry.tryForTime(5000, async () => {
            const newCountValue = await PageObjects.datasetQuality.doesTextExist(
              'datasetQualityDetailsDegradedFieldFlyoutFieldsList-docCount',
              '15'
            );
            expect(newCountValue).to.be(true);
          });
        });

        it('should close the flyout if passed value in URL no more exists in latest backing index and current quality toggle is switched on', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'cloud',
            showCurrentQualityIssues: true,
          });

          await testSubjects.missingOrFail(
            PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedFieldFlyout
          );
        });

        it('should close the flyout when current quality switch is toggled on and the flyout is already open with an old field ', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'cloud',
          });

          await testSubjects.existOrFail(
            PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedFieldFlyout
          );

          await testSubjects.click(
            PageObjects.datasetQuality.testSubjectSelectors
              .datasetQualityDetailsOverviewDegradedFieldToggleSwitch
          );

          await testSubjects.missingOrFail(
            PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedFieldFlyout
          );
        });
      });

      after(async () => {
        await synthtrace.clean();
      });
    });
  });
}
