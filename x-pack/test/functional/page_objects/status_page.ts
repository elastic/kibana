/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../ftr_provider_context';

export class StatusPageObject extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly find = this.ctx.getService('find');

  async initTests() {
    this.log.debug('StatusPage:initTests');
  }

  async expectStatusPage(): Promise<void> {
    await this.find.byCssSelector('[data-test-subj="statusPageRoot"]', 20000);
  }
}
