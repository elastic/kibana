/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const { maps, common } = getPageObjects(['maps', 'common']);
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  describe('maps full screen mode', () => {
    before(async () => {
      await security.testUser.setRoles(['global_maps_all']);
      await maps.openNewMap();
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('full screen button should exist', async () => {
      const exists = await maps.fullScreenModeMenuItemExists();
      expect(exists).to.be(true);
    });

    it('hides the chrome', async () => {
      const isChromeVisible = await common.isChromeVisible();
      expect(isChromeVisible).to.be(true);

      await maps.clickFullScreenMode();

      await retry.try(async () => {
        const isChromeHidden = await common.isChromeHidden();
        expect(isChromeHidden).to.be(true);
      });
    });

    it('layer control is visible', async () => {
      expect(await testSubjects.isDisplayed('addLayerButton')).to.be(true);
    });

    it('displays exit full screen logo button', async () => {
      const exists = await maps.exitFullScreenLogoButtonExists();
      expect(exists).to.be(true);
    });

    it('exits when the text button is clicked on', async () => {
      const logoButton = await maps.getExitFullScreenLogoButton();
      await logoButton.moveMouseTo();
      await maps.clickExitFullScreenTextButton();

      await retry.try(async () => {
        const isChromeVisible = await common.isChromeVisible();
        expect(isChromeVisible).to.be(true);
      });
    });
  });
}
