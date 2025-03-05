/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityFtrProviderContext } from './config';
import { datasetNames, defaultNamespace, getInitialTestLogs, getLogsForDataset } from './data';

export default function ({ getService, getPageObjects }: DatasetQualityFtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'security',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
  ]);
  const security = getService('security');
  const synthtrace = getService('logSynthtraceEsClient');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const to = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString();

  const apacheAccessDatasetName = 'apache.access';
  const apacheAccessDatasetHumanName = 'Apache access logs';
  const regularDataStreamName = `logs-${datasetNames[0]}-${defaultNamespace}`;
  const apacheAccessDataStreamName = `logs-${apacheAccessDatasetName}-${defaultNamespace}`;

  describe('Dataset quality handles user privileges', () => {
    before(async () => {
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();
    });

    after(async () => {
      await PageObjects.observabilityLogsExplorer.removeInstalledPackages();
    });

    describe('User cannot read any logs-*', () => {
      before(async () => {
        // Index logs for synth-* and apache.access datasets
        await synthtrace.index(getInitialTestLogs({ to, count: 4 }));

        await createDatasetQualityUserWithRole(security, 'dataset_quality_no_read', [], false);

        // Logout in order to re-login with a different user
        await PageObjects.security.forceLogout();
        await PageObjects.security.login(
          'dataset_quality_no_read',
          'dataset_quality_no_read-password',
          {
            expectSpaceSelector: false,
          }
        );

        await PageObjects.datasetQuality.navigateTo();
      });

      after(async () => {
        await synthtrace.clean();

        // Cleanup the user and role
        await PageObjects.security.forceLogout();
        await deleteDatasetQualityUserWithRole(security, 'dataset_quality_no_read');
      });

      it('shows empty state as user cannot read any dataset', async () => {
        // Existence of `datasetQualityNoPrivilegesEmptyState` cannot be asserted as without the logs-*-* read privilege,
        // only the management home screen is shown
        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.managementHome
        );
      });
    });

    describe('User can read logs-*', () => {
      before(async () => {
        await createDatasetQualityUserWithRole(security, 'dataset_quality_limited_user', [
          { names: ['logs-*'], privileges: ['read', 'view_index_metadata'] },
          { names: ['logs-synth*'], privileges: ['read'] }, // No monitor privilege
          { names: ['logs-apache*'], privileges: ['monitor'] },
        ]);

        // Logout in order to re-login with a different user
        await PageObjects.security.forceLogout();
        await PageObjects.security.login(
          'dataset_quality_limited_user',
          'dataset_quality_limited_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        // Cleanup the user and role
        await PageObjects.security.forceLogout();
        await deleteDatasetQualityUserWithRole(security, 'dataset_quality_limited_user');
      });

      describe('User cannot monitor any data stream', () => {
        before(async () => {
          // Index logs for synth-* and apache.access datasets
          await synthtrace.index(getInitialTestLogs({ to, count: 4 }));

          await PageObjects.datasetQuality.navigateTo();
        });

        after(async () => {
          await synthtrace.clean();
        });

        it('Estimated data are not available due to underprivileged user', async () => {
          await testSubjects.existOrFail(
            `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-${PageObjects.datasetQuality.texts.estimatedData}`
          );
        });

        it('does not show size column for underprivileged data stream', async () => {
          const cols = await PageObjects.datasetQuality.getDatasetTableHeaderTexts();

          expect(cols).to.not.contain('Size');
        });
      });

      describe('User can monitor some data streams', () => {
        before(async () => {
          // Index logs for synth-* and apache.access datasets
          await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
          await synthtrace.index(
            getLogsForDataset({ to, count: 10, dataset: apacheAccessDatasetName })
          );

          await PageObjects.datasetQuality.navigateTo();
        });

        after(async () => {
          await synthtrace.clean();
        });

        it('shows underprivileged warning when size cannot be accessed for some data streams', async () => {
          await PageObjects.datasetQuality.refreshTable();

          const datasetWithMonitorPrivilege = apacheAccessDatasetHumanName;
          const datasetWithoutMonitorPrivilege = 'synth.1';

          await retry.tryForTime(10000, async () => {
            // "Size" should be available for `apacheAccessDatasetName`
            await testSubjects.missingOrFail(
              `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-sizeBytes-${datasetWithMonitorPrivilege}`
            );
            // "Size" should not be available for `datasetWithoutMonitorPrivilege`
            await testSubjects.existOrFail(
              `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-sizeBytes-${datasetWithoutMonitorPrivilege}`
            );
          });
        });

        it('Details page shows insufficient privileges warning for underprivileged data stream', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: regularDataStreamName,
          });

          await testSubjects.existOrFail(
            `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-Size`
          );

          await PageObjects.datasetQuality.navigateTo();
        });

        it('"View dashboards" is hidden for underprivileged user', async () => {
          await PageObjects.datasetQuality.navigateToDetails({
            dataStream: apacheAccessDataStreamName,
          });
          await PageObjects.datasetQuality.openIntegrationActionsMenu();

          // "View Dashboards" is hidden
          await testSubjects.missingOrFail(
            PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsIntegrationAction(
              'ViewDashboards'
            )
          );

          await PageObjects.datasetQuality.navigateTo();
        });
      });
    });
  });
}

async function createDatasetQualityUserWithRole(
  security: ReturnType<DatasetQualityFtrProviderContext['getService']>,
  username: string,
  indices: Array<{ names: string[]; privileges: string[] }>,
  hasDataQualityPrivileges = true
) {
  const role = `${username}-role`;
  const password = `${username}-password`;
  const name = `${username}-name`;

  await security.role.create(role, {
    elasticsearch: {
      cluster: ['monitor'],
      indices,
    },
    kibana: [
      {
        feature: {
          dataQuality: [hasDataQualityPrivileges ? 'all' : 'none'],
          discover: ['all'],
          fleet: ['read'],
        },
        spaces: ['*'],
      },
    ],
  });

  return security.user.create(username, {
    password,
    roles: [role],
    full_name: name,
  });
}

async function deleteDatasetQualityUserWithRole(
  security: ReturnType<DatasetQualityFtrProviderContext['getService']>,
  username: string
) {
  await security.user.delete(username);
  await security.role.delete(`${username}-role`);
}
