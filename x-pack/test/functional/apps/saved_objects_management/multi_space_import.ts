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
  const kibanaServer = getService('kibanaServer');

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

  const importIntoSpace = async (spaceId: string) => {
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
  };

  const checkIfDashboardRendered = async (spaceId: string) => {
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
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await spacesService.delete('another_space');
      await spacesService.delete('third_space');
    });

    it('imported dashboard into default space should render correctly', async () => {
      const spaceId = 'default';
      await importIntoSpace(spaceId);
      await checkIfDashboardRendered(spaceId);
    });

    it('imported dashboard into another space should render correctly', async () => {
      const spaceId = 'another_space';
      await importIntoSpace(spaceId);
      await checkIfDashboardRendered(spaceId);
    });

    it('copied dashboard from another space into third space using saved objects table should render correctly', async () => {
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
      await checkIfDashboardRendered(spaceId);
    });
  });
}
