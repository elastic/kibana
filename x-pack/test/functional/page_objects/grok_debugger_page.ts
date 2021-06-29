/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../ftr_provider_context';

export class GrokDebuggerPageObject extends FtrService {
  private readonly common = this.ctx.getPageObject('common');
  private readonly grokDebugger = this.ctx.getService('grokDebugger');

  async gotoGrokDebugger() {
    await this.common.navigateToApp('grokDebugger');
    await this.grokDebugger.assertExists();
  }
}
