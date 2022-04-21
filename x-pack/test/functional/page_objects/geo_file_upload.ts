/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { FtrService } from '../ftr_provider_context';

export class GeoFileUploadPageObject extends FtrService {
  private readonly header = this.ctx.getPageObject('header');
  private readonly log = this.ctx.getService('log');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');

  async isNextButtonEnabled(): Promise<boolean> {
    const importFileButton = await this.testSubjects.find('importFileButton');
    const isDisabled = await importFileButton.getAttribute('disabled');
    const isEnabled = !isDisabled;
    this.log.debug(`isNextButtonEnabled: ${isEnabled}`);
    return isEnabled;
  }

  async clickNextButton() {
    this.log.debug(`Clicking next button to advance to next step in wizard`);
    await this.testSubjects.click('importFileButton');
  }

  async selectFile(selector: string, path: string) {
    this.log.debug(`selectFile; selector: ${selector}, path: ${path}`);
    const input = await this.testSubjects.find(selector);
    await input.type(path);
  }

  async waitForFilePreview() {
    await this.retry.waitFor('Wait for file preview', async () => {
      return await this.isNextButtonEnabled();
    });
  }

  async previewGeoJsonFile(path: string) {
    await this.selectFile('geoFilePicker', path);

    await this.waitForFilePreview();

    await this.header.waitUntilLoadingHasFinished();
  }

  async previewShapefile(path: string) {
    await this.selectFile('geoFilePicker', path);
    await this.selectFile('shapefileSideCarFilePicker_dbf', path.replace('.shp', '.dbf'));
    await this.selectFile('shapefileSideCarFilePicker_prj', path.replace('.shp', '.prj'));
    await this.selectFile('shapefileSideCarFilePicker_shx', path.replace('.shp', '.shx'));

    await this.waitForFilePreview();

    await this.header.waitUntilLoadingHasFinished();
  }

  async setIndexName(indexName: string) {
    this.log.debug(`Set index name: ${indexName}`);
    await this.testSubjects.setValue('fileUploadIndexNameInput', indexName);
  }

  async uploadFile(): Promise<void> {
    // next button is disabled while checking index name
    // make sure next button is enabled before clicking it
    await this.retry.waitFor('Wait for import button to be enabled', async () => {
      return await this.isNextButtonEnabled();
    });
    await this.clickNextButton();

    await this.retry.waitFor('wait for file upload status', async () => {
      return await this.testSubjects.exists('fileUploadStatusCallout');
    });
  }

  async addFileAsDocumentLayer() {
    await this.clickNextButton();

    await this.header.waitUntilLoadingHasFinished();
  }

  async getFileUploadStatusCalloutMsg() {
    return await this.testSubjects.getVisibleText('fileUploadStatusCallout');
  }
}
