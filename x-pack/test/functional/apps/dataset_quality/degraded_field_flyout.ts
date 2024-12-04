/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment/moment';
import { generateShortId, log, timerange } from '@kbn/apm-synthtrace-client';
import { DatasetQualityFtrProviderContext } from './config';
import {
  createDegradedFieldsRecord,
  defaultNamespace,
  getInitialTestLogs,
  ANOTHER_1024_CHARS,
  MORE_THAN_1024_CHARS,
} from './data';
import { logsSynthMappings } from './custom_mappings/custom_synth_mappings';
import { logsNginxMappings } from './custom_mappings/custom_integration_mappings';

export default function ({ getService, getPageObjects }: DatasetQualityFtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
  ]);
  const testSubjects = getService('testSubjects');
  const synthtrace = getService('logSynthtraceEsClient');
  const esClient = getService('es');
  const retry = getService('retry');
  const to = new Date().toISOString();
  const type = 'logs';
  const degradedDatasetName = 'synth.degraded';
  const degradedDataStreamName = `${type}-${degradedDatasetName}-${defaultNamespace}`;

  const degradedDatasetWithLimitsName = 'synth.degraded.rca';
  const degradedDatasetWithLimitDataStreamName = `${type}-${degradedDatasetWithLimitsName}-${defaultNamespace}`;
  const serviceName = 'test_service';
  const count = 5;
  const customComponentTemplateName = 'logs-synth@mappings';

  const nginxAccessDatasetName = 'nginx.access';
  const customComponentTemplateNameNginx = `logs-${nginxAccessDatasetName}@custom`;
  const nginxAccessDataStreamName = `${type}-${nginxAccessDatasetName}-${defaultNamespace}`;
  const nginxPkg = {
    name: 'nginx',
    version: '1.23.0',
  };

  const apmAppDatasetName = 'apm.app.tug';
  const apmAppDataStreamName = `${type}-${apmAppDatasetName}-${defaultNamespace}`;

  describe('Degraded fields flyout', () => {
    describe('degraded field flyout open-close', () => {
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

    describe('detecting root cause for ignored fields', () => {
      before(async () => {
        // Create custom component template
        await synthtrace.createComponentTemplate(
          customComponentTemplateName,
          logsSynthMappings(degradedDatasetWithLimitsName)
        );

        // Create custom index template
        await esClient.indices.putIndexTemplate({
          name: degradedDatasetWithLimitDataStreamName,
          _meta: {
            managed: false,
            description: 'custom synth template created by synthtrace tool.',
          },
          priority: 500,
          index_patterns: [degradedDatasetWithLimitDataStreamName],
          composed_of: [
            customComponentTemplateName,
            'logs@mappings',
            'logs@settings',
            'ecs@mappings',
          ],
          allow_auto_create: true,
          data_stream: {
            hidden: false,
          },
        });

        // Install Nginx Integration and ingest logs for it
        await PageObjects.observabilityLogsExplorer.installPackage(nginxPkg);

        // Create custom component template for Nginx to avoid issues with LogsDB
        await synthtrace.createComponentTemplate(
          customComponentTemplateNameNginx,
          logsNginxMappings(nginxAccessDatasetName)
        );

        await synthtrace.index([
          // Ingest Degraded Logs with 25 fields in degraded DataSet
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
                      test_field: [MORE_THAN_1024_CHARS, ANOTHER_1024_CHARS],
                    })
                    .timestamp(timestamp)
                );
            }),
          // Ingest Degraded Logs with 42 fields in Nginx DataSet
          timerange(moment(to).subtract(count, 'minute'), moment(to))
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return Array(1)
                .fill(0)
                .flatMap(() =>
                  log
                    .create()
                    .dataset(nginxAccessDatasetName)
                    .message('a log message')
                    .logLevel(MORE_THAN_1024_CHARS)
                    .service(serviceName)
                    .namespace(defaultNamespace)
                    .defaults({
                      'service.name': serviceName,
                      'trace.id': generateShortId(),
                      test_field: [MORE_THAN_1024_CHARS, ANOTHER_1024_CHARS],
                    })
                    .timestamp(timestamp)
                );
            }),
          // Ingest Degraded Logs with 26 fields in Apm DataSet
          timerange(moment(to).subtract(count, 'minute'), moment(to))
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return Array(1)
                .fill(0)
                .flatMap(() =>
                  log
                    .create()
                    .dataset(apmAppDatasetName)
                    .message('a log message')
                    .logLevel(MORE_THAN_1024_CHARS)
                    .service(serviceName)
                    .namespace(defaultNamespace)
                    .defaults({
                      'service.name': serviceName,
                      'trace.id': generateShortId(),
                      test_field: [MORE_THAN_1024_CHARS, ANOTHER_1024_CHARS],
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

        // Set Limit of 42
        await PageObjects.datasetQuality.setDataStreamSettings(nginxAccessDataStreamName, {
          'mapping.total_fields.limit': 42,
        });

        // Set Limit of 26
        await PageObjects.datasetQuality.setDataStreamSettings(apmAppDataStreamName, {
          'mapping.total_fields.limit': 25,
        });

        await synthtrace.index([
          // Ingest Degraded Logs with 26 field
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
                      'cloud.project.id': generateShortId(),
                    })
                    .timestamp(timestamp)
                );
            }),
          // Ingest Degraded Logs with 43 fields in Nginx DataSet
          timerange(moment(to).subtract(count, 'minute'), moment(to))
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return Array(1)
                .fill(0)
                .flatMap(() =>
                  log
                    .create()
                    .dataset(nginxAccessDatasetName)
                    .message('a log message')
                    .logLevel(MORE_THAN_1024_CHARS)
                    .service(serviceName)
                    .namespace(defaultNamespace)
                    .defaults({
                      'service.name': serviceName,
                      'trace.id': generateShortId(),
                      test_field: [MORE_THAN_1024_CHARS, ANOTHER_1024_CHARS],
                      'cloud.project.id': generateShortId(),
                    })
                    .timestamp(timestamp)
                );
            }),
          // Ingest Degraded Logs with 27 fields in Apm APP DataSet
          timerange(moment(to).subtract(count, 'minute'), moment(to))
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return Array(1)
                .fill(0)
                .flatMap(() =>
                  log
                    .create()
                    .dataset(apmAppDatasetName)
                    .message('a log message')
                    .logLevel(MORE_THAN_1024_CHARS)
                    .service(serviceName)
                    .namespace(defaultNamespace)
                    .defaults({
                      'service.name': serviceName,
                      'trace.id': generateShortId(),
                      test_field: [MORE_THAN_1024_CHARS, ANOTHER_1024_CHARS],
                      'cloud.project.id': generateShortId(),
                    })
                    .timestamp(timestamp)
                );
            }),
        ]);

        // Rollover Datastream to reset the limit to default which is 1000
        await PageObjects.datasetQuality.rolloverDataStream(degradedDatasetWithLimitDataStreamName);
        await PageObjects.datasetQuality.rolloverDataStream(nginxAccessDataStreamName);
        await PageObjects.datasetQuality.rolloverDataStream(apmAppDataStreamName);

        // Set Limit of 26
        await PageObjects.datasetQuality.setDataStreamSettings(
          PageObjects.datasetQuality.generateBackingIndexNameWithoutVersion({
            dataset: degradedDatasetWithLimitsName,
          }) + '-000002',
          {
            'mapping.total_fields.limit': 26,
          }
        );

        // Set Limit of 43
        await PageObjects.datasetQuality.setDataStreamSettings(
          PageObjects.datasetQuality.generateBackingIndexNameWithoutVersion({
            dataset: nginxAccessDatasetName,
          }) + '-000002',
          {
            'mapping.total_fields.limit': 43,
          }
        );

        // Set Limit of 27
        await PageObjects.datasetQuality.setDataStreamSettings(
          PageObjects.datasetQuality.generateBackingIndexNameWithoutVersion({
            dataset: apmAppDatasetName,
          }) + '-000002',
          {
            'mapping.total_fields.limit': 27,
          }
        );

        await synthtrace.index([
          // Ingest Degraded Logs with 26 field
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
                      'cloud.project.id': generateShortId(),
                    })
                    .timestamp(timestamp)
                );
            }),
          // Ingest Degraded Logs with 43 fields in Nginx DataSet
          timerange(moment(to).subtract(count, 'minute'), moment(to))
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return Array(1)
                .fill(0)
                .flatMap(() =>
                  log
                    .create()
                    .dataset(nginxAccessDatasetName)
                    .message('a log message')
                    .logLevel(MORE_THAN_1024_CHARS)
                    .service(serviceName)
                    .namespace(defaultNamespace)
                    .defaults({
                      'service.name': serviceName,
                      'trace.id': generateShortId(),
                      test_field: [MORE_THAN_1024_CHARS, ANOTHER_1024_CHARS],
                      'cloud.project.id': generateShortId(),
                    })
                    .timestamp(timestamp)
                );
            }),
          // Ingest Degraded Logs with 27 fields in Apm APP DataSet
          timerange(moment(to).subtract(count, 'minute'), moment(to))
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return Array(1)
                .fill(0)
                .flatMap(() =>
                  log
                    .create()
                    .dataset(apmAppDatasetName)
                    .message('a log message')
                    .logLevel(MORE_THAN_1024_CHARS)
                    .service(serviceName)
                    .namespace(defaultNamespace)
                    .defaults({
                      'service.name': serviceName,
                      'trace.id': generateShortId(),
                      test_field: [MORE_THAN_1024_CHARS, ANOTHER_1024_CHARS],
                      'cloud.project.id': generateShortId(),
                    })
                    .timestamp(timestamp)
                );
            }),
        ]);
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

          expect(rows.length).to.eql(4);

          await testSubjects.click(
            PageObjects.datasetQuality.testSubjectSelectors
              .datasetQualityDetailsOverviewDegradedFieldToggleSwitch
          );

          const newCurrentIssuesToggleState =
            await PageObjects.datasetQuality.getQualityIssueSwitchState();

          expect(newCurrentIssuesToggleState).to.be(true);

          const newRows =
            await PageObjects.datasetQuality.getDatasetQualityDetailsDegradedFieldTableRows();

          expect(newRows.length).to.eql(3);
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
          expect(await countColumn.getCellTexts()).to.eql(['5', '5', '5']);

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
          expect(await newCountColumn.getCellTexts()).to.eql(['15', '15', '5', '5']);

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

      describe('character limit exceeded', () => {
        it('should display cause as "field character limit exceeded" when a field is ignored due to character limit issue', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'test_field',
          });

          await retry.tryForTime(5000, async () => {
            const fieldIgnoredMessageExists = await PageObjects.datasetQuality.doesTextExist(
              'datasetQualityDetailsDegradedFieldFlyoutFieldValue-cause',
              'field character limit exceeded'
            );
            expect(fieldIgnoredMessageExists).to.be(true);
          });

          await PageObjects.datasetQuality.closeFlyout();
        });

        it('should display values when cause is "field character limit exceeded"', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'test_field',
          });

          await retry.tryForTime(5000, async () => {
            const testFieldValue1Exists = await PageObjects.datasetQuality.doesTextExist(
              'datasetQualityDetailsDegradedFieldFlyoutFieldValue-values',
              MORE_THAN_1024_CHARS
            );
            const testFieldValue2Exists = await PageObjects.datasetQuality.doesTextExist(
              'datasetQualityDetailsDegradedFieldFlyoutFieldValue-values',
              ANOTHER_1024_CHARS
            );
            expect(testFieldValue1Exists).to.be(true);
            expect(testFieldValue2Exists).to.be(true);
          });

          await PageObjects.datasetQuality.closeFlyout();
        });

        it('should display the maximum character limit when cause is "field character limit exceeded"', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'test_field',
          });

          await retry.tryForTime(5000, async () => {
            const limitValueExists = await PageObjects.datasetQuality.doesTextExist(
              'datasetQualityDetailsDegradedFieldFlyoutFieldValue-characterLimit',
              '1024'
            );
            expect(limitValueExists).to.be(true);
          });

          await PageObjects.datasetQuality.closeFlyout();
        });

        it('should show possible mitigation section with manual options for non integrations', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'test_field',
          });

          // Possible Mitigation Section should exist
          await testSubjects.existOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutPossibleMitigationTitle'
          );

          // It's a technical preview
          await testSubjects.existOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutPossibleMitigationTechPreviewBadge'
          );

          // Should display Edit/Create Component Template Link option
          await testSubjects.existOrFail(
            'datasetQualityManualMitigationsCustomComponentTemplateLink'
          );

          // Should display Edit/Create Ingest Pipeline Link option
          await testSubjects.existOrFail('datasetQualityManualMitigationsPipelineAccordion');

          // Check Component Template URl
          const button = await testSubjects.find(
            'datasetQualityManualMitigationsCustomComponentTemplateLink'
          );
          const componentTemplateUrl = await button.getAttribute('data-test-url');

          // Should point to index template with the datastream name as value
          expect(componentTemplateUrl).to.be(
            `/data/index_management/templates/${degradedDatasetWithLimitDataStreamName}`
          );

          const nonIntegrationCustomName = `${type}@custom`;

          const pipelineInputBox = await testSubjects.find(
            'datasetQualityManualMitigationsPipelineName'
          );
          const pipelineValue = await pipelineInputBox.getAttribute('value');

          // Expect Pipeline Name to be default logs for non integrations
          expect(pipelineValue).to.be(nonIntegrationCustomName);

          const pipelineLink = await testSubjects.find(
            'datasetQualityManualMitigationsPipelineLink'
          );
          const pipelineLinkURL = await pipelineLink.getAttribute('data-test-url');

          // Expect the pipeline link to point to the pipeline page with empty pipeline value
          expect(pipelineLinkURL).to.be(
            `/app/management/ingest/ingest_pipelines/?pipeline=${encodeURIComponent(
              nonIntegrationCustomName
            )}`
          );
        });

        it('should show possible mitigation section with different manual options for integrations', async () => {
          // Navigate to Integration Dataset
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: nginxAccessDataStreamName,
            expandedDegradedField: 'test_field',
          });

          await PageObjects.datasetQuality.waitUntilPossibleMitigationsLoaded();

          // Possible Mitigation Section should exist
          await testSubjects.existOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutPossibleMitigationTitle'
          );

          // It's a technical preview
          await testSubjects.existOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutPossibleMitigationTechPreviewBadge'
          );

          // Should display Edit/Create Component Template Link option
          await testSubjects.existOrFail(
            'datasetQualityManualMitigationsCustomComponentTemplateLink'
          );

          // Should display Edit/Create Ingest Pipeline Link option
          await testSubjects.existOrFail('datasetQualityManualMitigationsPipelineAccordion');

          // Check Component Template URl
          const button = await testSubjects.find(
            'datasetQualityManualMitigationsCustomComponentTemplateLink'
          );
          const componentTemplateUrl = await button.getAttribute('data-test-url');

          const integrationSpecificCustomName = `${type}-${nginxAccessDatasetName}@custom`;

          // Should point to component template with @custom as value
          expect(componentTemplateUrl).to.be(
            `/data/index_management/component_templates/${encodeURIComponent(
              integrationSpecificCustomName
            )}`
          );

          const pipelineInputBox = await testSubjects.find(
            'datasetQualityManualMitigationsPipelineName'
          );
          const pipelineValue = await pipelineInputBox.getAttribute('value');

          // Expect Pipeline Name to be default logs for non integrations
          expect(pipelineValue).to.be(integrationSpecificCustomName);

          const pipelineLink = await testSubjects.find(
            'datasetQualityManualMitigationsPipelineLink'
          );

          const pipelineLinkURL = await pipelineLink.getAttribute('data-test-url');

          // Expect the pipeline link to point to the pipeline page with empty pipeline value
          expect(pipelineLinkURL).to.be(
            `/app/management/ingest/ingest_pipelines/?pipeline=${encodeURIComponent(
              integrationSpecificCustomName
            )}`
          );
        });
      });

      describe('past field limit exceeded', () => {
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

        it('should display the current field limit when the cause is "field limit exceeded"', async () => {
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

      describe('current field limit issues', () => {
        it('should display increase field limit as a possible mitigation for integrations', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: nginxAccessDataStreamName,
            expandedDegradedField: 'cloud.project.id',
          });

          // Field Limit Mitigation Section should exist
          await testSubjects.existOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutFieldLimitMitigationAccordion'
          );

          // Should display the panel to increase field limit
          await testSubjects.existOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutIncreaseFieldLimitPanel'
          );

          // Should display official online documentation link
          await testSubjects.existOrFail(
            'datasetQualityManualMitigationsPipelineOfficialDocumentationLink'
          );

          const linkButton = await testSubjects.find(
            'datasetQualityManualMitigationsPipelineOfficialDocumentationLink'
          );

          const linkURL = await linkButton.getAttribute('href');

          expect(linkURL?.endsWith('mapping-settings-limit.html')).to.be(true);
        });

        it('should display increase field limit as a possible mitigation for special packages like apm app', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: apmAppDataStreamName,
            expandedDegradedField: 'cloud.project',
          });

          // Field Limit Mitigation Section should exist
          await testSubjects.existOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutFieldLimitMitigationAccordion'
          );

          // Should display the panel to increase field limit
          await testSubjects.existOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutIncreaseFieldLimitPanel'
          );

          // Should display official online documentation link
          await testSubjects.existOrFail(
            'datasetQualityManualMitigationsPipelineOfficialDocumentationLink'
          );

          const linkButton = await testSubjects.find(
            'datasetQualityManualMitigationsPipelineOfficialDocumentationLink'
          );

          const linkURL = await linkButton.getAttribute('href');

          expect(linkURL?.endsWith('mapping-settings-limit.html')).to.be(true);
        });

        it('should display increase field limit as a possible mitigation for non integration', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: degradedDatasetWithLimitDataStreamName,
            expandedDegradedField: 'cloud.project',
          });

          // Field Limit Mitigation Section should exist
          await testSubjects.existOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutFieldLimitMitigationAccordion'
          );

          // Should not display the panel to increase field limit
          await testSubjects.missingOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutIncreaseFieldLimitPanel'
          );

          // Should display official online documentation link
          await testSubjects.existOrFail(
            'datasetQualityManualMitigationsPipelineOfficialDocumentationLink'
          );
        });

        it('should display additional input fields and button increasing the limit for integrations', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: nginxAccessDataStreamName,
            expandedDegradedField: 'cloud.project.id',
          });

          // Should display current field limit
          await testSubjects.existOrFail('datasetQualityIncreaseFieldMappingCurrentLimitFieldText');

          const currentFieldLimitInput = await testSubjects.find(
            'datasetQualityIncreaseFieldMappingCurrentLimitFieldText'
          );

          const currentFieldLimitValue = await currentFieldLimitInput.getAttribute('value');
          const currentFieldLimit = parseInt(currentFieldLimitValue as string, 10);
          const currentFieldLimitDisabledStatus = await currentFieldLimitInput.getAttribute(
            'disabled'
          );

          expect(currentFieldLimit).to.be(43);
          expect(currentFieldLimitDisabledStatus).to.be('true');

          // Should display new field limit
          await testSubjects.existOrFail(
            'datasetQualityIncreaseFieldMappingProposedLimitFieldText'
          );

          const newFieldLimitInput = await testSubjects.find(
            'datasetQualityIncreaseFieldMappingProposedLimitFieldText'
          );

          const newFieldLimitValue = await newFieldLimitInput.getAttribute('value');
          const newFieldLimit = parseInt(newFieldLimitValue as string, 10);

          // Should be 30% more the current limit
          const newLimit = Math.round(currentFieldLimit * 1.3);
          expect(newFieldLimit).to.be(newLimit);

          // Should display the apply button
          await testSubjects.existOrFail('datasetQualityIncreaseFieldMappingLimitButton');

          const applyButton = await testSubjects.find(
            'datasetQualityIncreaseFieldMappingLimitButton'
          );
          const applyButtonDisabledStatus = await applyButton.getAttribute('disabled');

          // The apply button should be active
          expect(applyButtonDisabledStatus).to.be(null);
        });

        it('should validate input for new field limit', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: nginxAccessDataStreamName,
            expandedDegradedField: 'cloud.project.id',
          });

          // Should not allow values less than current limit of 43
          await testSubjects.setValue(
            'datasetQualityIncreaseFieldMappingProposedLimitFieldText',
            '42',
            {
              clearWithKeyboard: true,
              typeCharByChar: true,
            }
          );

          const applyButton = await testSubjects.find(
            'datasetQualityIncreaseFieldMappingLimitButton'
          );
          const applyButtonDisabledStatus = await applyButton.getAttribute('disabled');

          // The apply button should be active
          expect(applyButtonDisabledStatus).to.be('true');

          const newFieldLimitInput = await testSubjects.find(
            'datasetQualityIncreaseFieldMappingProposedLimitFieldText'
          );
          const invalidStatus = await newFieldLimitInput.getAttribute('aria-invalid');

          expect(invalidStatus).to.be('true');
        });

        it('should let user increase the field limit for integrations', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: nginxAccessDataStreamName,
            expandedDegradedField: 'cloud.project.id',
          });

          const applyButton = await testSubjects.find(
            'datasetQualityIncreaseFieldMappingLimitButton'
          );

          await applyButton.click();

          await retry.tryForTime(5000, async () => {
            // Should display the success callout
            await testSubjects.existOrFail(
              'datasetQualityDetailsDegradedFlyoutNewLimitSetSuccessCallout'
            );

            // Should display link to component template edited
            await testSubjects.existOrFail(
              'datasetQualityDetailsDegradedFlyoutNewLimitSetCheckComponentTemplate'
            );

            const ctLink = await testSubjects.find(
              'datasetQualityDetailsDegradedFlyoutNewLimitSetCheckComponentTemplate'
            );
            const ctLinkURL = await ctLink.getAttribute('href');

            const componentTemplateName = `${type}-${nginxAccessDatasetName}@custom`;

            // Should point to the component template page
            expect(
              ctLinkURL?.endsWith(
                `/data/index_management/component_templates/${encodeURIComponent(
                  componentTemplateName
                )}`
              )
            ).to.be(true);
          });

          // Refresh the time range to get the latest data
          await PageObjects.datasetQuality.refreshDetailsPageData();

          // The page should now handle this as ignore_malformed issue and show a warning
          await testSubjects.existOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutIssueDoesNotExist'
          );

          // Should not display the panel to increase field limit
          await testSubjects.missingOrFail(
            'datasetQualityDetailsDegradedFieldFlyoutIncreaseFieldLimitPanel'
          );
        });
      });

      after(async () => {
        await synthtrace.clean();
        await esClient.indices.deleteIndexTemplate({
          name: degradedDatasetWithLimitDataStreamName,
        });
        await synthtrace.deleteComponentTemplate(customComponentTemplateName);
        await PageObjects.observabilityLogsExplorer.uninstallPackage(nginxPkg);
        await synthtrace.deleteComponentTemplate(customComponentTemplateNameNginx);
      });
    });
  });
}
