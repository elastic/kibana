/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripVersionQualifier } from '@kbn/std';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function enterSpaceFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['security', 'spaceSelector']);
  const spacesService = getService('spaces');
  const browser = getService('browser');

  describe('Enter Space', function () {
    this.tags('includeFirefox');
    before(async () => {
      await spacesService.create({
        id: 'another-space',
        name: 'Another Space',
        disabledFeatures: [],
      });
      await kibanaServer.uiSettings.replace(
        {
          defaultRoute: '/app/canvas',
          buildNum: 8467,
          'dateFormat:tz': 'UTC',
        },
        { space: 'another-space' }
      );
      const config = await kibanaServer.savedObjects.get({
        id: stripVersionQualifier(await kibanaServer.version.get()),
        type: 'config',
      });
      await kibanaServer.savedObjects.update({
        id: config.id,
        type: config.type,
        attributes: { defaultRoute: 'http://example.com/evil' },
      });
      await PageObjects.security.forceLogout();
    });
    after(async () => {
      await spacesService.delete('another-space');
      await kibanaServer.savedObjects.cleanStandardList();
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

    it('allows user to navigate to different space with provided next route', async () => {
      const spaceId = 'another-space';

      await PageObjects.security.login(undefined, undefined, {
        expectSpaceSelector: true,
      });

      const anchorElement = await PageObjects.spaceSelector.getSpaceCardAnchor(spaceId);
      const path = await anchorElement.getAttribute('href');

      const pathWithNextRoute = `${path}?next=/app/management/kibana/objects`;

      await browser.navigateTo(pathWithNextRoute);

      await PageObjects.spaceSelector.expectRoute(spaceId, '/app/management/kibana/objects');
    });

    it('allows user to navigate to different space with provided next route, route is normalized', async () => {
      const spaceId = 'another-space';

      await PageObjects.security.login(undefined, undefined, {
        expectSpaceSelector: true,
      });

      const anchorElement = await PageObjects.spaceSelector.getSpaceCardAnchor(spaceId);
      const path = await anchorElement.getAttribute('href');

      const pathWithNextRoute = `${path}?next=${encodeURIComponent(
        '/../../../app/management/kibana/objects'
      )}`;

      await browser.navigateTo(pathWithNextRoute);

      await PageObjects.spaceSelector.expectRoute(spaceId, '/app/management/kibana/objects');
    });

    it('falls back to the default home page if provided next route is malformed', async () => {
      const spaceId = 'another-space';

      await PageObjects.security.login(undefined, undefined, {
        expectSpaceSelector: true,
      });

      const anchorElement = await PageObjects.spaceSelector.getSpaceCardAnchor(spaceId);
      const path = await anchorElement.getAttribute('href');

      const pathWithNextRoute = `${path}?next=http://example.com/evil`;

      await browser.navigateTo(pathWithNextRoute);

      await PageObjects.spaceSelector.expectRoute(spaceId, '/app/canvas');
    });
  });
}
