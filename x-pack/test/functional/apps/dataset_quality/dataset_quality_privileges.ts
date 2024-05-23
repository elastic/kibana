/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityFtrProviderContext } from './config';
import { getInitialTestLogs, getLogsForDataset } from './data';

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
  const find = getService('find');
  const to = '2024-01-01T12:00:00.000Z';

  const apacheAccessDatasetName = 'apache.access';
  const apacheAccessDatasetHumanName = 'Apache access logs';

  describe('Dataset quality handles user privileges', () => {
    before(async () => {
      // Index logs for synth-* and apache.access datasets
      await synthtrace.clean();
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();

      await security.role.create('dataset_quality_limited_role', {
        elasticsearch: {
          cluster: ['monitor'],
          indices: [
            { names: ['logs-*'], privileges: ['read', 'view_index_metadata'] },
            { names: ['logs-synth*'], privileges: ['read'] }, // No monitor privilege
            { names: ['logs-apache*'], privileges: ['monitor'] },
          ],
        },
        kibana: [
          {
            feature: {
              discover: ['all'],
              fleet: ['none'],
            },
            spaces: ['*'],
          },
        ],
      });

      await security.user.create('dataset_quality_limited_user', {
        password: 'dataset_quality_limited_user-password',
        roles: ['dataset_quality_limited_role'],
        full_name: 'Dataset Quality Limited User',
      });

      await PageObjects.security.forceLogout();
      await PageObjects.security.login(
        'dataset_quality_limited_user',
        'dataset_quality_limited_user-password',
        {
          expectSpaceSelector: false,
        }
      );

      await PageObjects.datasetQuality.navigateTo();
    });

    it('Active and Estimated data are not available due to underprivileged user', async () => {
      await testSubjects.existOrFail(
        `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-${PageObjects.datasetQuality.texts.activeDatasets}`
      );
      await testSubjects.existOrFail(
        `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-${PageObjects.datasetQuality.texts.estimatedData}`
      );
    });

    it('"Show inactive datasets" is hidden when lastActivity is not available', async () => {
      await find.waitForDeletedByCssSelector(
        PageObjects.datasetQuality.selectors.showInactiveDatasetsNamesSwitch
      );
    });

    it('does not show size and last activity columns for underprivileged data stream', async () => {
      const cols = await PageObjects.datasetQuality.getDatasetTableHeaderTexts();

      expect(cols).to.not.contain('Size');
      expect(cols).to.not.contain('Last Activity');
    });

    it('shows underprivileged warning when size and last activity cannot be accessed for some data streams', async () => {
      await synthtrace.index(
        getLogsForDataset({ to, count: 10, dataset: apacheAccessDatasetName })
      );
      await PageObjects.datasetQuality.refreshTable();

      const datasetWithMonitorPrivilege = apacheAccessDatasetHumanName;
      const datasetWithoutMonitorPrivilege = 'synth.1';

      // "Size" and "Last Activity" should be available for `apacheAccessDatasetName`
      await testSubjects.missingOrFail(
        `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-sizeBytes-${datasetWithMonitorPrivilege}`
      );
      await testSubjects.missingOrFail(
        `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-lastActivity-${datasetWithMonitorPrivilege}`
      );

      // "Size" and "Last Activity" should not be available for `datasetWithoutMonitorPrivilege`
      await testSubjects.existOrFail(
        `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-sizeBytes-${datasetWithoutMonitorPrivilege}`
      );
      await testSubjects.existOrFail(
        `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-lastActivity-${datasetWithoutMonitorPrivilege}`
      );
    });

    it('flyout shows insufficient privileges warning for underprivileged data stream', async () => {
      await PageObjects.datasetQuality.openDatasetFlyout('synth.1');

      await testSubjects.existOrFail(
        `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-Size`
      );

      await PageObjects.datasetQuality.closeFlyout();
    });

    it('"View dashboards" and "See integration" is disabled for underprivileged user', async () => {
      await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);
      await PageObjects.datasetQuality.openIntegrationActionsMenu();

      await testSubjects.existOrFail(
        `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-View dashboards`
      );
      await testSubjects.existOrFail(
        `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-See integration`
      );

      await PageObjects.datasetQuality.closeFlyout();
    });

    after(async () => {
      await synthtrace.clean();
      await PageObjects.security.forceLogout();

      await security.user.delete('dataset_quality_limited_user');
      await security.role.delete('dataset_quality_limited_role');
    });
  });
}
