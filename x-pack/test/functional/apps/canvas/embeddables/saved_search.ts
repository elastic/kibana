/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['canvas', 'common', 'header']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const archives = {
    es: 'test/functional/fixtures/es_archiver/dashboard/current/kibana',
    kbn: 'test/functional/fixtures/kbn_archiver/discover',
  };

  describe('saved search in canvas', function () {
    before(async () => {
      await esArchiver.load(archives.es);
      await kibanaServer.importExport.load(archives.kbn);

      // open canvas home
      await PageObjects.common.navigateToApp('canvas');
      // create new workpad
      await PageObjects.canvas.createNewWorkpad();
    });

    after(async () => {
      // await esArchiver.unload(archives.es);
    });

    describe('by-reference', () => {
      it('adds existing saved search embeddable from the visualize library', async () => {
        await PageObjects.canvas.clickAddFromLibrary();
        await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
      });

      it('edits saved search by-reference embeddable', async () => {});
    });
  });
}
