/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '@kbn/ml-category-validator';
import type { PickFieldsConfig, DatafeedConfig, Detector } from './types';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const calendarId = `wizard-test-calendar_${Date.now()}`;

  const assertConversionToAdvancedJobWizardRetainsSettingsAndRuns = async ({
    testSuite,
    testData,
    previousJobGroups,
    bucketSpan,
    previousDetectors,
    previousInfluencers,
  }: {
    testSuite: string;
    testData: {
      suiteTitle: string;
      jobSource: string;
      jobId: string;
      jobDescription: string;
      jobGroups: string[];
      pickFieldsConfig: PickFieldsConfig;
      datafeedConfig: DatafeedConfig;
      categorizationFieldIdentifier?: string;
    };
    previousJobGroups: string[];
    bucketSpan: string;
    previousDetectors: Array<{ advancedJobIdentifier: string }>;
    previousInfluencers: string[];
  }) => {
    const previousJobWizard = `${testSuite} job wizard`;

    it(`${testSuite} converts to advanced job and retains previous settings`, async () => {
      await ml.testExecution.logTestStep(`${previousJobWizard} converts to advanced job creation`);
      await ml.jobWizardCommon.assertCreateJobButtonExists();
      await ml.jobWizardCommon.convertToAdvancedJobWizard();

      await ml.testExecution.logTestStep('advanced job creation advances to the pick fields step');
      await ml.jobWizardCommon.advanceToPickFieldsSection();

      await ml.testExecution.logTestStep('advanced job creation retains the categorization field');
      await ml.jobWizardAdvanced.assertCategorizationFieldSelection(
        testData.categorizationFieldIdentifier ? [testData.categorizationFieldIdentifier] : []
      );

      await ml.testExecution.logTestStep(
        'advanced job creation retains or inputs the summary count field'
      );
      await ml.jobWizardAdvanced.assertSummaryCountFieldInputExists();
      if (testData.pickFieldsConfig.hasOwnProperty('summaryCountField')) {
        await ml.jobWizardAdvanced.selectSummaryCountField(
          testData.pickFieldsConfig.summaryCountField!
        );
      } else {
        await ml.jobWizardAdvanced.assertSummaryCountFieldSelection([]);
      }

      await ml.testExecution.logTestStep(
        `advanced job creation retains detectors from ${previousJobWizard}`
      );
      for (const [index, detector] of previousDetectors.entries()) {
        await ml.jobWizardAdvanced.assertDetectorEntryExists(index, detector.advancedJobIdentifier);
      }

      await ml.testExecution.logTestStep('advanced job creation adds additional detectors');
      for (const detector of testData.pickFieldsConfig.detectors) {
        await ml.jobWizardAdvanced.openCreateDetectorModal();
        await ml.jobWizardAdvanced.assertDetectorFunctionInputExists();
        await ml.jobWizardAdvanced.assertDetectorFunctionSelection([]);
        await ml.jobWizardAdvanced.assertDetectorFieldInputExists();
        await ml.jobWizardAdvanced.assertDetectorFieldSelection([]);
        await ml.jobWizardAdvanced.assertDetectorByFieldInputExists();
        await ml.jobWizardAdvanced.assertDetectorByFieldSelection([]);
        await ml.jobWizardAdvanced.assertDetectorOverFieldInputExists();
        await ml.jobWizardAdvanced.assertDetectorOverFieldSelection([]);
        await ml.jobWizardAdvanced.assertDetectorPartitionFieldInputExists();
        await ml.jobWizardAdvanced.assertDetectorPartitionFieldSelection([]);
        await ml.jobWizardAdvanced.assertDetectorExcludeFrequentInputExists();
        await ml.jobWizardAdvanced.assertDetectorExcludeFrequentSelection([]);
        await ml.jobWizardAdvanced.assertDetectorDescriptionInputExists();
        await ml.jobWizardAdvanced.assertDetectorDescriptionValue('');

        await ml.jobWizardAdvanced.selectDetectorFunction(detector.function);
        if (detector.hasOwnProperty('field')) {
          await ml.jobWizardAdvanced.selectDetectorField(detector.field!);
        }
        if (detector.hasOwnProperty('byField')) {
          await ml.jobWizardAdvanced.selectDetectorByField(detector.byField!);
        }
        if (detector.hasOwnProperty('overField')) {
          await ml.jobWizardAdvanced.selectDetectorOverField(detector.overField!);
        }
        if (detector.hasOwnProperty('partitionField')) {
          await ml.jobWizardAdvanced.selectDetectorPartitionField(detector.partitionField!);
        }
        if (detector.hasOwnProperty('excludeFrequent')) {
          await ml.jobWizardAdvanced.selectDetectorExcludeFrequent(detector.excludeFrequent!);
        }
        if (detector.hasOwnProperty('description')) {
          await ml.jobWizardAdvanced.setDetectorDescription(detector.description!);
        }

        await ml.jobWizardAdvanced.confirmAddDetectorModal();
      }

      await ml.testExecution.logTestStep('advanced job creation displays detector entries');
      for (const [index, detector] of testData.pickFieldsConfig.detectors.entries()) {
        await ml.jobWizardAdvanced.assertDetectorEntryExists(
          index + previousDetectors.length,
          detector.identifier,
          detector.hasOwnProperty('description') ? detector.description! : undefined
        );
      }

      await ml.testExecution.logTestStep('advanced job creation retains the bucket span');
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.assertBucketSpanValue(bucketSpan);

      await ml.testExecution.logTestStep(
        `advanced job creation retains influencers from ${previousJobWizard}`
      );
      await ml.jobWizardCommon.assertInfluencerInputExists();
      await ml.jobWizardCommon.assertInfluencerSelection(previousInfluencers);
      for (const influencer of testData.pickFieldsConfig.influencers) {
        await ml.jobWizardCommon.addInfluencer(influencer);
      }

      await ml.testExecution.logTestStep('advanced job creation inputs the model memory limit');
      await ml.jobWizardCommon.assertModelMemoryLimitInputExists({
        withAdvancedSection: false,
      });
      await ml.jobWizardCommon.setModelMemoryLimit(testData.pickFieldsConfig.memoryLimit, {
        withAdvancedSection: false,
      });

      await ml.testExecution.logTestStep('advanced job creation displays the job details step');
      await ml.jobWizardCommon.advanceToJobDetailsSection();

      await ml.testExecution.logTestStep(
        `advanced job creation retains the job id from ${previousJobWizard}`
      );
      await ml.jobWizardCommon.assertJobIdInputExists();
      await ml.jobWizardCommon.assertJobIdValue(testData.jobId);

      await ml.testExecution.logTestStep(
        `advanced job creation retains the job description from ${previousJobWizard}`
      );
      await ml.jobWizardCommon.assertJobDescriptionInputExists();
      await ml.jobWizardCommon.assertJobDescriptionValue(testData.jobDescription);

      await ml.testExecution.logTestStep(
        `advanced job creation retains job groups and inputs new groups from ${previousJobWizard}`
      );
      await ml.jobWizardCommon.assertJobGroupInputExists();
      for (const jobGroup of testData.jobGroups) {
        await ml.jobWizardCommon.addJobGroup(jobGroup);
      }
      await ml.jobWizardCommon.assertJobGroupSelection([
        ...previousJobGroups,
        ...testData.jobGroups,
      ]);

      await ml.testExecution.logTestStep(
        'advanced job creation opens the additional settings section'
      );
      await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();

      await ml.testExecution.logTestStep(
        `advanced job creation retains calendar and custom url from ${previousJobWizard}`
      );
      await ml.jobWizardCommon.assertCalendarsSelection([calendarId]);
      await ml.jobWizardCommon.assertCustomUrlLabel(0, { label: 'check-kibana-dashboard' });

      await ml.testExecution.logTestStep('advanced job creation displays the validation step');
      await ml.jobWizardCommon.advanceToValidationSection();

      await ml.testExecution.logTestStep('advanced job creation displays the summary step');
      await ml.jobWizardCommon.advanceToSummarySection();
    });

    it('advanced job creation runs the job and displays it correctly in the job list', async () => {
      await ml.testExecution.logTestStep('advanced job creates the job and finishes processing');
      await ml.jobWizardCommon.assertCreateJobButtonExists();
      await ml.jobWizardAdvanced.createJob();
      await ml.jobManagement.assertStartDatafeedModalExists();
      await ml.jobManagement.confirmStartDatafeedModal();

      await ml.testExecution.logTestStep(
        'advanced job creation displays the created job in the job list'
      );
      await ml.jobTable.filterWithSearchString(testData.jobId, 1);
    });
  };

  describe('conversion to advanced job wizard', function () {
    this.tags(['ml']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/categorization_small');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.createDataViewIfNeeded('ft_categorization_small', '@timestamp');

      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.api.createCalendar(calendarId);
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteDataViewByTitle('ft_ecommerce');
      await ml.testResources.deleteDataViewByTitle('ft_categorization_small');
    });

    describe('from multi-metric job creation wizard', function () {
      const jobGroups = ['automated', 'farequote', 'multi-metric'];
      const splitField = 'customer_gender';
      const multiMetricDetectors = [
        {
          identifier: 'High count(Event rate)',
          advancedJobIdentifier: 'high_count partition_field_name=customer_gender',
        },
        {
          identifier: 'Low mean(products.base_price)',
          advancedJobIdentifier:
            'low_mean("products.base_price") partition_field_name=customer_gender',
        },
      ];
      const multiMetricInfluencers = ['customer_gender'];

      const bucketSpan = '2h';
      const memoryLimit = '8mb';

      const testData = {
        suiteTitle: 'multi-metric job to advanced job wizard',
        jobSource: 'ft_ecommerce',
        jobId: `ec_multimetric_to_advanced_1_${Date.now()}`,
        jobDescription: 'advanced job from multi-metric wizard',
        jobGroups: ['advanced'],
        pickFieldsConfig: {
          detectors: [],
          influencers: ['geoip.region_name'],
          bucketSpan: '1h',
          memoryLimit: '10mb',
        } as PickFieldsConfig,
        datafeedConfig: {
          queryDelay: '55s',
          frequency: '350s',
          scrollSize: '999',
        } as DatafeedConfig,
      };

      it('multi-metric job creation loads the multi-metric job wizard for the source data', async () => {
        await ml.testExecution.logTestStep('job creation loads the job management page');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.testExecution.logTestStep('job creation loads the new job source selection page');
        await ml.jobManagement.navigateToNewJobSourceSelection();

        await ml.testExecution.logTestStep('job creation loads the job type selection page');
        await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob('ft_ecommerce');

        await ml.testExecution.logTestStep('job creation loads the multi-metric job wizard page');
        await ml.jobTypeSelection.selectMultiMetricJob();
      });

      it('multi-metric job creation navigates through the multi-metric job wizard and sets all needed fields', async () => {
        await ml.testExecution.logTestStep('job creation displays the time range step');
        await ml.jobWizardCommon.assertTimeRangeSectionExists();
        await ml.commonUI.assertDatePickerDataTierOptionsVisible(true);

        await ml.testExecution.logTestStep('job creation sets the time range');
        await ml.jobWizardCommon.clickUseFullDataButton(
          'Jun 12, 2023 @ 00:04:19.000',
          'Jul 12, 2023 @ 23:45:36.000'
        );

        await ml.testExecution.logTestStep(
          'multi-metric job creation displays the event rate chart'
        );
        await ml.jobWizardCommon.assertEventRateChartExists();
        await ml.jobWizardCommon.assertEventRateChartHasData();

        await ml.testExecution.logTestStep(
          'multi-metric job creation displays the pick fields step'
        );
        await ml.jobWizardCommon.advanceToPickFieldsSection();

        for (const [
          index,
          { identifier: aggAndFieldIdentifier },
        ] of multiMetricDetectors.entries()) {
          await ml.jobWizardCommon.assertAggAndFieldInputExists();
          await ml.jobWizardCommon.selectAggAndField(aggAndFieldIdentifier, false);
          await ml.jobWizardCommon.assertDetectorPreviewExists(
            aggAndFieldIdentifier,
            index,
            'LINE'
          );
        }

        await ml.testExecution.logTestStep(
          'multi-metric job creation inputs the split field and displays split cards'
        );
        await ml.jobWizardMultiMetric.assertSplitFieldInputExists();
        await ml.jobWizardMultiMetric.selectSplitField(splitField);

        await ml.jobWizardMultiMetric.assertDetectorSplitExists(splitField);
        await ml.jobWizardMultiMetric.assertDetectorSplitFrontCardTitle('FEMALE');
        await ml.jobWizardMultiMetric.assertDetectorSplitNumberOfBackCards(1);

        await ml.testExecution.logTestStep(
          'multi-metric job creation displays the influencer field'
        );
        await ml.jobWizardCommon.assertInfluencerInputExists();
        await ml.jobWizardCommon.assertInfluencerSelection(multiMetricInfluencers);

        await ml.testExecution.logTestStep('multi-metric job creation inputs the bucket span');
        await ml.jobWizardCommon.assertBucketSpanInputExists();
        await ml.jobWizardCommon.setBucketSpan(bucketSpan);

        await ml.testExecution.logTestStep(
          'multi-metric job creation displays the job details step'
        );
        await ml.jobWizardCommon.advanceToJobDetailsSection();

        await ml.testExecution.logTestStep('multi-metric job creation inputs the job id');
        await ml.jobWizardCommon.assertJobIdInputExists();
        await ml.jobWizardCommon.setJobId(testData.jobId);

        await ml.testExecution.logTestStep('multi-metric job creation inputs the job description');
        await ml.jobWizardCommon.assertJobDescriptionInputExists();
        await ml.jobWizardCommon.setJobDescription(testData.jobDescription);

        await ml.testExecution.logTestStep('multi-metric job creation inputs job groups');
        await ml.jobWizardCommon.assertJobGroupInputExists();
        for (const jobGroup of jobGroups) {
          await ml.jobWizardCommon.addJobGroup(jobGroup);
        }
        await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);

        await ml.testExecution.logTestStep(
          'multi-metric job creation opens the additional settings section'
        );
        await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();

        await ml.testExecution.logTestStep('multi-metric job creation adds a new custom url');
        await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });

        await ml.testExecution.logTestStep('multi-metric job creation assigns calendars');
        await ml.jobWizardCommon.addCalendar(calendarId);

        await ml.testExecution.logTestStep('multi-metric job creation opens the advanced section');
        await ml.jobWizardCommon.ensureAdvancedSectionOpen();

        await ml.testExecution.logTestStep(
          'multi-metric job creation displays the model plot switch'
        );
        await ml.jobWizardCommon.assertModelPlotSwitchExists();

        await ml.testExecution.logTestStep(
          'multi-metric job creation enables the dedicated index switch'
        );
        await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
        await ml.jobWizardCommon.activateDedicatedIndexSwitch();

        await ml.testExecution.logTestStep(
          'multi-metric job creation inputs the model memory limit'
        );
        await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
        await ml.jobWizardCommon.setModelMemoryLimit(memoryLimit);

        await ml.testExecution.logTestStep(
          'multi-metric job creation displays the validation step'
        );
        await ml.jobWizardCommon.advanceToValidationSection();

        await ml.testExecution.logTestStep('multi-metric job creation displays the summary step');
        await ml.jobWizardCommon.advanceToSummarySection();
      });

      assertConversionToAdvancedJobWizardRetainsSettingsAndRuns({
        testSuite: 'multi-metric',
        testData,
        bucketSpan,
        previousInfluencers: multiMetricInfluencers,
        previousDetectors: multiMetricDetectors,
        previousJobGroups: jobGroups,
      });
    });

    describe('from population job creation wizard', function () {
      const jobGroups = ['automated', 'ecommerce', 'population'];
      const populationField = 'customer_id';
      const populationDetectors = [
        {
          identifier: 'Mean(products.base_price)',
          splitField: 'customer_gender',
          frontCardTitle: 'FEMALE',
          numberOfBackCards: 1,
          advancedJobIdentifier: 'mean("products.base_price") by customer_gender over customer_id',
        },
        {
          identifier: 'Mean(products.quantity)',
          splitField: 'category.keyword',
          frontCardTitle: "Men's Clothing",
          numberOfBackCards: 5,
          advancedJobIdentifier: 'mean("products.quantity") by "category.keyword" over customer_id',
        },
      ];
      const populationInfluencers = [populationField].concat(
        populationDetectors.map((detector) => detector.splitField)
      );

      const bucketSpan = '2h';
      const memoryLimit = '8mb';

      const testData = {
        suiteTitle: 'population job to advanced job wizard',
        jobSource: 'ft_ecommerce',
        jobId: `ec_population_to_advanced_1_${Date.now()}`,
        jobDescription: 'advanced job from population wizard',
        jobGroups: ['advanced'],
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
          influencers: ['geoip.continent_name'],
          bucketSpan: '1h',
          memoryLimit: '10mb',
        } as PickFieldsConfig,
        datafeedConfig: {
          queryDelay: '55s',
          frequency: '350s',
          scrollSize: '999',
        } as DatafeedConfig,
      };

      it('population job creation loads the population wizard for the source data', async () => {
        await ml.testExecution.logTestStep('job creation loads the job management page');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.testExecution.logTestStep('job creation loads the new job source selection page');
        await ml.jobManagement.navigateToNewJobSourceSelection();

        await ml.testExecution.logTestStep('job creation loads the job type selection page');
        await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob('ft_ecommerce');

        await ml.testExecution.logTestStep('job creation loads the population job wizard page');
        await ml.jobTypeSelection.selectPopulationJob();
      });

      it('population job creation navigates through the population wizard and sets all needed fields', async () => {
        await ml.testExecution.logTestStep('job creation displays the time range step');
        await ml.jobWizardCommon.assertTimeRangeSectionExists();

        await ml.testExecution.logTestStep('job creation sets the time range');
        await ml.jobWizardCommon.clickUseFullDataButton(
          'Jun 12, 2023 @ 00:04:19.000',
          'Jul 12, 2023 @ 23:45:36.000'
        );

        await ml.testExecution.logTestStep('population job creation displays the event rate chart');
        await ml.jobWizardCommon.assertEventRateChartExists();
        await ml.jobWizardCommon.assertEventRateChartHasData();

        await ml.testExecution.logTestStep('population job creation displays the pick fields step');
        await ml.jobWizardCommon.advanceToPickFieldsSection();

        await ml.testExecution.logTestStep('population job creation selects the population field');
        await ml.jobWizardPopulation.selectPopulationField(populationField);

        await ml.testExecution.logTestStep(
          'population job creation selects populationDetectors and displays detector previews'
        );
        for (const [index, detector] of populationDetectors.entries()) {
          await ml.jobWizardCommon.assertAggAndFieldInputExists();
          await ml.jobWizardCommon.selectAggAndField(detector.identifier, false);
          await ml.jobWizardCommon.assertDetectorPreviewExists(
            detector.identifier,
            index,
            'SCATTER'
          );
        }

        await ml.testExecution.logTestStep(
          'population job creation inputs detector split fields and displays split cards'
        );
        for (const [index, detector] of populationDetectors.entries()) {
          await ml.jobWizardPopulation.assertDetectorSplitFieldInputExists(index);
          await ml.jobWizardPopulation.selectDetectorSplitField(index, detector.splitField);

          await ml.jobWizardPopulation.assertDetectorSplitExists(index);
          await ml.jobWizardPopulation.assertDetectorSplitFrontCardTitle(
            index,
            detector.frontCardTitle
          );
          await ml.jobWizardPopulation.assertDetectorSplitNumberOfBackCards(
            index,
            detector.numberOfBackCards
          );
        }

        await ml.testExecution.logTestStep('population job creation displays the influencer field');
        await ml.jobWizardCommon.assertInfluencerInputExists();
        await ml.jobWizardCommon.assertInfluencerSelection(populationInfluencers);

        await ml.testExecution.logTestStep('population job creation inputs the bucket span');
        await ml.jobWizardCommon.assertBucketSpanInputExists();
        await ml.jobWizardCommon.setBucketSpan(bucketSpan);

        await ml.testExecution.logTestStep('population job creation displays the job details step');
        await ml.jobWizardCommon.advanceToJobDetailsSection();

        await ml.testExecution.logTestStep('population job creation inputs the job id');
        await ml.jobWizardCommon.assertJobIdInputExists();
        await ml.jobWizardCommon.setJobId(testData.jobId);

        await ml.testExecution.logTestStep('population job creation inputs the job description');
        await ml.jobWizardCommon.assertJobDescriptionInputExists();
        await ml.jobWizardCommon.setJobDescription(testData.jobDescription);

        await ml.testExecution.logTestStep('population job creation inputs job groups');
        await ml.jobWizardCommon.assertJobGroupInputExists();
        for (const jobGroup of jobGroups) {
          await ml.jobWizardCommon.addJobGroup(jobGroup);
        }
        await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);

        await ml.testExecution.logTestStep(
          'population job creation opens the additional settings section'
        );
        await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();

        await ml.testExecution.logTestStep('population job creation adds a new custom url');
        await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });

        await ml.testExecution.logTestStep('population job creation assigns calendars');
        await ml.jobWizardCommon.addCalendar(calendarId);

        await ml.testExecution.logTestStep('population job creation opens the advanced section');
        await ml.jobWizardCommon.ensureAdvancedSectionOpen();

        await ml.testExecution.logTestStep(
          'population job creation displays the model plot switch'
        );
        await ml.jobWizardCommon.assertModelPlotSwitchExists();

        await ml.testExecution.logTestStep(
          'population job creation enables the dedicated index switch'
        );
        await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
        await ml.jobWizardCommon.activateDedicatedIndexSwitch();

        await ml.testExecution.logTestStep('population job creation inputs the model memory limit');
        await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
        await ml.jobWizardCommon.setModelMemoryLimit(memoryLimit);

        await ml.testExecution.logTestStep('population job creation displays the validation step');
        await ml.jobWizardCommon.advanceToValidationSection();

        await ml.testExecution.logTestStep('population job creation displays the summary step');
        await ml.jobWizardCommon.advanceToSummarySection();
      });

      assertConversionToAdvancedJobWizardRetainsSettingsAndRuns({
        testSuite: 'population',
        testData,
        bucketSpan,
        previousInfluencers: populationInfluencers,
        previousDetectors: populationDetectors,
        previousJobGroups: jobGroups,
      });
    });

    describe('from categorization job creation wizard', function () {
      const jobGroups = ['automated', 'categorization'];
      const detectorTypeIdentifier = 'Rare';
      const categorizationFieldIdentifier = 'field1';
      const categorizationExampleCount = 5;
      const bucketSpan = '1d';
      const memoryLimit = '15MB';
      const categorizationInfluencers = ['mlcategory'];
      const testData = {
        suiteTitle: 'categorization job to advanced job wizard',
        jobSource: 'ft_ecommerce',
        jobId: `categorization_to_advanced_${Date.now()}`,
        jobDescription: 'advanced job from categorization wizard',
        jobGroups: ['advanced'],
        categorizationFieldIdentifier,
        pickFieldsConfig: {
          categorizationField: 'field1',
          detectors: [],
          influencers: [],
          bucketSpan: '1h',
          memoryLimit: '10mb',
        } as PickFieldsConfig,
        datafeedConfig: {
          queryDelay: '55s',
          frequency: '350s',
          scrollSize: '999',
        } as DatafeedConfig,
      };
      const categorizationDetectors = [{ advancedJobIdentifier: 'rare by mlcategory' }];

      it('categorization job creation loads the categorization wizard for the source data', async () => {
        await ml.testExecution.logTestStep(
          'categorization job creation loads the job management page'
        );
        await ml.testExecution.logTestStep('');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.testExecution.logTestStep(
          'categorization job creation loads the new job source selection page'
        );
        await ml.jobManagement.navigateToNewJobSourceSelection();

        await ml.testExecution.logTestStep(
          'categorization job creation loads the job type selection page'
        );
        await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob('ft_categorization_small');

        await ml.testExecution.logTestStep(
          'categorization job creation loads the categorization job wizard page'
        );
        await ml.jobTypeSelection.selectCategorizationJob();
      });

      it('categorization job creation navigates through the categorization wizard and sets all needed fields', async () => {
        await ml.testExecution.logTestStep(
          'categorization job creation displays the time range step'
        );
        await ml.jobWizardCommon.assertTimeRangeSectionExists();

        await ml.testExecution.logTestStep('categorization job creation sets the time range');
        await ml.jobWizardCommon.clickUseFullDataButton(
          'Apr 5, 2019 @ 11:25:35.770',
          'Nov 21, 2019 @ 00:01:13.923'
        );

        await ml.testExecution.logTestStep(
          'categorization job creation displays the event rate chart'
        );
        await ml.jobWizardCommon.assertEventRateChartExists();
        await ml.jobWizardCommon.assertEventRateChartHasData();

        await ml.testExecution.logTestStep(
          'categorization job creation displays the pick fields step'
        );
        await ml.jobWizardCommon.advanceToPickFieldsSection();

        await ml.testExecution.logTestStep(
          `categorization job creation selects ${detectorTypeIdentifier} detector type`
        );
        await ml.jobWizardCategorization.assertCategorizationDetectorTypeSelectionExists();
        await ml.jobWizardCategorization.selectCategorizationDetectorType(detectorTypeIdentifier);

        await ml.testExecution.logTestStep(
          `categorization job creation selects the categorization field`
        );
        await ml.jobWizardCategorization.selectCategorizationField(
          testData.categorizationFieldIdentifier
        );
        await ml.jobWizardCategorization.assertCategorizationExamplesCallout(
          CATEGORY_EXAMPLES_VALIDATION_STATUS.VALID
        );
        await ml.jobWizardCategorization.assertCategorizationExamplesTable(
          categorizationExampleCount
        );

        await ml.testExecution.logTestStep('categorization job creation inputs the bucket span');
        await ml.jobWizardCommon.assertBucketSpanInputExists();
        await ml.jobWizardCommon.setBucketSpan(bucketSpan);

        await ml.testExecution.logTestStep(
          'categorization job creation displays the job details step'
        );
        await ml.jobWizardCommon.advanceToJobDetailsSection();

        await ml.testExecution.logTestStep('categorization job creation inputs the job id');
        await ml.jobWizardCommon.assertJobIdInputExists();
        await ml.jobWizardCommon.setJobId(testData.jobId);

        await ml.testExecution.logTestStep(
          'categorization job creation inputs the job description'
        );
        await ml.jobWizardCommon.assertJobDescriptionInputExists();
        await ml.jobWizardCommon.setJobDescription(testData.jobDescription);

        await ml.testExecution.logTestStep('categorization job creation inputs job groups');
        await ml.jobWizardCommon.assertJobGroupInputExists();
        for (const jobGroup of jobGroups) {
          await ml.jobWizardCommon.addJobGroup(jobGroup);
        }
        await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);

        await ml.testExecution.logTestStep(
          'categorization job creation opens the additional settings section'
        );
        await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();

        await ml.testExecution.logTestStep('categorization job creation adds a new custom url');
        await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });

        await ml.testExecution.logTestStep('categorization job creation assigns calendars');
        await ml.jobWizardCommon.addCalendar(calendarId);

        await ml.testExecution.logTestStep(
          'categorization job creation opens the advanced section'
        );
        await ml.jobWizardCommon.ensureAdvancedSectionOpen();

        await ml.testExecution.logTestStep(
          'categorization job creation displays the model plot switch'
        );
        await ml.jobWizardCommon.assertModelPlotSwitchExists();
        await ml.jobWizardCommon.assertModelPlotSwitchEnabled(false);
        await ml.jobWizardCommon.assertModelPlotSwitchCheckedState(false);

        await ml.testExecution.logTestStep(
          'categorization job creation enables the dedicated index switch'
        );
        await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
        await ml.jobWizardCommon.activateDedicatedIndexSwitch();

        await ml.testExecution.logTestStep(
          'categorization job creation inputs the model memory limit'
        );
        await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
        await ml.jobWizardCommon.setModelMemoryLimit(memoryLimit);

        await ml.testExecution.logTestStep(
          'categorization job creation displays the validation step'
        );
        await ml.jobWizardCommon.advanceToValidationSection();

        await ml.testExecution.logTestStep('categorization job creation displays the summary step');
        await ml.jobWizardCommon.advanceToSummarySection();
      });

      assertConversionToAdvancedJobWizardRetainsSettingsAndRuns({
        testSuite: 'categorization',
        testData,
        bucketSpan,
        previousInfluencers: categorizationInfluencers,
        previousDetectors: categorizationDetectors,
        previousJobGroups: jobGroups,
      });
    });
  });
}
