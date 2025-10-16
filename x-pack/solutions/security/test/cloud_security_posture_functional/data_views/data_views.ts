/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS,
} from '@kbn/cloud-security-posture-common';
import type { KbnClientSavedObjects } from '@kbn/test/src/kbn_client/kbn_client_saved_objects';
import type { FtrProviderContext } from '../ftr_provider_context';
import { CLOUD_SECURITY_POSTURE_PACKAGE_VERSION } from '../constants';

const TEST_SPACE = 'space-1';

const DATA_VIEW_PREFIXES = [
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
];

const getDataViewSafe = async (
  soClient: KbnClientSavedObjects,
  dataViewId: string,
  currentSpaceId: string
): Promise<boolean> => {
  try {
    await soClient.get<DataViewAttributes>({
      type: 'index-pattern',
      id: dataViewId,
      space: currentSpaceId,
    });
    return true;
  } catch (e) {
    return false;
  }
};

// eslint-disable-next-line import/no-default-export
export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const spacesService = getService('spaces');
  const retry = getService('retry');
  const log = getService('log');
  const supertest = getService('supertest');
  const fetchingOfDataViewsTimeout = 1000 * 30; // 30 seconds

  /**
   * Installs the Cloud Security Posture package, which triggers plugin initialization and migration
   */
  const installCspPackage = async () => {
    log.debug(
      `Installing cloud_security_posture package version ${CLOUD_SECURITY_POSTURE_PACKAGE_VERSION}`
    );
    const response = await supertest
      .post(
        `/api/fleet/epm/packages/cloud_security_posture/${CLOUD_SECURITY_POSTURE_PACKAGE_VERSION}`
      )
      .set('kbn-xsrf', 'xxxx')
      .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
      .send({ force: true })
      .expect(200);

    log.debug('CSP package installed successfully');
    return response.body;
  };

  /**
   * Waits for the CSP plugin to complete initialization (which includes running migrations)
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Checking if CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('x-elastic-internal-origin', 'kibana')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const pageObjects = getPageObjects([
    'common',
    'findings',
    'cloudPostureDashboard',
    'header',
    'spaceSelector',
    'cspSecurity',
    'security',
  ]);

  describe('Data Views', async function () {
    this.tags(['cloud_security_posture_data_views', 'cloud_security_posture_spaces']);
    let cspSecurity = pageObjects.cspSecurity;
    let findings: typeof pageObjects.findings;

    const waitForDataViews = async ({
      timeout,
      action,
    }: {
      timeout: number;
      action: () => Promise<void>;
    }) => {
      await retry.tryForTime(timeout, action);
    };

    before(async () => {
      await spacesService.delete(TEST_SPACE);

      cspSecurity = pageObjects.cspSecurity;
      findings = pageObjects.findings;
      await cspSecurity.createRoles();
      await cspSecurity.createUsers();
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['index-pattern'],
        space: 'default',
      });
      await kibanaServer.savedObjects.clean({
        types: ['index-pattern'],
        space: TEST_SPACE,
      });

      await spacesService.delete(TEST_SPACE);

      // Wrap logout in try-catch as it can be flaky and shouldn't fail the entire test
      try {
        await pageObjects.security.forceLogout();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('Warning: forceLogout failed during cleanup, but test cleanup will continue');
      }
    });

    DATA_VIEW_PREFIXES.forEach((dataViewPrefix) => {
      it('Verify data view is created once user reach the findings page - default space', async () => {
        const expectedDataViewId = `${dataViewPrefix}-default`;

        if (await getDataViewSafe(kibanaServer.savedObjects, expectedDataViewId, 'default')) {
          await kibanaServer.savedObjects.delete({
            type: 'index-pattern',
            id: expectedDataViewId,
            space: 'default',
          });

          await retry.try(async () => {
            expect(
              await getDataViewSafe(kibanaServer.savedObjects, expectedDataViewId, 'default')
            ).to.be(false);
          });
        }

        await findings.navigateToLatestVulnerabilitiesPage();

        // give more time for the data view to be fetched before checking loading status
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();

            const idDataViewExistsPostFindingsNavigation = await getDataViewSafe(
              kibanaServer.savedObjects,
              expectedDataViewId,
              'default'
            );
            expect(idDataViewExistsPostFindingsNavigation).to.be(true);
          },
        });
      });
    });

    DATA_VIEW_PREFIXES.forEach((dataViewPrefix) => {
      it('Verify data view is created once user reach the dashboard page - default space', async () => {
        const expectedDataViewId = `${dataViewPrefix}-default`;

        if (await getDataViewSafe(kibanaServer.savedObjects, expectedDataViewId, 'default')) {
          await kibanaServer.savedObjects.delete({
            type: 'index-pattern',
            id: expectedDataViewId,
            space: 'default',
          });

          await retry.try(async () => {
            expect(
              await getDataViewSafe(kibanaServer.savedObjects, expectedDataViewId, 'default')
            ).to.be(false);
          });
        }

        const cspDashboard = pageObjects.cloudPostureDashboard;
        await cspDashboard.navigateToComplianceDashboardPage();
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();

            const idDataViewExistsPostFindingsNavigation = await getDataViewSafe(
              kibanaServer.savedObjects,
              expectedDataViewId,
              'default'
            );
            expect(idDataViewExistsPostFindingsNavigation).to.be(true);
          },
        });
      });
    });

    DATA_VIEW_PREFIXES.forEach((dataViewPrefix) => {
      it('Verify data view is created once user reach the findings page -  non default space', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        const expectedDataViewId = `${dataViewPrefix}-${TEST_SPACE}`;
        if (await getDataViewSafe(kibanaServer.savedObjects, expectedDataViewId, TEST_SPACE)) {
          await kibanaServer.savedObjects.delete({
            type: 'index-pattern',
            id: expectedDataViewId,
            space: TEST_SPACE,
          });

          await retry.try(async () => {
            expect(
              await getDataViewSafe(kibanaServer.savedObjects, expectedDataViewId, TEST_SPACE)
            ).to.be(false);
          });
        }

        // Navigate directly to findings page in the test space
        await findings.navigateToLatestFindingsPage(TEST_SPACE);
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();
            const idDataViewExistsPostFindingsNavigation = await getDataViewSafe(
              kibanaServer.savedObjects,
              expectedDataViewId,
              TEST_SPACE
            );
            expect(idDataViewExistsPostFindingsNavigation).to.be(true);
          },
        });
      });
    });

    DATA_VIEW_PREFIXES.forEach((dataViewPrefix) => {
      it('Verify data view is created once user reach the dashboard page -  non default space', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });
        const expectedDataViewId = `${dataViewPrefix}-${TEST_SPACE}`;

        if (await getDataViewSafe(kibanaServer.savedObjects, expectedDataViewId, TEST_SPACE)) {
          await kibanaServer.savedObjects.delete({
            type: 'index-pattern',
            id: expectedDataViewId,
            space: TEST_SPACE,
          });

          await retry.try(async () => {
            expect(
              await getDataViewSafe(kibanaServer.savedObjects, expectedDataViewId, TEST_SPACE)
            ).to.be(false);
          });
        }

        // Navigate directly to dashboard page in the test space
        const cspDashboard = pageObjects.cloudPostureDashboard;
        await cspDashboard.navigateToComplianceDashboardPage(TEST_SPACE);
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();
            const idDataViewExistsPostFindingsNavigation = await getDataViewSafe(
              kibanaServer.savedObjects,
              expectedDataViewId,
              TEST_SPACE
            );
            expect(idDataViewExistsPostFindingsNavigation).to.be(true);
          },
        });
      });
    });

    DATA_VIEW_PREFIXES.forEach((dataViewPrefix) => {
      it('Verify data view is created once user with read permissions reach the dashboard page', async () => {
        // Ensure we're logged out first before attempting to login with read user
        try {
          await pageObjects.security.forceLogout();
        } catch (e) {
          // If logout fails, continue - we might already be logged out
        }

        await cspSecurity.login('csp_read_user');
        const expectedDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-default`;

        if (await getDataViewSafe(kibanaServer.savedObjects, expectedDataViewId, 'default')) {
          await kibanaServer.savedObjects.delete({
            type: 'index-pattern',
            id: expectedDataViewId,
            space: 'default',
          });

          await retry.try(async () => {
            expect(
              await getDataViewSafe(kibanaServer.savedObjects, expectedDataViewId, 'default')
            ).to.be(false);
          });
        }

        const cspDashboard = pageObjects.cloudPostureDashboard;
        await cspDashboard.navigateToComplianceDashboardPage();
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();
            const idDataViewExistsPostFindingsNavigation = await getDataViewSafe(
              kibanaServer.savedObjects,
              expectedDataViewId,
              'default'
            );
            expect(idDataViewExistsPostFindingsNavigation).to.be(true);
          },
        });
      });
    });

    describe('MisconfigurationsData View Migration', () => {
      it('Should migrate from v1 to v2 data view when old data view exists', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        const oldDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${TEST_SPACE}`;
        const newDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${TEST_SPACE}`;

        // Create old v1 data view in test space
        await kibanaServer.request({
          path: `/s/${TEST_SPACE}/internal/ftr/kbn_client_so/index-pattern/${oldDataViewId}`,
          method: 'POST',
          query: { overwrite: true },
          body: {
            attributes: {
              title: 'security_solution-*.misconfiguration_latest',
              name: 'Old Misconfiguration Data View v1',
              timeFieldName: '@timestamp',
              allowNoIndex: true,
            },
          },
        });

        // Install CSP package - this triggers plugin initialization which runs the migration
        await installCspPackage();

        // Wait for plugin initialization (and migration) to complete
        await waitForPluginInitialized();

        // Verify old v1 data view is deleted
        await retry.tryForTime(20000, async () => {
          const oldDataViewExists = await getDataViewSafe(
            kibanaServer.savedObjects,
            oldDataViewId,
            TEST_SPACE
          );
          expect(oldDataViewExists).to.be(false);
        });

        // navigate to the findings page in the test space to trigger new data view creation
        await findings.navigateToLatestFindingsPage(TEST_SPACE);

        // Verify new v2 data view is created
        const newDataViewExists = await getDataViewSafe(
          kibanaServer.savedObjects,
          newDataViewId,
          TEST_SPACE
        );
        expect(newDataViewExists).to.be(true);
      });

      it('Should migrate from legacy to v2 data view when old data view exists', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        // Legacy data views don't have space suffix - they were global with wildcard namespaces
        const legacyDataViewId = CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS[0];
        const newDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${TEST_SPACE}`;

        // Create legacy data view (no space suffix, uses wildcard namespace)
        await kibanaServer.request({
          path: `/internal/ftr/kbn_client_so/index-pattern/${legacyDataViewId}`,
          method: 'POST',
          query: { overwrite: true },
          body: {
            attributes: {
              title: 'logs-cloud_security_posture.findings_latest-*',
              name: 'Old Legacy Misconfiguration Data View',
              timeFieldName: '@timestamp',
              allowNoIndex: true,
            },
          },
        });

        // Install CSP package - this triggers plugin initialization which runs the migration
        await installCspPackage();

        // Wait for plugin initialization (and migration) to complete
        await waitForPluginInitialized();

        // Verify legacy data view is deleted (check in default space as it was global)
        await retry.tryForTime(20000, async () => {
          const legacyDataViewExists = await getDataViewSafe(
            kibanaServer.savedObjects,
            legacyDataViewId,
            'default'
          );
          expect(legacyDataViewExists).to.be(false);
        });

        // navigate to the findings page in the test space to trigger new data view creation
        await findings.navigateToLatestFindingsPage(TEST_SPACE);

        // Verify new v2 data view is created
        const newDataViewExists = await getDataViewSafe(
          kibanaServer.savedObjects,
          newDataViewId,
          TEST_SPACE
        );
        expect(newDataViewExists).to.be(true);
      });

      it('Should handle migration across all spaces', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        // Legacy data views don't have space suffix - they were global with wildcard namespaces
        const legacyDataViewId = CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS[0];
        const newDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${TEST_SPACE}`;

        // Create legacy data view (global, no space suffix)
        await kibanaServer.request({
          path: `/internal/ftr/kbn_client_so/index-pattern/${legacyDataViewId}`,
          method: 'POST',
          query: { overwrite: true },
          body: {
            attributes: {
              title:
                'logs-*_latest_misconfigurations_cdr,logs-cloud_security_posture.findings_latest-default',
              name: 'Old Misconfiguration Data View',
              timeFieldName: '@timestamp',
              allowNoIndex: true,
            },
          },
        });

        // Install CSP package - this triggers plugin initialization which runs the migration
        // The migration searches across all spaces and deletes legacy data views globally
        await installCspPackage();

        await retry.tryForTime(20000, async () => {
          // Verify legacy data view is deleted (check in default space as it was global)
          const legacyDataViewExists = await getDataViewSafe(
            kibanaServer.savedObjects,
            legacyDataViewId,
            'default'
          );
          expect(legacyDataViewExists).to.be(false);
        });

        // navigate to the findings page in the test space to trigger new data view creation
        await findings.navigateToLatestFindingsPage(TEST_SPACE);

        // Verify new v2 data view is created in the test space
        const newDataViewExists = await getDataViewSafe(
          kibanaServer.savedObjects,
          newDataViewId,
          TEST_SPACE
        );
        expect(newDataViewExists).to.be(true);
      });
    });

    describe('Vulnerabilities Data View Migration', () => {
      it('Should migrate vulnerabilities from v1 to v2 data view when old data view exists', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        const oldDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${TEST_SPACE}`;
        const newDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX}-${TEST_SPACE}`;

        // Create old v1 vulnerabilities data view in test space
        await kibanaServer.request({
          path: `/s/${TEST_SPACE}/internal/ftr/kbn_client_so/index-pattern/${oldDataViewId}`,
          method: 'POST',
          query: { overwrite: true },
          body: {
            attributes: {
              title:
                'security_solution-*.vulnerability_latest,logs-cloud_security_posture.vulnerabilities_latest-default',
              name: 'Old Vulnerabilities Data View v1',
              timeFieldName: '@timestamp',
              allowNoIndex: true,
            },
          },
        });

        // Install CSP package - this triggers plugin initialization which runs the migration
        await installCspPackage();

        // Wait for plugin initialization (and migration) to complete
        await waitForPluginInitialized();

        // Verify old v1 vulnerabilities data view is deleted
        await retry.tryForTime(20000, async () => {
          const oldDataViewExists = await getDataViewSafe(
            kibanaServer.savedObjects,
            oldDataViewId,
            TEST_SPACE
          );
          expect(oldDataViewExists).to.be(false);
        });

        // navigate to the findings page in the test space to trigger new data view creation
        await findings.navigateToLatestFindingsPage(TEST_SPACE);

        // Verify new v2 vulnerabilities data view is created
        const newDataViewExists = await getDataViewSafe(
          kibanaServer.savedObjects,
          newDataViewId,
          TEST_SPACE
        );
        expect(newDataViewExists).to.be(true);
      });

      it('Should migrate from legacy to v2 data view when old data view exists', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        // Legacy data views don't have space suffix - they were global with wildcard namespaces
        const legacyDataViewId = CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS[0];
        const newDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX}-${TEST_SPACE}`;

        // Create legacy vulnerabilities data view (no space suffix, uses wildcard namespace)
        await kibanaServer.request({
          path: `/internal/ftr/kbn_client_so/index-pattern/${legacyDataViewId}`,
          method: 'POST',
          query: { overwrite: true },
          body: {
            attributes: {
              title: 'logs-cloud_security_posture.vulnerabilities-*',
              name: 'Old Legacy Vulnerabilities Data View',
              timeFieldName: '@timestamp',
              allowNoIndex: true,
            },
          },
        });

        // Install CSP package - this triggers plugin initialization which runs the migration
        await installCspPackage();

        // Wait for plugin initialization (and migration) to complete
        await waitForPluginInitialized();

        // Verify legacy vulnerabilities data view is deleted (check in default space as it was global)
        await retry.tryForTime(20000, async () => {
          const legacyDataViewExists = await getDataViewSafe(
            kibanaServer.savedObjects,
            legacyDataViewId,
            'default'
          );
          expect(legacyDataViewExists).to.be(false);
        });

        // navigate to the findings page in the test space to trigger new data view creation
        await findings.navigateToLatestFindingsPage(TEST_SPACE);

        // Verify new v2 vulnerabilities data view is created
        const newDataViewExists = await getDataViewSafe(
          kibanaServer.savedObjects,
          newDataViewId,
          TEST_SPACE
        );
        expect(newDataViewExists).to.be(true);
      });

      it('Should handle vulnerabilities migration across all spaces', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        // Legacy data views don't have space suffix - they were global with wildcard namespaces
        const legacyDataViewId = CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS[1];
        const newDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX}-${TEST_SPACE}`;

        // Create legacy vulnerabilities data view (global, no space suffix)
        await kibanaServer.request({
          path: `/internal/ftr/kbn_client_so/index-pattern/${legacyDataViewId}`,
          method: 'POST',
          query: { overwrite: true },
          body: {
            attributes: {
              title: 'logs-cloud_security_posture.vulnerabilities_latest-*',
              name: 'Old Vulnerabilities Data View',
              timeFieldName: '@timestamp',
              allowNoIndex: true,
            },
          },
        });

        // Install CSP package - this triggers plugin initialization which runs the migration
        // The migration searches across all spaces and deletes legacy data views globally
        await installCspPackage();

        // Wait for plugin initialization (and migration) to complete
        await waitForPluginInitialized();

        // Verify legacy vulnerabilities data view is deleted (check in default space as it was global)
        await retry.tryForTime(20000, async () => {
          const legacyDataViewExists = await getDataViewSafe(
            kibanaServer.savedObjects,
            legacyDataViewId,
            'default'
          );
          expect(legacyDataViewExists).to.be(false);
        });

        // navigate to the findings page in the test space to trigger new data view creation
        await findings.navigateToLatestFindingsPage(TEST_SPACE);

        // Verify new v2 vulnerabilities data view is created in the test space
        const newDataViewExists = await getDataViewSafe(
          kibanaServer.savedObjects,
          newDataViewId,
          TEST_SPACE
        );
        expect(newDataViewExists).to.be(true);
      });
    });
  });
};
