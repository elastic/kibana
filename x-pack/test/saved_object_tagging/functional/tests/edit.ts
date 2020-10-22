/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'security', 'savedObjects', 'tagManagement']);

  const tagManagementPage = PageObjects.tagManagement;

  describe('edit tag', () => {
    let tagModal: typeof tagManagementPage['tagModal'];

    before(async () => {
      tagModal = tagManagementPage.tagModal;
      await esArchiver.load('functional_base');
      await tagManagementPage.navigateTo();
    });
    after(async () => {
      await esArchiver.unload('functional_base');
    });

    afterEach(async () => {
      await tagModal.closeIfOpened();
    });

    it('displays the tag attributes in the edition form', async () => {
      await tagModal.openEdit('tag-1');

      const formValues = await tagModal.getFormValues();
      expect(formValues).to.eql({
        name: 'tag-1',
        description: 'My first tag!',
        color: '#FF00FF',
      });
    });

    it('allow to edit the tag', async () => {
      await tagModal.openEdit('tag-1');

      await tagModal.fillForm(
        {
          name: 'tag-1-edited',
          description: 'This was edited',
          color: '#FFCC00',
        },
        { submit: true }
      );
      await tagModal.waitUntilClosed();
      await tagManagementPage.waitUntilTableIsLoaded();

      const tags = await tagManagementPage.getDisplayedTagsInfo();
      expect(tags.length).to.be(5);

      const oldTag = tags.find((tag) => tag.name === 'tag-1');
      const newTag = tags.find((tag) => tag.name === 'tag-1-edited');

      expect(oldTag).to.be(undefined);

      expect(newTag).not.to.be(undefined);
      expect(newTag!.description).to.eql('This was edited');
    });

    it('show errors when the validation fails', async () => {
      await tagModal.openEdit('tag-2');
      await tagModal.fillForm(
        {
          name: 'invalid&$%name',
        },
        { submit: true }
      );

      expect(await tagModal.isOpened()).to.be(true);
      expect(await tagModal.hasError()).to.be(true);

      const errors = await tagModal.getValidationErrors();
      expect(errors.name).not.to.be(undefined);
      expect(errors.color).to.be(undefined);
    });

    it('allows to edit the tag once the errors are fixed', async () => {
      await tagModal.openEdit('tag-2');
      await tagModal.fillForm(
        {
          name: 'invalid&$%name',
          description: 'edited description',
          color: '#FF00CC',
        },
        { submit: true }
      );

      expect(await tagModal.isOpened()).to.be(true);
      expect(await tagModal.hasError()).to.be(true);

      await tagModal.fillForm(
        {
          name: 'edited name',
        },
        { submit: true }
      );

      await tagModal.waitUntilClosed();
      await tagManagementPage.waitUntilTableIsLoaded();

      const tags = await tagManagementPage.getDisplayedTagsInfo();
      const oldTag = tags.find((tag) => tag.name === 'tag-2');
      const newTag = tags.find((tag) => tag.name === 'edited name');

      expect(oldTag).to.be(undefined);
      expect(newTag).not.to.be(undefined);
    });

    it('allow to close the modal without updating the tag', async () => {
      await tagModal.openEdit('tag-3');
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
      const uneditedTag = tags.find((tag) => tag.name === 'tag-3');
      const newTag = tags.find((tag) => tag.name === 'canceled-tag');

      expect(tags.length).to.be(5);
      expect(uneditedTag).not.to.be(undefined);
      expect(newTag).to.be(undefined);
    });
  });
}
