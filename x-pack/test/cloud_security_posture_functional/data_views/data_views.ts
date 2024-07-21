/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import { DataViewAttributes } from '@kbn/data-views-plugin/common';
import { CDR_MISSCONFIGURATIONS_DATA_VIEW_ID_PREFIX } from '@kbn/cloud-security-posture-plugin/common/constants';
import { KbnClientSavedObjects } from '@kbn/test/src/kbn_client/kbn_client_saved_objects';

const TEST_SPACE = 'space-1';

const getDataViewSafe = async (
  soClient: KbnClientSavedObjects,
  dataViewId: string,
  currentSpaceId: string
): Promise<Boolean> => {
  try {
    const dataView = await soClient.get<DataViewAttributes>({
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

  const pageObjects = getPageObjects([
    'common',
    'findings',
    'cloudPostureDashboard',
    'header',
    'spaceSelector',
    'cspSecurity',
  ]);

  describe('Data Views', function () {
    this.tags(['cloud_security_posture_data_views', 'cloud_security_posture_spaces']);
    let cspSecurity = pageObjects.cspSecurity;

    before(async () => {
      await cspSecurity.createRoles();
      await cspSecurity.createUsers();
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['index-pattern'],
        space: 'default',
      });
      await kibanaServer.savedObjects.clean({
        types: ['index-pattern'],
        space: TEST_SPACE,
      });

      await spacesService.delete(TEST_SPACE);
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
    });

    it('Verify data view is created once user reach the findings page - default space', async () => {
      const soClient = await kibanaServer.savedObjects;
      await pageObjects.common.navigateToApp('home');

      const expectedDataViewId = `${CDR_MISSCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-default`;
      const idDataViewExists = await getDataViewSafe(soClient, expectedDataViewId, 'default');
      expect(idDataViewExists).to.be(false);

      let findings: typeof pageObjects.findings;
      findings = pageObjects.findings;
      await findings.navigateToLatestVulnerabilitiesPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      const idDataViewExistsPostFindingsNavigation = await getDataViewSafe(
        soClient,
        expectedDataViewId,
        'default'
      );
      expect(idDataViewExistsPostFindingsNavigation).to.be(true);
    });

    it('Verify data view is created once user reach the dashboard page - default space', async () => {
      await pageObjects.common.navigateToApp('home');

      const soClient = await kibanaServer.savedObjects;
      const expectedDataViewId = `${CDR_MISSCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-default`;
      const idDataViewExists = await getDataViewSafe(soClient, expectedDataViewId, 'default');
      expect(idDataViewExists).to.be(false);

      let cspDashboard: typeof pageObjects.cloudPostureDashboard;
      cspDashboard = pageObjects.cloudPostureDashboard;
      await cspDashboard.navigateToComplianceDashboardPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      const idDataViewExistsPostFindingsNavigation = await getDataViewSafe(
        soClient,
        expectedDataViewId,
        'default'
      );
      expect(idDataViewExistsPostFindingsNavigation).to.be(true);
    });

    it('Verify data view is created once user reach the findings page -  non default space', async () => {
      // await pageObjects.header.waitUntilLoadingHasFinished();
      await pageObjects.common.navigateToApp('home');

      await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });
      await pageObjects.spaceSelector.openSpacesNav();
      await pageObjects.spaceSelector.clickSpaceAvatar(TEST_SPACE);
      await pageObjects.header.waitUntilLoadingHasFinished();

      const soClient = await kibanaServer.savedObjects;
      const expectedDataViewId = `${CDR_MISSCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${TEST_SPACE}`;
      const idDataViewExists = await getDataViewSafe(soClient, expectedDataViewId, TEST_SPACE);
      expect(idDataViewExists).to.be(false);

      let findings: typeof pageObjects.findings;
      findings = pageObjects.findings;
      await findings.navigateToLatestFindingsPage(TEST_SPACE);
      await pageObjects.header.waitUntilLoadingHasFinished();

      const idDataViewExistsPostFindingsNavigation = await getDataViewSafe(
        soClient,
        expectedDataViewId,
        TEST_SPACE
      );
      expect(idDataViewExistsPostFindingsNavigation).to.be(true);
    });

    it('Verify data view is created once user reach the dashboard page -  non default space', async () => {
      // await pageObjects.header.waitUntilLoadingHasFinished();
      await pageObjects.common.navigateToApp('home');

      await spacesService.create({ id: TEST_SPACE, name: 'space_one', disabledFeatures: [] });
      await pageObjects.spaceSelector.openSpacesNav();
      await pageObjects.spaceSelector.clickSpaceAvatar(TEST_SPACE);
      await pageObjects.header.waitUntilLoadingHasFinished();

      const soClient = await kibanaServer.savedObjects;
      const expectedDataViewId = `${CDR_MISSCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${TEST_SPACE}`;
      const idDataViewExists = await getDataViewSafe(soClient, expectedDataViewId, TEST_SPACE);
      expect(idDataViewExists).to.be(false);

      let cspDashboard: typeof pageObjects.cloudPostureDashboard;
      cspDashboard = pageObjects.cloudPostureDashboard;
      await cspDashboard.navigateToComplianceDashboardPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      const idDataViewExistsPostFindingsNavigation = await getDataViewSafe(
        soClient,
        expectedDataViewId,
        'default'
      );
      expect(idDataViewExistsPostFindingsNavigation).to.be(true);
    });

    it('Verify data view is created once user with read permissions reach the dashboard page with', async () => {
      await cspSecurity.logout();
      await cspSecurity.login('csp_read_user');

      await pageObjects.common.navigateToApp('home');

      const soClient = await kibanaServer.savedObjects;
      const expectedDataViewId = `${CDR_MISSCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-default`;
      const idDataViewExists = await getDataViewSafe(soClient, expectedDataViewId, 'default');
      expect(idDataViewExists).to.be(false);

      let cspDashboard: typeof pageObjects.cloudPostureDashboard;
      cspDashboard = pageObjects.cloudPostureDashboard;
      await cspDashboard.navigateToComplianceDashboardPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      const idDataViewExistsPostFindingsNavigation = await getDataViewSafe(
        soClient,
        expectedDataViewId,
        'default'
      );
      expect(idDataViewExistsPostFindingsNavigation).to.be(true);
    });
  });
};
