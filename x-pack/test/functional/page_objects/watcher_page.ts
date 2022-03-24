/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrService } from '../ftr_provider_context';

export class WatcherPageObject extends FtrService {
  private readonly header = this.ctx.getPageObject('header');
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  async clearAllWatches() {
    const checkBoxExists = await this.testSubjects.exists('checkboxSelectAll');
    if (checkBoxExists) {
      await this.testSubjects.click('checkboxSelectAll');
      await this.testSubjects.click('btnDeleteWatches');
      await this.testSubjects.click('confirmModalConfirmButton');
      await this.header.waitUntilLoadingHasFinished();
    }
  }

  async createWatch(watchName: string, name: string) {
    await this.testSubjects.click('createWatchButton');
    await this.testSubjects.click('jsonWatchCreateLink');
    await this.find.setValue('#id', watchName);
    await this.find.setValue('#watchName', name);
    await this.find.clickByCssSelector('[type="submit"]');
    await this.header.waitUntilLoadingHasFinished();
  }

  async getWatch(watchID: string) {
    const watchIdColumn = await this.testSubjects.find(`watchIdColumn-${watchID}`);
    const watchNameColumn = await this.testSubjects.find(`watchNameColumn-${watchID}`);
    const id = await watchIdColumn.getVisibleText();
    const name = await watchNameColumn.getVisibleText();
    return {
      id,
      name,
    };
  }

  async deleteWatch() {
    await this.testSubjects.click('checkboxSelectAll');
    await this.testSubjects.click('btnDeleteWatches');
  }

  // get all the watches in the list
  async getWatches() {
    const watches = await this.find.allByCssSelector('.euiTableRow');
    return await Promise.all(
      watches.map(async (watch) => {
        const checkBox = await watch.findByCssSelector('td:nth-child(1)');
        const id = await watch.findByCssSelector('td:nth-child(2)');
        const name = await watch.findByCssSelector('td:nth-child(3)');

        return {
          checkBox: (await checkBox.getAttribute('innerHTML')).includes('input'),
          id: await id.getVisibleText(),
          name: (await name.getVisibleText()).split(',').map((role) => role.trim()),
        };
      })
    );
  }
}
