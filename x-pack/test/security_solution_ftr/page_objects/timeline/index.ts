/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../../../functional/ftr_provider_context';

export class TimelinePageObject extends FtrService {
  private readonly pageObjects = this.ctx.getPageObjects(['common', 'header']);

  async navigateToTimelines(): Promise<void> {
    await this.pageObjects.common.navigateToUrlWithBrowserHistory('securitySolutionTimeline');

    await this.pageObjects.header.waitUntilLoadingHasFinished();
  }
}
