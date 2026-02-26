/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { ArtifactsPage } from './artifacts_page';

export class BlocklistPage extends ArtifactsPage {
  constructor(page: ScoutPage) {
    super(page, 'blocklistPage');
  }

  async navigateToList(searchParams?: string) {
    const url = searchParams
      ? `/app/security/administration/blocklist?${searchParams}`
      : '/app/security/administration/blocklist';
    await this.page.goto(url);
    await this.page.waitForLoadingIndicatorHidden();
  }
}
