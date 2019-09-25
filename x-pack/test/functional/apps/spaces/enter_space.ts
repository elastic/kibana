/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function enterSpaceFunctonalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['security', 'spaceSelector']);

  describe('Enter Space', function() {
    this.tags('smoke');
    before(async () => await esArchiver.load('spaces/enter_space'));
    after(async () => await esArchiver.unload('spaces/enter_space'));

    afterEach(async () => {
      await PageObjects.security.logout();
    });

    it('allows user to navigate to different spaces, respecting the configured default route', async () => {
      const spaceId = 'another-space';

      await PageObjects.security.login(null, null, {
        expectSpaceSelector: true,
      });

      await PageObjects.spaceSelector.clickSpaceCard(spaceId);

      await PageObjects.spaceSelector.expectRoute(spaceId, '/app/kibana/#/dashboard');

      await PageObjects.spaceSelector.openSpacesNav();

      // change spaces

      await PageObjects.spaceSelector.clickSpaceAvatar('default');

      await PageObjects.spaceSelector.expectRoute('default', '/app/canvas');
    });
  });
}
