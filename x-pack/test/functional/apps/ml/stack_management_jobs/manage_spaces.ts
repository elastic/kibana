/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');

  interface TestData {
    suiteTitle: string;
    initialSpace: string;
    adJobId: string;
    dfaJobId: string;
    spacesToAdd: string[];
    removeInitialSpace: boolean;
    assignToAllSpaces: boolean;
  }

  const spaceIds = {
    idSpaceDefault: 'default',
    idSpace1: 'space1',
  };

  // each test run performs all spaces operations and validations for AD and
  // DFA in parallel to save test execution time when switching spaces and pages
  const testDataList: TestData[] = [
    {
      suiteTitle: `add one space`,
      initialSpace: spaceIds.idSpaceDefault,
      adJobId: `ad_job_1_${Date.now()}`,
      dfaJobId: `dfa_job_1_${Date.now()}`,
      spacesToAdd: [spaceIds.idSpace1],
      removeInitialSpace: false,
      assignToAllSpaces: false,
    },
    {
      suiteTitle: `add one space and remove initial space`,
      initialSpace: spaceIds.idSpaceDefault,
      adJobId: `ad_job_2_${Date.now()}`,
      dfaJobId: `dfa_job_2_${Date.now()}`,
      spacesToAdd: [spaceIds.idSpace1],
      removeInitialSpace: true,
      assignToAllSpaces: false,
    },
    {
      suiteTitle: `assign to all spaces`,
      initialSpace: spaceIds.idSpace1,
      adJobId: `ad_job_3_${Date.now()}`,
      dfaJobId: `dfa_job_3_${Date.now()}`,
      spacesToAdd: [],
      removeInitialSpace: false,
      assignToAllSpaces: true,
    },
  ];

  async function assertJobsDisplayedInSpace(
    adJobId: string,
    dfaJobId: string,
    spaceId: string,
    shouldBeDisplayed: boolean
  ) {
    await ml.testExecution.logTestStep(
      `AD job ${adJobId} and DFA job ${dfaJobId} should${
        shouldBeDisplayed ? '' : ' not'
      } be displayed in space ${spaceId}`
    );
    await ml.commonUI.changeToSpace(spaceId);
    await ml.navigation.navigateToMlViaAppsMenu(); // use apps menu to keep the selected space

    // AD
    await ml.navigation.navigateToAnomalyDetection();

    if (shouldBeDisplayed) {
      await ml.jobTable.filterWithSearchString(adJobId, 1);
    } else {
      await ml.jobManagement.assertEmptyStateVisible();
    }

    // DFA
    await ml.navigation.navigateToDataFrameAnalytics();
    await ml.dataFrameAnalyticsTable.assertAnalyticsJobDisplayedInTable(
      dfaJobId,
      shouldBeDisplayed
    );
  }

  async function selectSpaces(testData: TestData) {
    if (testData.assignToAllSpaces) {
      await ml.stackManagementJobs.selectShareToAllSpaces();
    } else {
      await ml.stackManagementJobs.selectShareToExplicitSpaces();

      for (const spaceId of testData.spacesToAdd) {
        await ml.stackManagementJobs.toggleSpaceSelectionRow(spaceId, true);
      }
      if (testData.removeInitialSpace) {
        await ml.stackManagementJobs.toggleSpaceSelectionRow(testData.initialSpace, false);
      }
    }
  }

  describe('manage spaces', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createIndexPatternIfNeeded('ft_ihp_outlier', '@timestamp');

      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();

      for (const spaceId of Object.values(spaceIds)) {
        if (spaceId !== 'default') {
          await spacesService.create({
            id: spaceId,
            name: spaceId,
            disabledFeatures: [],
            initials: `${spaceId.slice(-1)}`,
          });
        }
      }
    });

    after(async () => {
      for (const spaceId of Object.values(spaceIds)) {
        if (spaceId !== 'default') {
          await spacesService.delete(spaceId);
        }
      }
      await ml.testResources.cleanMLSavedObjects();
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await ml.testResources.deleteIndexPatternByTitle('ft_ihp_outlier');
    });

    for (const testData of testDataList) {
      describe(testData.suiteTitle, function () {
        before(async () => {
          await ml.api.createAnomalyDetectionJob(
            ml.commonConfig.getADFqSingleMetricJobConfig(testData.adJobId),
            testData.initialSpace
          );
          await ml.api.createDataFrameAnalyticsJob(
            ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(testData.dfaJobId),
            testData.initialSpace
          );

          // this is already set during login but is reset between sub-suites
          await browser.setLocalStorageItem('home:welcome:show', 'false');
        });

        after(async () => {
          await ml.api.deleteAnomalyDetectionJobES(testData.adJobId);
          await ml.api.deleteDataFrameAnalyticsJobES(testData.dfaJobId);
        });

        it('should display original job only in assigned spaces', async () => {
          for (const spaceId of Object.values(spaceIds)) {
            await assertJobsDisplayedInSpace(
              testData.adJobId,
              testData.dfaJobId,
              spaceId,
              spaceId === testData.initialSpace
            );
          }
        });

        it('should display the initial job space correctly in the AD and DFA jobs lists', async () => {
          await ml.commonUI.changeToSpace(testData.initialSpace);
          await ml.navigation.navigateToStackManagementViaAppsMenu(); // use apps menu to keep the selected space
          await ml.navigation.navigateToStackManagementJobsListPage();

          // AD
          await ml.jobTable.filterWithSearchString(testData.adJobId, 1, 'stackMgmtJobList');
          await ml.stackManagementJobs.assertADJobRowSpaces(testData.adJobId, [
            testData.initialSpace,
          ]);

          // DFA
          await ml.navigation.navigateToStackManagementJobsListPageAnalyticsTab();
          await ml.stackManagementJobs.assertDFAJobRowSpaces(testData.dfaJobId, [
            testData.initialSpace,
          ]);
        });

        it('should edit job space assignment', async () => {
          // AD
          await ml.navigation.navigateToStackManagementJobsListPageAnomalyDetectionTab();
          await ml.stackManagementJobs.openADJobSpacesFlyout(testData.adJobId);
          await selectSpaces(testData);
          await ml.stackManagementJobs.saveAndCloseSpacesFlyout();

          // DFA
          await ml.navigation.navigateToStackManagementJobsListPageAnalyticsTab();
          await ml.stackManagementJobs.openDFAJobSpacesFlyout(testData.dfaJobId);
          await selectSpaces(testData);
          await ml.stackManagementJobs.saveAndCloseSpacesFlyout();
        });

        it('should display the updated job spaces correctly in the jobs list', async () => {
          if (testData.removeInitialSpace) {
            // initial space has been removed so job is not displayed here anymore to
            // validate the spaces, so we're changing to the first added space
            await ml.commonUI.changeToSpace(testData.spacesToAdd[0]);
            await ml.navigation.navigateToStackManagementViaAppsMenu(); // use apps menu to keep the selected space
            await ml.navigation.navigateToStackManagementJobsListPage();
          }

          const expectedJobRowSpaces = testData.assignToAllSpaces
            ? ['*']
            : [
                ...testData.spacesToAdd,
                ...(testData.removeInitialSpace ? [] : [testData.initialSpace]),
              ];

          // AD
          await ml.navigation.navigateToStackManagementJobsListPageAnomalyDetectionTab();
          await ml.jobTable.filterWithSearchString(testData.adJobId, 1, 'stackMgmtJobList');
          await ml.stackManagementJobs.assertADJobRowSpaces(testData.adJobId, expectedJobRowSpaces);

          // DFA
          await ml.navigation.navigateToStackManagementJobsListPageAnalyticsTab();
          await ml.dataFrameAnalyticsTable.filterWithSearchString(testData.dfaJobId);
          await ml.stackManagementJobs.assertDFAJobRowSpaces(
            testData.dfaJobId,
            expectedJobRowSpaces
          );
        });

        it('should display updated job only in assigned spaces', async () => {
          const assignedSpaces = testData.assignToAllSpaces
            ? Object.values(spaceIds)
            : [
                ...testData.spacesToAdd,
                ...(testData.removeInitialSpace ? [] : [testData.initialSpace]),
              ];

          for (const spaceId of Object.values(spaceIds)) {
            await assertJobsDisplayedInSpace(
              testData.adJobId,
              testData.dfaJobId,
              spaceId,
              assignedSpaces.includes(spaceId)
            );
          }
        });
      });
    }
  });
}
