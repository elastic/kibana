/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type SuperTest from 'supertest';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import {
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS,
} from '@kbn/cloud-security-posture-common';
import type { KbnClientSavedObjects } from '@kbn/test/src/kbn_client/kbn_client_saved_objects';
import { CLOUD_SECURITY_PLUGIN_VERSION } from '@kbn/cloud-security-posture-common';
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

const createDataView = async (
  supertest: SuperTest.Agent,
  id: string,
  name: string,
  title: string,
  space?: string
): Promise<{ data_view: { id: string } }> => {
  const basePath = space ? `/s/${space}` : '';
  const { body } = await supertest
    .post(`${basePath}/api/data_views/data_view`)
    .set('kbn-xsrf', 'foo')
    .send({ data_view: { id, title, name, timeFieldName: '@timestamp', allowNoIndex: true } })
    .expect(200);
  return body;
};

// eslint-disable-next-line import/no-default-export
export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const spacesService = getService('spaces');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const fetchingOfDataViewsTimeout = 1000 * 30; // 30 seconds

  /**
   * Installs the Cloud Security Posture package, which triggers plugin initialization and migration
   */
  const installCspPackageAndPackagePolicy = async () => {
    // Create agent policy with unique name
    const policyName = `Test CSP Policy ${Date.now()}`;
    const agentPolicyResponse = await supertest
      .post(`/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xx')
      .send({
        name: policyName,
        namespace: 'default',
        description: 'Test policy for CSP data views',
        monitoring_enabled: ['logs', 'metrics'],
      })
      .expect(200);

    const agentPolicyId = agentPolicyResponse.body.item.id;

    // Create a package policy for the CSP package
    const { body: packagePolicyResponse } = await supertest
      .post(`/api/fleet/package_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        force: true,
        name: `cloud_security_posture-${agentPolicyId}`,
        description: '',
        namespace: 'default',
        policy_id: agentPolicyId,
        enabled: true,
        inputs: [
          {
            type: 'cloudbeat/cis_aws',
            policy_template: 'cspm',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'logs',
                  dataset: 'cloud_security_posture.findings',
                },
              },
            ],
          },
        ],
        package: {
          name: 'cloud_security_posture',
          title: 'Security Posture Management',
          version: CLOUD_SECURITY_PLUGIN_VERSION,
        },
        vars: {
          deployment: {
            value: 'aws',
            type: 'text',
          },
          posture: {
            value: 'cspm',
            type: 'text',
          },
        },
      })
      .expect(200);

    return {
      agentPolicyId,
      packagePolicyId: packagePolicyResponse.item.id,
    };
  };

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

    describe('Misconfigurations old Data View removal', () => {
      it('Should delete old data view when installing CSP package', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        const oldDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${TEST_SPACE}`;

        // Create old v1 data view in test space
        const body = await createDataView(
          supertest,
          oldDataViewId,
          'Old Misconfiguration Data View v1',
          'security_solution-*.misconfiguration_latest',
          TEST_SPACE
        );
        expect(body.data_view.id).to.eql(oldDataViewId);

        // Install CSP package - this triggers plugin initialization which runs the migration
        await installCspPackageAndPackagePolicy();

        // Verify old v1 data view is deleted
        await retry.tryForTime(60000, async () => {
          const oldDataViewExistsAfterMigration = await getDataViewSafe(
            kibanaServer.savedObjects,
            oldDataViewId,
            TEST_SPACE
          );
          expect(oldDataViewExistsAfterMigration).to.be(false);
        });
      });

      it('Should delete legacy data view when installing CSP package', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        // Legacy data views don't have space suffix - they were global with wildcard namespaces
        const legacyDataViewId = CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS[0];

        // Create legacy data view (no space suffix, uses wildcard namespace)
        const body = await createDataView(
          supertest,
          legacyDataViewId,
          'Old Legacy Misconfiguration Data View',
          'logs-cloud_security_posture.findings_latest-*'
        );
        expect(body.data_view.id).to.eql(legacyDataViewId);

        // Install CSP package - this triggers plugin initialization which runs the migration
        await installCspPackageAndPackagePolicy();

        // Verify legacy data view is deleted (check in default space as it was global)
        await retry.tryForTime(60000, async () => {
          const legacyDataViewExistsAfterMigration = await getDataViewSafe(
            kibanaServer.savedObjects,
            legacyDataViewId,
            'default'
          );
          expect(legacyDataViewExistsAfterMigration).to.be(false);
        });
      });

      it('Should not delete unrelated dataviews when installing CSP package', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        // Create a random unrelated data view that should not be deleted
        const unrelatedDataViewId = 'test-unrelated-dataview-id';

        const unrelatedBody = await createDataView(
          supertest,
          unrelatedDataViewId,
          'Test Unrelated Data View',
          'test-unrelated-dataview-id',
          TEST_SPACE
        );
        expect(unrelatedBody.data_view.id).to.eql(unrelatedDataViewId);

        // Create old CSP data view to trigger migration
        const oldDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${TEST_SPACE}`;

        const oldBody = await createDataView(
          supertest,
          oldDataViewId,
          'Old Misconfiguration Data View v1',
          'security_solution-*.misconfiguration_latest',
          TEST_SPACE
        );
        expect(oldBody.data_view.id).to.eql(oldDataViewId);

        // Install CSP package - this triggers plugin initialization which runs the migration
        await installCspPackageAndPackagePolicy();

        // Verify old CSP data view is deleted as expected
        await retry.tryForTime(60000, async () => {
          const oldDataViewExists = await getDataViewSafe(
            kibanaServer.savedObjects,
            oldDataViewId,
            TEST_SPACE
          );
          expect(oldDataViewExists).to.be(false);
        });

        // Verify the unrelated data view still exists after migration
        const unrelatedDataViewExistsAfterMigration = await getDataViewSafe(
          kibanaServer.savedObjects,
          unrelatedDataViewId,
          TEST_SPACE
        );
        expect(unrelatedDataViewExistsAfterMigration).to.be(true);

        // Clean up the unrelated data view
        await kibanaServer.savedObjects.delete({
          type: 'index-pattern',
          id: unrelatedDataViewId,
          space: TEST_SPACE,
        });
      });
    });

    describe('Vulnerabilities old Data View removal', () => {
      it('Should delete old data view when installing CSP package', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        const oldDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${TEST_SPACE}`;

        // Create old v1 vulnerabilities data view in test space
        const body = await createDataView(
          supertest,
          oldDataViewId,
          'Old Vulnerabilities Data View v1',
          'security_solution-*.vulnerability_latest,logs-cloud_security_posture.vulnerabilities_latest-default',
          TEST_SPACE
        );
        expect(body.data_view.id).to.eql(oldDataViewId);

        // Install CSP package - this triggers plugin initialization which runs the migration
        await installCspPackageAndPackagePolicy();

        // Verify old v1 vulnerabilities data view is deleted
        await retry.tryForTime(60000, async () => {
          const oldDataViewExistsAfterMigration = await getDataViewSafe(
            kibanaServer.savedObjects,
            oldDataViewId,
            TEST_SPACE
          );
          expect(oldDataViewExistsAfterMigration).to.be(false);
        });
      });

      it('Should delete legacy data view when installing CSP package', async () => {
        await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });

        // Legacy data views don't have space suffix - they were global with wildcard namespaces
        const legacyDataViewId = CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS[0];

        // Create legacy vulnerabilities data view (no space suffix, uses wildcard namespace)
        const body = await createDataView(
          supertest,
          legacyDataViewId,
          'Old Legacy Vulnerabilities Data View',
          'logs-cloud_security_posture.vulnerabilities-*'
        );
        expect(body.data_view.id).to.eql(legacyDataViewId);

        // Install CSP package - this triggers plugin initialization which runs the migration
        await installCspPackageAndPackagePolicy();

        // Verify legacy vulnerabilities data view is deleted (check in default space as it was global)
        await retry.tryForTime(60000, async () => {
          const legacyDataViewExistsAfterMigration = await getDataViewSafe(
            kibanaServer.savedObjects,
            legacyDataViewId,
            'default'
          );
          expect(legacyDataViewExistsAfterMigration).to.be(false);
        });
      });
    });
  });
};
