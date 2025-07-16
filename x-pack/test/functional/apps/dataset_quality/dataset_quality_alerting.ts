/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityFtrProviderContext } from './config';
import { getInitialTestLogs } from './data';
import {
  createDatasetQualityUserWithRole,
  deleteDatasetQualityUserWithRole,
} from './roles/role_management';

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

  const to = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString();

  describe('Dataset quality handles user privileges', () => {
    before(async () => {
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();
    });

    after(async () => {
      await PageObjects.observabilityLogsExplorer.removeInstalledPackages();
    });

    describe('User cannot create rules', () => {
      before(async () => {
        // Index logs for synth-* and apache.access datasets
        await synthtrace.index(getInitialTestLogs({ to, count: 4 }));

        await createDatasetQualityUserWithRole(security, 'canManageAlerts', [
          { names: ['logs-*'], privileges: ['all'] },
        ]);

        // Logout in order to re-login with a different user
        await PageObjects.security.forceLogout();
        await PageObjects.security.login('canManageAlerts', 'canManageAlerts-password', {
          expectSpaceSelector: false,
        });

        await PageObjects.datasetQuality.navigateTo();
      });

      after(async () => {
        await synthtrace.clean();

        // Cleanup the user and role
        await PageObjects.security.forceLogout();
        await deleteDatasetQualityUserWithRole(security, 'canManageAlerts');
      });

      it('page does not show create rule button', async () => {
        await testSubjects.missingOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsHeaderButton
        );
      });
    });

    describe('User can create rules', () => {
      before(async () => {
        await createDatasetQualityUserWithRole(security, 'canManageRules', [
          { names: ['logs-*'], privileges: ['all'] },
        ]);

        // Logout in order to re-login with a different user
        await PageObjects.security.forceLogout();
        await PageObjects.security.login('canManageRules', 'canManageRules-password', {
          expectSpaceSelector: false,
        });

        await PageObjects.datasetQuality.navigateTo();
      });

      after(async () => {
        // Cleanup the user and role
        await PageObjects.security.forceLogout();
        await deleteDatasetQualityUserWithRole(security, 'canManageRules');
      });

      it('page shows create rule button', async () => {
        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsHeaderButton
        );
      });
    });
  });
}
