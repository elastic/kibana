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

  describe('create tag', () => {
    let tagModal: typeof tagManagementPage['tagModal'];

    before(async () => {
      tagModal = tagManagementPage.tagModal;
      await kibanaServer.importExport.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json'
      );
      await tagManagementPage.navigateTo();
    });
    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json'
      );
      await kibanaServer.savedObjects.clean({ types: ['tag'] });
    });

    afterEach(async () => {
      await tagModal.closeIfOpened();
    });

    it('creates a valid tag', async () => {
      await tagModal.openCreate();
      await tagModal.fillForm(
        {
          name: 'my-new-tag',
          description: 'I just added this tag',
          color: '#FF00CC',
        },
        { submit: true }
      );
      await tagModal.waitUntilClosed();
      await tagManagementPage.waitUntilTableIsLoaded();

      const tags = await tagManagementPage.getDisplayedTagsInfo();
      const newTag = tags.find((tag) => tag.name === 'my-new-tag');

      expect(newTag).not.to.be(undefined);
      expect(newTag!.description).to.eql('I just added this tag');
    });

    it('show errors when the validation fails', async () => {
      await tagModal.openCreate();
      await tagModal.fillForm(
        {
          name: 'a',
          description: 'The name will fails validation',
          color: '#FF00CC',
        },
        { submit: true }
      );

      expect(await tagModal.isOpened()).to.be(true);
      expect(await tagModal.hasError()).to.be(true);

      const errors = await tagModal.getValidationErrors();
      expect(errors.name).not.to.be(undefined);
      expect(errors.color).to.be(undefined);
    });

    it('allows to create the tag once the errors are fixed', async () => {
      await tagModal.openCreate();
      await tagModal.fillForm(
        {
          name: 'a',
          description: 'The name will fails validation',
          color: '#FF00CC',
        },
        { submit: true }
      );

      expect(await tagModal.isOpened()).to.be(true);
      expect(await tagModal.hasError()).to.be(true);

      await tagModal.fillForm(
        {
          name: 'valid name',
        },
        { submit: true }
      );

      await tagModal.waitUntilClosed();
      await tagManagementPage.waitUntilTableIsLoaded();

      const tags = await tagManagementPage.getDisplayedTagsInfo();
      const newTag = tags.find((tag) => tag.name === 'valid name');

      expect(newTag).not.to.be(undefined);
    });

    it('allow to close the modal without creating the tag', async () => {
      await tagModal.openCreate();
      await tagModal.fillForm(
        {
          name: 'canceled-tag',
          description: 'I will not add this tag',
          color: '#FF00CC',
        },
        { submit: false }
      );
      await tagModal.clickCancel();
      await tagModal.waitUntilClosed();

      const tags = await tagManagementPage.getDisplayedTagsInfo();
      const newTag = tags.find((tag) => tag.name === 'canceled-tag');

      expect(newTag).to.be(undefined);
    });
  });
}
