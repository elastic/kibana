/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common']);
  const testSubjects = getService('testSubjects');

  describe('edit field', function () {
    before(async () => {
      const es = getService('es');
      await es.index({
        index: 'data-view-edit-field',
        id: '1',
        document: {
          extension: 'css',
        },
        refresh: true,
      });
    });

    after(async function () {
      // Delete the index after tests
      const es = getService('es');
      await es.indices.delete({
        index: 'data-view-edit-field',
        ignore_unavailable: true,
      });
    });

    describe('field preview', function fieldPreview() {
      before(async () => {
        // TODO: Navigation to Data View Management is different in Serverless
        await PageObjects.common.navigateToApp('management');
        await testSubjects.click('app-card-dataViews');
        await PageObjects.settings.createIndexPattern('data-view-edit-field', null);
      });
      after(async function () {
        // Delete the data view (index pattern) after the test
        await PageObjects.common.navigateToApp('management');
        await testSubjects.click('app-card-dataViews');
        await PageObjects.settings.clickIndexPatternByName('data-view-edit-field');
        await PageObjects.settings.removeIndexPattern();
      });

      it('should show preview for fields in _source', async function () {
        await PageObjects.settings.changeAndValidateFieldFormat({
          name: 'extension',
          fieldType: 'text',
          expectedPreviewText: 'css',
        });
      });

      it('should show preview for fields not in _source', async function () {
        await PageObjects.settings.changeAndValidateFieldFormat({
          name: 'extension.keyword',
          fieldType: 'keyword',
          expectedPreviewText: 'css',
        });
      });
    });
  });
}
