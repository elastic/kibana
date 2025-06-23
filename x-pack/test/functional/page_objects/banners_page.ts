/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../ftr_provider_context';

export class BannersPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');

  isTopBannerVisible() {
    return this.testSubjects.exists('bannerInnerWrapper');
  }

  async getTopBannerText() {
    if (!(await this.isTopBannerVisible())) {
      return '';
    }

    const bannerContainer = await this.testSubjects.find('bannerInnerWrapper');

    return bannerContainer.getVisibleText();
  }
}
