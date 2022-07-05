/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function enterSpaceFunctonalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  // const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['security', 'spaceSelector']);
  const spacesService = getService('spaces');
  const id = 'another-space';
  const settings = {
    buildNum: 8467,
    'dateFormat:tz': 'UTC',
  };

  describe('Enter Space', function () {
    this.tags('includeFirefox');
    before(
      'update ui settings for default space, add new space, update ui settings for new space, load kbn archive',
      async () => {
        // await esArchiver.load('x-pack/test/functional/es_archives/spaces/enter_space');
        await kibanaServer.uiSettings.replace({
          // defaultRoute: '/app/evil',
          defaultRoute: '/app/doesnotexist',
          ...settings,
        });

        await spacesService.create({
          id,
          name: 'Another Space',
          disabledFeatures: [],
        });
        await kibanaServer.uiSettings.replace(
          {
            defaultRoute: '/app/canvas',
            ...settings,
          },
          { space: id }
        );
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/spaces/enter_space',
          { space: id }
        );

        await PageObjects.security.forceLogout();
      }
    );
    after(async () => {
      // await esArchiver.unload('x-pack/test/functional/es_archives/spaces/enter_space')
      await spacesService.delete(id);
    });

    afterEach(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
    });

    it('falls back to the default home page when the configured default route is malformed', async () => {
      const spaceId = 'default';

      await PageObjects.security.login(undefined, undefined, {
        expectSpaceSelector: true,
      });

      await PageObjects.spaceSelector.clickSpaceCard(spaceId);

      await PageObjects.spaceSelector.expectHomePage(spaceId);
    });

    it('allows user to navigate to different spaces, respecting the configured default route', async () => {
      const spaceId = 'another-space';

      await PageObjects.security.login(undefined, undefined, {
        expectSpaceSelector: true,
      });

      await PageObjects.spaceSelector.clickSpaceCard(spaceId);
      await PageObjects.spaceSelector.expectRoute(spaceId, '/app/canvas');
      await PageObjects.spaceSelector.openSpacesNav();

      // change spaces
      const newSpaceId = 'default';
      await PageObjects.spaceSelector.clickSpaceAvatar(newSpaceId);
      await PageObjects.spaceSelector.expectHomePage(newSpaceId);
    });
  });
}
