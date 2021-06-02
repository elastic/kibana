/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function BannersPageProvider({ getService }: FtrProviderContext) {
  const find = getService('find');

  class BannersPage {
    isTopBannerVisible() {
      return find.existsByCssSelector('.header__topBanner .kbnUserBanner__container');
    }

    async getTopBannerText() {
      if (!(await this.isTopBannerVisible())) {
        return '';
      }
      const bannerContainer = await find.byCssSelector(
        '.header__topBanner .kbnUserBanner__container'
      );
      return bannerContainer.getVisibleText();
    }
  }

  return new BannersPage();
}
