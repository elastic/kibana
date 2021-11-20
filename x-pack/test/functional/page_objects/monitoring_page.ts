/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../ftr_provider_context';

export class MonitoringPageObject extends FtrService {
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  async getAccessDeniedMessage() {
    return this.testSubjects.getVisibleText('accessDeniedTitle');
  }

  async closeAlertsModal() {
    return this.testSubjects.click('alerts-modal-remind-later-button');
  }

  async clickBreadcrumb(subj: string) {
    return this.testSubjects.click(subj);
  }

  async assertTableNoData(subj: string) {
    if (!(await this.testSubjects.exists(subj))) {
      throw new Error('Expected to find the no data message');
    }
  }

  async tableGetRows(subj: string) {
    const table = await this.testSubjects.find(subj);
    return table.findAllByTagName('tr');
  }

  async tableGetRowsFromContainer(subj: string) {
    const table = await this.testSubjects.find(subj);
    const tbody = await table.findByTagName('tbody');
    return tbody.findAllByTagName('tr');
  }

  async tableSetFilter(subj: string, text: string) {
    await this.testSubjects.setValue(subj, text);
    await this.common.pressEnterKey();
    await this.header.waitUntilLoadingHasFinished();
  }

  async tableClearFilter(subj: string) {
    return await this.testSubjects.setValue(subj, ' \uE003'); // space and backspace to trigger onChange event
  }
}
