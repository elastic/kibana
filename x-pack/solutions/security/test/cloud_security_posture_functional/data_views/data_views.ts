/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import {
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_V1,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_V1,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
} from '@kbn/cloud-security-posture-common';
import type { KbnClientSavedObjects } from '@kbn/test/src/kbn_client/kbn_client_saved_objects';
import type { FtrProviderContext } from '../ftr_provider_context';

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
  const fetchingOfDataViewsTimeout = 1000 * 30; // 30 seconds

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
      await pageObjects.security.forceLogout();
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
        await pageObjects.common.navigateToApp('home');
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });
        await pageObjects.spaceSelector.openSpacesNav();
        await pageObjects.spaceSelector.clickSpaceAvatar(TEST_SPACE);
        await pageObjects.spaceSelector.expectHomePage(TEST_SPACE);

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
        await pageObjects.common.navigateToApp('home');
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });
        await pageObjects.spaceSelector.openSpacesNav();
        await pageObjects.spaceSelector.clickSpaceAvatar(TEST_SPACE);
        await pageObjects.spaceSelector.expectHomePage(TEST_SPACE);
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
        await pageObjects.common.navigateToApp('home');
        await cspSecurity.logout();
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

    describe('Data View Migration', () => {
      it('Should migrate from v1 to v2 data view when old data view exists', async () => {
        const oldDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_V1}-default`;
        const newDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-default`;

        // Create old v1 data view to simulate existing installation
        await kibanaServer.savedObjects.create({
          type: 'index-pattern',
          id: oldDataViewId,
          attributes: {
            title:
              'logs-*_latest_misconfigurations_cdr,logs-cloud_security_posture.findings_latest-default',
            name: 'Old Misconfiguration Data View',
            timeFieldName: '@timestamp',
            allowNoIndex: true,
          },
          overwrite: true,
        });

        // Verify old data view exists
        expect(await getDataViewSafe(kibanaServer.savedObjects, oldDataViewId, 'default')).to.be(
          true
        );

        // Navigate to findings page to trigger migration
        await findings.navigateToLatestFindingsPage();

        // Wait for migration to complete
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();

            // Verify old data view is deleted
            const oldDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              oldDataViewId,
              'default'
            );
            expect(oldDataViewExists).to.be(false);

            // Verify new v2 data view is created
            const newDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              newDataViewId,
              'default'
            );
            expect(newDataViewExists).to.be(true);
          },
        });
      });

      it('Should create v2 data view directly for new installations (no migration needed)', async () => {
        const oldDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_V1}-default`;
        const newDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-default`;

        // Ensure neither data view exists (simulating fresh installation)
        if (await getDataViewSafe(kibanaServer.savedObjects, oldDataViewId, 'default')) {
          await kibanaServer.savedObjects.delete({
            type: 'index-pattern',
            id: oldDataViewId,
            space: 'default',
          });
        }
        if (await getDataViewSafe(kibanaServer.savedObjects, newDataViewId, 'default')) {
          await kibanaServer.savedObjects.delete({
            type: 'index-pattern',
            id: newDataViewId,
            space: 'default',
          });
        }

        // Navigate to findings page
        await findings.navigateToLatestFindingsPage();

        // Wait for data view creation
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();

            // Verify old v1 data view was not created
            const oldDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              oldDataViewId,
              'default'
            );
            expect(oldDataViewExists).to.be(false);

            // Verify new v2 data view is created
            const newDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              newDataViewId,
              'default'
            );
            expect(newDataViewExists).to.be(true);
          },
        });
      });

      it('Should handle migration in non-default space', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        const oldDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_V1}-${TEST_SPACE}`;
        const newDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${TEST_SPACE}`;

        // Create old v1 data view in test space
        // Note: The space is already part of the data view ID and we've switched to the space
        await kibanaServer.savedObjects.create({
          type: 'index-pattern',
          id: oldDataViewId,
          attributes: {
            title:
              'logs-*_latest_misconfigurations_cdr,logs-cloud_security_posture.findings_latest-default',
            name: 'Old Misconfiguration Data View',
            timeFieldName: '@timestamp',
            allowNoIndex: true,
          },
          overwrite: true,
        });

        // Switch to test space
        await pageObjects.spaceSelector.openSpacesNav();
        await pageObjects.spaceSelector.clickSpaceAvatar(TEST_SPACE);
        await pageObjects.spaceSelector.expectHomePage(TEST_SPACE);

        // Navigate to findings page to trigger migration
        await findings.navigateToLatestFindingsPage();

        // Wait for migration to complete
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();

            // Verify old data view is deleted
            const oldDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              oldDataViewId,
              TEST_SPACE
            );
            expect(oldDataViewExists).to.be(false);

            // Verify new v2 data view is created
            const newDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              newDataViewId,
              TEST_SPACE
            );
            expect(newDataViewExists).to.be(true);
          },
        });
      });

      it('Should migrate all old data view versions when multiple exist', async () => {
        const newDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-default`;

        // Create multiple old data views to simulate upgrading from different versions
        for (const oldVersion of CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS) {
          const oldDataViewId = `${oldVersion}-default`;
          await kibanaServer.savedObjects.create({
            type: 'index-pattern',
            id: oldDataViewId,
            attributes: {
              title: 'logs-*_old_pattern',
              name: `Old Data View ${oldVersion}`,
              timeFieldName: '@timestamp',
              allowNoIndex: true,
            },
            overwrite: true,
          });

          // Verify old data view was created
          expect(await getDataViewSafe(kibanaServer.savedObjects, oldDataViewId, 'default')).to.be(
            true
          );
        }

        // Navigate to findings page to trigger migration
        await findings.navigateToLatestFindingsPage();

        // Wait for migration to complete
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();

            // Verify all old data views are deleted
            for (const oldVersion of CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS) {
              const oldDataViewId = `${oldVersion}-default`;
              const oldDataViewExists = await getDataViewSafe(
                kibanaServer.savedObjects,
                oldDataViewId,
                'default'
              );
              expect(oldDataViewExists).to.be(false);
            }

            // Verify new v2 data view is created
            const newDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              newDataViewId,
              'default'
            );
            expect(newDataViewExists).to.be(true);
          },
        });
      });
    });

    describe('Vulnerabilities Data View Migration', () => {
      it('Should migrate vulnerabilities from v1 to v2 data view when old data view exists', async () => {
        const oldDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_V1}-default`;
        const newDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX}-default`;

        // Create old v1 vulnerabilities data view to simulate existing installation
        await kibanaServer.savedObjects.create({
          type: 'index-pattern',
          id: oldDataViewId,
          attributes: {
            title: 'logs-cloud_security_posture.vulnerabilities_latest-default',
            name: 'Old Vulnerabilities Data View',
            timeFieldName: '@timestamp',
            allowNoIndex: true,
          },
          overwrite: true,
        });

        // Verify old data view exists
        expect(await getDataViewSafe(kibanaServer.savedObjects, oldDataViewId, 'default')).to.be(
          true
        );

        // Navigate to vulnerabilities page to trigger migration
        await findings.navigateToLatestVulnerabilitiesPage();

        // Wait for migration to complete
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();

            // Verify old data view is deleted
            const oldDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              oldDataViewId,
              'default'
            );
            expect(oldDataViewExists).to.be(false);

            // Verify new v2 data view is created
            const newDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              newDataViewId,
              'default'
            );
            expect(newDataViewExists).to.be(true);
          },
        });
      });

      it('Should create v2 vulnerabilities data view directly for new installations', async () => {
        const oldDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_V1}-default`;
        const newDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX}-default`;

        // Ensure neither data view exists (simulating fresh installation)
        if (await getDataViewSafe(kibanaServer.savedObjects, oldDataViewId, 'default')) {
          await kibanaServer.savedObjects.delete({
            type: 'index-pattern',
            id: oldDataViewId,
            space: 'default',
          });
        }
        if (await getDataViewSafe(kibanaServer.savedObjects, newDataViewId, 'default')) {
          await kibanaServer.savedObjects.delete({
            type: 'index-pattern',
            id: newDataViewId,
            space: 'default',
          });
        }

        // Navigate to vulnerabilities page
        await findings.navigateToLatestVulnerabilitiesPage();

        // Wait for data view creation
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();

            // Verify old v1 data view was not created
            const oldDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              oldDataViewId,
              'default'
            );
            expect(oldDataViewExists).to.be(false);

            // Verify new v2 data view is created
            const newDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              newDataViewId,
              'default'
            );
            expect(newDataViewExists).to.be(true);
          },
        });
      });

      it('Should handle vulnerabilities migration in non-default space', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        const oldDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_V1}-${TEST_SPACE}`;
        const newDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX}-${TEST_SPACE}`;

        // Create old v1 data view in test space
        // Note: The space is already part of the data view ID and we've switched to the space
        await kibanaServer.savedObjects.create({
          type: 'index-pattern',
          id: oldDataViewId,
          attributes: {
            title: 'logs-cloud_security_posture.vulnerabilities_latest-default',
            name: 'Old Vulnerabilities Data View',
            timeFieldName: '@timestamp',
            allowNoIndex: true,
          },
          overwrite: true,
        });

        // Switch to test space
        await pageObjects.spaceSelector.openSpacesNav();
        await pageObjects.spaceSelector.clickSpaceAvatar(TEST_SPACE);
        await pageObjects.spaceSelector.expectHomePage(TEST_SPACE);

        // Navigate to vulnerabilities page to trigger migration
        await findings.navigateToLatestVulnerabilitiesPage();

        // Wait for migration to complete
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();

            // Verify old data view is deleted
            const oldDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              oldDataViewId,
              TEST_SPACE
            );
            expect(oldDataViewExists).to.be(false);

            // Verify new v2 data view is created
            const newDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              newDataViewId,
              TEST_SPACE
            );
            expect(newDataViewExists).to.be(true);
          },
        });
      });

      it('Should migrate all old vulnerabilities data view versions when multiple exist', async () => {
        const newDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX}-default`;

        // Create multiple old data views to simulate upgrading from different versions
        for (const oldVersion of CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS) {
          const oldDataViewId = `${oldVersion}-default`;
          await kibanaServer.savedObjects.create({
            type: 'index-pattern',
            id: oldDataViewId,
            attributes: {
              title: 'logs-*_old_vuln_pattern',
              name: `Old Vulnerabilities Data View ${oldVersion}`,
              timeFieldName: '@timestamp',
              allowNoIndex: true,
            },
            overwrite: true,
          });

          // Verify old data view was created
          expect(await getDataViewSafe(kibanaServer.savedObjects, oldDataViewId, 'default')).to.be(
            true
          );
        }

        // Navigate to vulnerabilities page to trigger migration
        await findings.navigateToLatestVulnerabilitiesPage();

        // Wait for migration to complete
        await waitForDataViews({
          timeout: fetchingOfDataViewsTimeout,
          action: async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();

            // Verify all old data views are deleted
            for (const oldVersion of CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS) {
              const oldDataViewId = `${oldVersion}-default`;
              const oldDataViewExists = await getDataViewSafe(
                kibanaServer.savedObjects,
                oldDataViewId,
                'default'
              );
              expect(oldDataViewExists).to.be(false);
            }

            // Verify new v2 data view is created
            const newDataViewExists = await getDataViewSafe(
              kibanaServer.savedObjects,
              newDataViewId,
              'default'
            );
            expect(newDataViewExists).to.be(true);
          },
        });
      });
    });
  });
};
