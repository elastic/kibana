/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../ftr_provider_context';

export class LogstashPageObject extends FtrService {
  private readonly common = this.ctx.getPageObject('common');
  private readonly pipelineList = this.ctx.getService('pipelineList');
  private readonly pipelineEditor = this.ctx.getService('pipelineEditor');

  async gotoPipelineList() {
    await this.common.navigateToApp('logstashPipelines');
    await this.pipelineList.assertExists();
  }

  async gotoNewPipelineEditor() {
    await this.gotoPipelineList();
    await this.pipelineList.clickAdd();
    await this.pipelineEditor.assertExists();
  }
}
