/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This test is making sure that saved object id collisions across multiple spaces are handled correctly
 * https://github.com/elastic/kibana/issues/126940
 */

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects([
    'common',
    'settings',
    'savedObjects',
    'copySavedObjectsToSpace',
    'dashboard',
  ]);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const spacesService = getService('spaces');
  const renderService = getService('renderable');

  const getExportCount = async () => {
    return await retry.tryForTime(10000, async () => {
      const exportText = await testSubjects.getVisibleText('exportAllObjects');
      const parts = exportText.trim().split(' ');
      if (parts.length !== 3) {
        throw new Error('text not loaded yet');
      }
      const count = Number.parseInt(parts[1], 10);
      if (count === 0) {
        throw new Error('text not loaded yet');
      }
      return count;
    });
  };

  const getSpacePrefix = (spaceId: string) => {
    return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
  };

  describe('should be able to handle multi-space imports correctly', function () {
    before(async function () {
      await spacesService.create({
        id: 'another_space',
        name: 'another_space',
        disabledFeatures: [],
      });
      await spacesService.create({
        id: 'third_space',
        name: 'third_space',
        disabledFeatures: [],
      });
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      // await setTimeRange();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await spacesService.delete('another_space');
      await spacesService.delete('third_space');
    });

    it('should be able to import saved objects into default space', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();

      const initialObjectCount = await getExportCount();

      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_8.0.0_multispace_import.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
      await PageObjects.savedObjects.waitTableIsLoaded();

      const newObjectCount = await getExportCount();
      expect(newObjectCount - initialObjectCount).to.eql(6);
    });

    it('should render all panels on the dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('multi_space_import_8.0.0_export');
      // dashboard should load properly
      await PageObjects.dashboard.expectOnDashboard('multi_space_import_8.0.0_export');

      // count of panels rendered completely
      await renderService.waitForRender(8);

      // There should be 0 error embeddables on the dashboard
      const errorEmbeddables = await testSubjects.findAll('embeddableStackError');
      expect(errorEmbeddables.length).to.be(0);
    });

    it('should be able to import saved objects into another space', async function () {
      const spaceId = 'another_space';
      await PageObjects.common.navigateToUrl('settings', 'kibana/objects', {
        basePath: getSpacePrefix(spaceId),
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.savedObjects.waitTableIsLoaded();

      const initialObjectCount = await getExportCount();

      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_8.0.0_multispace_import.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
      await PageObjects.savedObjects.waitTableIsLoaded();

      const newObjectCount = await getExportCount();
      expect(newObjectCount - initialObjectCount).to.eql(6);
    });

    it('should render all panels on the dashboard in another space', async () => {
      const spaceId = 'another_space';
      await PageObjects.common.navigateToUrl('dashboard', undefined, {
        basePath: getSpacePrefix(spaceId),
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.dashboard.loadSavedDashboard('multi_space_import_8.0.0_export');

      // dashboard should load properly
      await PageObjects.dashboard.expectOnDashboard('multi_space_import_8.0.0_export');

      // count of panels rendered completely
      await renderService.waitForRender(8);

      // There should be 0 error embeddables on the dashboard
      const errorEmbeddables = await testSubjects.findAll('embeddableStackError');
      expect(errorEmbeddables.length).to.be(0);
    });

    it('should be able to copy the dashboard into third space in saved objects table using copy to space', async () => {
      const destinationSpaceId = 'third_space';
      const spaceId = 'another_space';
      await PageObjects.common.navigateToUrl('settings', 'kibana/objects', {
        basePath: getSpacePrefix(spaceId),
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.savedObjects.waitTableIsLoaded();
      await PageObjects.copySavedObjectsToSpace.openCopyToSpaceFlyoutForObject(
        'multi_space_import_8.0.0_export'
      );
      await PageObjects.copySavedObjectsToSpace.setupForm({
        createNewCopies: true,
        overwrite: false,
        destinationSpaceId,
      });
      await PageObjects.copySavedObjectsToSpace.startCopy();
      // Wait for successful copy
      await testSubjects.waitForDeleted(`cts-summary-indicator-loading-${destinationSpaceId}`);
      await testSubjects.existOrFail(`cts-summary-indicator-success-${destinationSpaceId}`);

      const summaryCounts = await PageObjects.copySavedObjectsToSpace.getSummaryCounts();

      expect(summaryCounts).to.eql({
        success: 6,
        pending: 0,
        skipped: 0,
        errors: 0,
      });
      await PageObjects.copySavedObjectsToSpace.finishCopy();
    });

    it('should render all panels on the copied dashboard in third space', async () => {
      const spaceId = 'third_space';
      await PageObjects.common.navigateToUrl('dashboard', undefined, {
        basePath: getSpacePrefix(spaceId),
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.dashboard.loadSavedDashboard('multi_space_import_8.0.0_export');

      // dashboard should load properly
      await PageObjects.dashboard.expectOnDashboard('multi_space_import_8.0.0_export');

      // count of panels rendered completely
      await renderService.waitForRender(8);

      // There should be 0 error embeddables on the dashboard
      const errorEmbeddables = await testSubjects.findAll('embeddableStackError');
      expect(errorEmbeddables.length).to.be(0);
    });
  });
}
