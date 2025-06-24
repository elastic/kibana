/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'security', 'savedObjects', 'tagManagement']);
  const tagManagementPage = PageObjects.tagManagement;

  describe('bulk assign', () => {
    let assignFlyout: (typeof tagManagementPage)['assignFlyout'];

    beforeEach(async () => {
      assignFlyout = tagManagementPage.assignFlyout;
      await kibanaServer.importExport.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/bulk_assign/data.json'
      );
      await tagManagementPage.navigateTo();
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/bulk_assign/data.json'
      );
    });

    it('can bulk assign tags to objects', async () => {
      await assignFlyout.open(['tag-3', 'tag-4']);

      await assignFlyout.clickOnResult('visualization', 'ref-to-tag-1');
      await assignFlyout.clickOnResult('visualization', 'ref-to-tag-1-and-tag-2');

      await assignFlyout.clickConfirm();

      const tag3 = await tagManagementPage.getDisplayedTagInfo('tag-3');
      const tag4 = await tagManagementPage.getDisplayedTagInfo('tag-4');

      expect(tag3?.connectionCount).to.eql(3);
      expect(tag4?.connectionCount).to.eql(2);
    });

    it('can bulk unassign tags to objects', async () => {
      await assignFlyout.open(['tag-1', 'tag-2']);

      await assignFlyout.clickOnResult('visualization', 'ref-to-tag-1');
      await assignFlyout.clickOnResult('visualization', 'ref-to-tag-1');
      await assignFlyout.clickOnResult('visualization', 'ref-to-tag-1-and-tag-2');

      await assignFlyout.clickConfirm();

      const tag1 = await tagManagementPage.getDisplayedTagInfo('tag-1');
      const tag2 = await tagManagementPage.getDisplayedTagInfo('tag-2');

      expect(tag1?.connectionCount).to.eql(1);
      expect(tag2?.connectionCount).to.eql(1);
    });
  });
}
