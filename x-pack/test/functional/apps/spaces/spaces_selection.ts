/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// tslint:disable:no-default-export
export default function spaceSelectorFunctonalTests({
  getService,
  getPageObjects,
}: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['security', 'spaceSelector', 'home']);

  describe('Spaces', () => {
    describe('Space Selector', () => {
      before(async () => await esArchiver.load('spaces/selector'));
      after(async () => await esArchiver.unload('spaces/selector'));

      afterEach(async () => {
        await PageObjects.security.logout();
      });

      it('allows user to navigate to different spaces', async () => {
        const spaceId = 'another-space';

        await PageObjects.security.login(null, null, {
          expectSpaceSelector: true,
        });

        await PageObjects.spaceSelector.clickSpaceCard(spaceId);

        await PageObjects.spaceSelector.expectHomePage(spaceId);

        await PageObjects.spaceSelector.openSpacesNav();

        // change spaces

        await PageObjects.spaceSelector.clickSpaceAvatar('default');

        await PageObjects.spaceSelector.expectHomePage('default');
      });
    });
  });
}
