/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../ftr_provider_context';

export class BannersPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');

  isTopBannerVisible() {
    return this.find.existsByCssSelector(
      '.header__topBanner [data-test-subj="bannerInnerWrapper"]'
    );
  }

  async getTopBannerText() {
    if (!(await this.isTopBannerVisible())) {
      return '';
    }
    const bannerContainer = await this.find.byCssSelector(
      '.header__topBanner [data-test-subj="bannerInnerWrapper"]'
    );
    return bannerContainer.getVisibleText();
  }
}
