/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

interface Detector {
  identifier: string;
  function: string;
  field?: string;
  byField?: string;
  overField?: string;
  partitionField?: string;
  excludeFrequent?: string;
  description?: string;
}

export default function ({ getService }: FtrProviderContext) {
  const a11y = getService('a11y');
  const ml = getService('ml');

  describe('machine learning anomaly detection Accessibility', function () {
    const esArchiver = getService('esArchiver');

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();
    });

    describe('for user with full ML access', function () {
      before(async () => {
        await ml.securityUI.loginAsMlPowerUser();
        await ml.api.cleanMlIndices();
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await ml.securityUI.logout();
      });

      describe('with no data loaded', function () {
        it('anomaly detection page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToAnomalyDetection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection settings page', async () => {
          await ml.navigation.navigateToSettings();
          await a11y.testAppSnapshot();
        });
      });

      describe('with data loaded', function () {
        const adJobId = 'fq_single_a11y';
        const calendarId = 'calendar_a11y';
        const eventDescription = 'calendar_event_a11y';
        const filterId = 'filter_a11y';
        const filterItems = ['filter_item_a11y'];
        const fqIndexName = 'ft_farequote';
        const ecIndexName = 'ft_module_sample_ecommerce';

        const categorizationIndexName = 'ft_categorization_small';

        const adJobAggAndFieldIdentifier = 'Mean(responsetime)';
        const adJobBucketSpan = '30m';
        const adSingleMetricJobId = `fq_single_a11y_${Date.now()}`;
        const adMultiSplitField = 'airline';
        const adMultiMetricJobId = `fq_multi_a11y_${Date.now()}`;
        const adMultiMetricJobDescription =
          'Multi metric job based on the farequote dataset with 30m bucketspan and mean(responsetime) split by airline';
        const adCategorizationDetectorType = 'Rare';
        const adCategorizationFieldIdentifier = 'field1';
        const adCategorizationJobId = `categorization_a11y_${Date.now()}`;
        const adCategorizationJobDescription =
          'categorization job based on the ft_categorization dataset looking for rare field1 values';
        const adRecognizerJobModuleId = 'sample_data_ecommerce';
        const adRecognizerJobIdPrefix = 'ally_';

        const advancedJobTestData = {
          suiteTitle: 'with multiple metric detectors and custom datafeed settings',
          jobSource: ecIndexName,
          jobId: `ec_advanced_1_${Date.now()}`,
          get jobIdClone(): string {
            return `${this.jobId}_clone`;
          },
          jobDescription: `Create advanced job from ${ecIndexName} dataset with multiple metric detectors and custom datafeed settings`,
          jobGroups: ['automated', 'ecommerce', 'advanced'],
          get jobGroupsClone(): string[] {
            return [...this.jobGroups, 'clone'];
          },
          pickFieldsConfig: {
            detectors: [
              {
                identifier: 'high_count',
                function: 'high_count',
                description: 'high_count detector without split',
              } as Detector,
              {
                identifier: 'mean("products.base_price") by "category.keyword"',
                function: 'mean',
                field: 'products.base_price',
                byField: 'category.keyword',
              } as Detector,
              {
                identifier: 'sum("products.discount_amount") over customer_id',
                function: 'sum',
                field: 'products.discount_amount',
                overField: 'customer_id',
              } as Detector,
              {
                identifier: 'median(total_quantity) partition_field_name=customer_gender',
                function: 'median',
                field: 'total_quantity',
                partitionField: 'customer_gender',
              } as Detector,
              {
                identifier:
                  'max(total_quantity) by "geoip.continent_name" over customer_id partition_field_name=customer_gender',
                function: 'max',
                field: 'total_quantity',
                byField: 'geoip.continent_name',
                overField: 'customer_id',
                partitionField: 'customer_gender',
              } as Detector,
            ],
            influencers: [
              'customer_id',
              'category.keyword',
              'geoip.continent_name',
              'customer_gender',
            ],
            bucketSpan: '1h',
            memoryLimit: '10mb',
          },
          datafeedConfig: {
            queryDelay: '55s',
            frequency: '350s',
            scrollSize: '999',
          },
        };
        const populationJobTestData = {
          suiteTitle: 'population job',
          jobSource: ecIndexName,
          jobId: `ec_population_1_${Date.now()}`,
          get jobIdClone(): string {
            return `${this.jobId}_clone`;
          },
          jobDescription:
            'Create population job based on the ecommerce sample dataset with 2h bucketspan over customer_id' +
            ' - detectors: (Mean(products.base_price) by customer_gender), (Mean(products.quantity) by category.leyword)',
          jobGroups: ['automated', 'ecommerce', 'population'],
          get jobGroupsClone(): string[] {
            return [...this.jobGroups, 'clone'];
          },
          populationField: 'customer_id',
          pickFieldsConfig: {
            detectors: [
              {
                identifier: 'Mean(products.base_price)',
                splitField: 'customer_gender',
                frontCardTitle: 'FEMALE',
                numberOfBackCards: 1,
              },
              {
                identifier: 'Mean(products.quantity)',
                splitField: 'category.keyword',
                frontCardTitle: "Men's Clothing",
                numberOfBackCards: 5,
              },
            ],
            influencers: [
              'customer_id',
              'category.keyword',
              'geoip.continent_name',
              'customer_gender',
            ],
            bucketSpan: '2h',
            memoryLimit: '8mb',
          },
          datafeedConfig: {
            queryDelay: '55s',
            frequency: '350s',
            scrollSize: '999',
          },
        };

        before(async () => {
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
          await esArchiver.loadIfNeeded(
            'x-pack/test/functional/es_archives/ml/module_sample_ecommerce'
          );
          await esArchiver.loadIfNeeded(
            'x-pack/test/functional/es_archives/ml/categorization_small'
          );
          await ml.testResources.createDataViewIfNeeded(fqIndexName, '@timestamp');
          await ml.testResources.createDataViewIfNeeded(ecIndexName, 'order_date');
          await ml.testResources.createDataViewIfNeeded('ft_categorization_small', '@timestamp');
          await ml.testResources.setKibanaTimeZoneToUTC();

          await ml.api.createAndRunAnomalyDetectionLookbackJob(
            ml.commonConfig.getADFqMultiMetricJobConfig(adJobId),
            ml.commonConfig.getADFqDatafeedConfig(adJobId)
          );

          await ml.api.createCalendar(calendarId, {
            calendar_id: calendarId,
            job_ids: [],
            description: 'Test calendar',
          });
          await ml.api.createCalendarEvents(calendarId, [
            {
              description: eventDescription,
              start_time: '1513641600000',
              end_time: '1513728000000',
            },
          ]);

          await ml.api.createFilter(filterId, {
            description: 'Test filter list',
            items: filterItems,
          });
        });

        after(async () => {
          await ml.api.cleanMlIndices();
          await ml.api.deleteCalendar(calendarId);
          await ml.api.deleteFilter(filterId);

          await ml.testResources.deleteDataViewByTitle(fqIndexName);
          await ml.testResources.deleteDataViewByTitle(ecIndexName);
          await ml.testResources.deleteDataViewByTitle(categorizationIndexName);
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_sample_ecommerce');
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/categorization_small');
          await ml.testResources.resetKibanaTimeZone();
        });

        it('anomaly detection jobs list page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToAnomalyDetection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create job select index pattern page', async () => {
          await ml.jobManagement.navigateToNewJobSourceSelection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create job select type page', async () => {
          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(fqIndexName);
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create single metric job time range step', async () => {
          await ml.jobTypeSelection.selectSingleMetricJob();
          await ml.testExecution.logTestStep('job creation set the time range');
          await ml.jobWizardCommon.clickUseFullDataButton(
            'Feb 7, 2016 @ 00:00:00.000',
            'Feb 11, 2016 @ 23:59:54.000'
          );
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create single metric job pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
          await ml.testExecution.logTestStep('job creation selects field and aggregation');
          await ml.jobWizardCommon.selectAggAndField(adJobAggAndFieldIdentifier, true);
          await ml.testExecution.logTestStep('job creation inputs the bucket span');
          await ml.jobWizardCommon.setBucketSpan(adJobBucketSpan);
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create single metric job details step', async () => {
          await ml.jobWizardCommon.advanceToJobDetailsSection();
          await ml.testExecution.logTestStep('job creation inputs the job id');
          await ml.jobWizardCommon.setJobId(adSingleMetricJobId);
          await ml.testExecution.logTestStep('job creation opens the additional settings section');
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
          await ml.testExecution.logTestStep('job creation opens the advanced section');
          await ml.jobWizardCommon.ensureAdvancedSectionOpen();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create single metric job validation step', async () => {
          await ml.jobWizardCommon.advanceToValidationSection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create single metric job summary step', async () => {
          await ml.jobWizardCommon.advanceToSummarySection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create multi metric job and move to time range step', async () => {
          // Proceed all the way to the step for selecting the time range
          // as the other steps have already been tested for the single metric job
          await ml.navigation.navigateToAnomalyDetection();
          await ml.jobManagement.navigateToNewJobSourceSelection();
          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(fqIndexName);
          await ml.jobTypeSelection.selectMultiMetricJob();
          await ml.testExecution.logTestStep('job creation set the time range');
          await ml.jobWizardCommon.clickUseFullDataButton(
            'Feb 7, 2016 @ 00:00:00.000',
            'Feb 11, 2016 @ 23:59:54.000'
          );
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create multi metric job pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
          await ml.testExecution.logTestStep('job creation selects field and aggregation');
          await ml.jobWizardCommon.selectAggAndField(adJobAggAndFieldIdentifier, false);
          await ml.testExecution.logTestStep('job creation selects split field');
          await ml.jobWizardMultiMetric.selectSplitField(adMultiSplitField);
          await ml.testExecution.logTestStep('job creation inputs the bucket span');
          await ml.jobWizardCommon.setBucketSpan(adJobBucketSpan);
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create multi metric job details step', async () => {
          await ml.jobWizardCommon.advanceToJobDetailsSection();
          await ml.testExecution.logTestStep('job creation inputs the job id');
          await ml.jobWizardCommon.setJobId(adMultiMetricJobId);
          await ml.testExecution.logTestStep('job creation inputs the job description');
          await ml.jobWizardCommon.setJobDescription(adMultiMetricJobDescription);
          await ml.testExecution.logTestStep('job creation opens the additional settings section');
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
          await ml.testExecution.logTestStep('job creation opens the advanced section');
          await ml.jobWizardCommon.ensureAdvancedSectionOpen();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create multi metric job validation step', async () => {
          await ml.jobWizardCommon.advanceToValidationSection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create multi metric job summary step', async () => {
          await ml.jobWizardCommon.advanceToSummarySection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create advanced job open wizard', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();

          await ml.jobManagement.navigateToNewJobSourceSelection();

          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(
            advancedJobTestData.jobSource
          );

          await ml.jobTypeSelection.selectAdvancedJob();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create advanced job pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
          await a11y.testAppSnapshot();

          for (const detector of advancedJobTestData.pickFieldsConfig.detectors) {
            await ml.jobWizardAdvanced.openCreateDetectorModal();
            await a11y.testAppSnapshot();

            await ml.jobWizardAdvanced.selectDetectorFunction(detector.function);
            if (Object.hasOwn(detector, 'field')) {
              await ml.jobWizardAdvanced.selectDetectorField(detector.field!);
            }
            if (Object.hasOwn(detector, 'byField')) {
              await ml.jobWizardAdvanced.selectDetectorByField(detector.byField!);
            }
            if (Object.hasOwn(detector, 'overField')) {
              await ml.jobWizardAdvanced.selectDetectorOverField(detector.overField!);
            }
            if (Object.hasOwn(detector, 'partitionField')) {
              await ml.jobWizardAdvanced.selectDetectorPartitionField(detector.partitionField!);
            }
            if (Object.hasOwn(detector, 'excludeFrequent')) {
              await ml.jobWizardAdvanced.selectDetectorExcludeFrequent(detector.excludeFrequent!);
            }
            if (Object.hasOwn(detector, 'description')) {
              await ml.jobWizardAdvanced.setDetectorDescription(detector.description!);
            }

            await ml.jobWizardAdvanced.confirmAddDetectorModal();
          }

          await ml.testExecution.logTestStep('job creation inputs the bucket span');
          await ml.jobWizardCommon.setBucketSpan(advancedJobTestData.pickFieldsConfig.bucketSpan);

          await ml.testExecution.logTestStep('job creation inputs influencers');
          for (const influencer of advancedJobTestData.pickFieldsConfig.influencers) {
            await ml.jobWizardCommon.addInfluencer(influencer);
          }

          await ml.testExecution.logTestStep('job creation inputs the model memory limit');
          await ml.jobWizardCommon.setModelMemoryLimit(
            advancedJobTestData.pickFieldsConfig.memoryLimit,
            {
              withAdvancedSection: false,
            }
          );
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create advanced job job details step', async () => {
          await ml.jobWizardCommon.advanceToJobDetailsSection();
          await ml.jobWizardCommon.setJobId(advancedJobTestData.jobId);
          await ml.jobWizardCommon.setJobDescription(advancedJobTestData.jobDescription);
          for (const jobGroup of advancedJobTestData.jobGroups) {
            await ml.jobWizardCommon.addJobGroup(jobGroup);
          }
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
          await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });
          await ml.jobWizardCommon.addCalendar(calendarId);
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create advanced job validation step', async () => {
          await ml.jobWizardCommon.advanceToValidationSection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create advanced job job summary step', async () => {
          await ml.jobWizardCommon.advanceToSummarySection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create population job open wizard', async () => {
          await ml.navigation.navigateToJobManagement();
          await ml.jobManagement.navigateToNewJobSourceSelection();

          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(ecIndexName);

          await ml.testExecution.logTestStep('job creation loads the population job wizard page');
          await ml.jobTypeSelection.selectPopulationJob();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create population job pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
          await ml.jobWizardPopulation.selectPopulationField(populationJobTestData.populationField);
          for (const [
            index,
            detector,
          ] of populationJobTestData.pickFieldsConfig.detectors.entries()) {
            await ml.jobWizardCommon.selectAggAndField(detector.identifier, false);
            await ml.jobWizardCommon.assertDetectorPreviewExists(
              detector.identifier,
              index,
              'SCATTER'
            );
          }

          for (const [
            index,
            detector,
          ] of populationJobTestData.pickFieldsConfig.detectors.entries()) {
            await ml.jobWizardPopulation.assertDetectorSplitFieldInputExists(index);
            await ml.jobWizardPopulation.selectDetectorSplitField(index, detector.splitField);
          }
          await ml.jobWizardCommon.setBucketSpan(populationJobTestData.pickFieldsConfig.bucketSpan);
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create population job details step', async () => {
          await ml.jobWizardCommon.advanceToJobDetailsSection();

          await ml.jobWizardCommon.setJobId(populationJobTestData.jobId);
          await ml.jobWizardCommon.setJobDescription(populationJobTestData.jobDescription);
          for (const jobGroup of populationJobTestData.jobGroups) {
            await ml.jobWizardCommon.addJobGroup(jobGroup);
          }
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
          await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });
          await ml.jobWizardCommon.addCalendar(calendarId);

          await ml.testExecution.logTestStep('job creation inputs the model memory limit');
          await ml.jobWizardCommon.setModelMemoryLimit(
            populationJobTestData.pickFieldsConfig.memoryLimit
          );

          await a11y.testAppSnapshot();
        });

        it('anomaly detection create population job validation step', async () => {
          await ml.jobWizardCommon.advanceToValidationSection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create population job summary step', async () => {
          await ml.jobWizardCommon.advanceToSummarySection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create categorization job and move to time range step', async () => {
          await ml.navigation.navigateToJobManagement();
          await ml.jobManagement.navigateToNewJobSourceSelection();

          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(categorizationIndexName);

          await ml.testExecution.logTestStep(
            'job creation loads the categorization job wizard page'
          );
          await ml.jobTypeSelection.selectCategorizationJob();
          await ml.testExecution.logTestStep('job creation set the time range');
          await ml.jobWizardCommon.clickUseFullDataButton(
            'Apr 5, 2019 @ 11:25:35.770',
            'Nov 21, 2019 @ 00:01:13.923'
          );
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create categorization job pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
          await ml.testExecution.logTestStep(
            `job creation selects ${adCategorizationDetectorType} detector type`
          );
          await ml.jobWizardCategorization.selectCategorizationDetectorType(
            adCategorizationDetectorType
          );
          await ml.testExecution.logTestStep(`job creation selects the categorization field`);
          await ml.jobWizardCategorization.selectCategorizationField(
            adCategorizationFieldIdentifier
          );
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create categorization job details step', async () => {
          await ml.jobWizardCommon.advanceToJobDetailsSection();
          await ml.testExecution.logTestStep('job creation inputs the job id');
          await ml.jobWizardCommon.setJobId(adCategorizationJobId);
          await ml.testExecution.logTestStep('job creation inputs the job description');
          await ml.jobWizardCommon.setJobDescription(adCategorizationJobDescription);
          await ml.testExecution.logTestStep('job creation opens the additional settings section');
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
          await ml.testExecution.logTestStep('job creation opens the advanced section');
          await ml.jobWizardCommon.ensureAdvancedSectionOpen();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create categorization job validation step', async () => {
          await ml.jobWizardCommon.advanceToValidationSection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create categorization job summary step', async () => {
          await ml.jobWizardCommon.advanceToSummarySection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create job from data recognizer module open wizard', async () => {
          await ml.navigation.navigateToJobManagement();
          await ml.jobManagement.navigateToNewJobSourceSelection();
          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(ecIndexName);
          await ml.testExecution.logTestStep(
            `job creation loads the data recognizer job wizard page for the ${adRecognizerJobModuleId} module`
          );
          await ml.jobTypeSelection.selectRecognizerJob(adRecognizerJobModuleId);
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create data recognizer job details step', async () => {
          await ml.testExecution.logTestStep('job creation inputs the job id prefix');
          await ml.jobWizardRecognizer.setJobIdPrefix(adRecognizerJobIdPrefix);
          await ml.testExecution.logTestStep('job creation opens the advanced section');
          await ml.jobWizardCommon.ensureAdvancedSectionOpen();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection Single Metric Viewer page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToAnomalyDetection();
          await ml.jobTable.clickOpenJobInSingleMetricViewerButton(adJobId);
          await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

          await ml.testExecution.logTestStep('should input the airline entity value');
          await ml.singleMetricViewer.assertEntityInputExist('airline');
          await ml.singleMetricViewer.assertEntityInputSelection('airline', []);
          await ml.singleMetricViewer.selectEntityValue('airline', 'AAL');

          await a11y.testAppSnapshot();
        });

        it('anomaly detection forecasting from Single Metric Viewer page', async () => {
          await ml.testExecution.logTestStep('opens the forecasting modal showing no forecasts');
          await ml.forecast.openForecastModal();
          await a11y.testAppSnapshot();

          await ml.testExecution.logTestStep('run the forecast and close the modal');
          await ml.forecast.clickForecastModalRunButton();

          await ml.testExecution.logTestStep('opens the forecasting modal showing a forecast');
          await ml.forecast.openForecastModal();
          await a11y.testAppSnapshot();

          await ml.testExecution.logTestStep('closes the forecasting modal');
          await ml.forecast.closeForecastModal();
        });

        it('anomaly detection Anomaly Explorer page', async () => {
          await ml.singleMetricViewer.openAnomalyExplorer();
          await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection settings page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToSettings();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection calendar management page', async () => {
          await ml.settings.navigateToCalendarManagement();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection edit calendar page', async () => {
          await ml.settingsCalendar.openCalendarEditForm(calendarId);
          await a11y.testAppSnapshot();
        });

        it('anomaly detection filter list management page', async () => {
          await ml.navigation.navigateToSettings();
          await ml.settings.navigateToFilterListsManagement();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection edit filter list page', async () => {
          await ml.settingsFilterList.openFilterListEditForm(filterId);
          await a11y.testAppSnapshot();
        });
      });
    });
  });
}
