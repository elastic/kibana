/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function canvasFiltersTest({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['canvas', 'common']);
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const spacesService = getService('spaces');
  const archive = 'x-pack/test/functional/fixtures/kbn_archiver/canvas/saved_object_resolve';
  const browser = getService('browser');

  describe('filters', function () {
    // there is an issue with FF not properly clicking on workpad elements
    this.tags('skipFirefox');

    before(async () => {
      await spacesService.create({
        id: 'custom_space',
        name: 'custom_space',
        disabledFeatures: [],
      });

      await kibanaServer.importExport.load(archive, { space: 'custom_space' });

      // Create alias match
      await kibanaServer.savedObjects.create({
        type: 'legacy-url-alias',
        id: 'custom_space:canvas-workpad:workpad-1705f884-6224-47de-ba49-ca224fe6ec31-old-id',
        overwrite: true,
        attributes: {
          targetType: 'canvas-workpad',
          targetId: 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-new-id',
          targetNamespace: 'custom_space',
          sourceId: 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-old-id',
          purpose: 'savedObjectConversion',
        },
        references: [],
        migrationVersion: { 'legacy-url-alias': '8.2.0' },
      });

      // Create conflict match
      await kibanaServer.savedObjects.create({
        type: 'legacy-url-alias',
        id: 'custom_space:canvas-workpad:workpad-1705f884-6224-47de-ba49-ca224fe6ec31-conflict-old',
        overwrite: true,
        attributes: {
          targetType: 'canvas-workpad',
          targetId: 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-conflict-new',
          targetNamespace: 'custom_space',
          sourceId: 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-conflict-old',
          purpose: 'savedObjectConversion',
        },
        references: [],
        migrationVersion: { 'legacy-url-alias': '8.2.0' },
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.bulkDelete({
        objects: [
          {
            type: 'legacy-url-alias',
            id: 'custom_space:canvas-workpad:workpad-1705f884-6224-47de-ba49-ca224fe6ec31-old-id',
          },
          {
            type: 'legacy-url-alias',
            id: 'custom_space:canvas-workpad:workpad-1705f884-6224-47de-ba49-ca224fe6ec31-conflict-old',
          },
        ],
      });
      await kibanaServer.importExport.unload(archive, { space: 'custom_space' });
      await spacesService.delete('custom_space');
    });

    it('redirects an alias match', async () => {
      await PageObjects.common.navigateToApp('canvas', {
        basePath: '/s/custom_space',
        hash: '/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31-old-id/page/1',
      });

      // Wait for the redirect toast
      await retry.try(async () => {
        const text = await (
          await find.byCssSelector('.euiGlobalToastList .euiToast .euiText')
        ).getVisibleText();

        expect(text.includes("The Workpad you're looking for has a new location.")).to.be(true);
      });

      const currentUrl = await browser.getCurrentUrl();

      expect(
        currentUrl.includes('/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31-new-id')
      ).to.be(true);

      await retry.try(async () => {
        const elements = await testSubjects.findAll(
          'canvasWorkpadPage > canvasWorkpadPageElementContent'
        );
        expect(elements).to.have.length(4);
      });
    });

    it('handles a conflict match', async () => {
      await PageObjects.common.navigateToApp('canvas', {
        basePath: '/s/custom_space',
        hash: '/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31-conflict-old/page/1',
      });

      await testSubjects.click('legacy-url-conflict-go-to-other-button');

      const currentUrl = await browser.getCurrentUrl();
      expect(
        currentUrl.includes('/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31-conflict-new')
      ).to.be(true);

      // Conflict workpad has no elements, so let's make sure the new one is rendered with it's elements
      await retry.try(async () => {
        const elements = await testSubjects.findAll(
          'canvasWorkpadPage > canvasWorkpadPageElementContent'
        );
        expect(elements).to.have.length(4);
      });
    });
  });
}
