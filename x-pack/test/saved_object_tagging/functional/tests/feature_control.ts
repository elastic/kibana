/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import { USERS, User } from '../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'security', 'savedObjects', 'tagManagement']);
  const tagManagementPage = PageObjects.tagManagement;

  const loginAs = async (user: User) => {
    await PageObjects.security.forceLogout();
    await PageObjects.security.login(user.username, user.password, {
      expectSpaceSelector: false,
    });
  };

  describe('feature controls', () => {
    before(async () => {
      await esArchiver.load('functional_base');
    });
    after(async () => {
      await esArchiver.unload('functional_base');
    });

    describe('tag management read privileges', () => {
      before(async () => {
        await loginAs(USERS.DEFAULT_SPACE_SO_TAGGING_READ_USER);
        await tagManagementPage.navigateTo();
      });

      after(async () => {
        await PageObjects.security.forceLogout();
      });

      it(`can see all tags`, async () => {
        const tagNames = await tagManagementPage.getDisplayedTagNames();
        expect(tagNames.length).to.be(5);
      });

      it(`can't delete tag`, async () => {
        expect(await tagManagementPage.isDeleteButtonVisible()).to.be(false);
      });

      it(`can't create tag`, async () => {
        expect(await tagManagementPage.isCreateButtonVisible()).to.be(false);
      });

      it(`can't edit tag`, async () => {
        expect(await tagManagementPage.isEditButtonVisible()).to.be(false);
      });

      it(`can't see relations to other objects`, async () => {
        expect(await tagManagementPage.isConnectionLinkDisplayed('tag-1')).to.be(false);
      });
    });

    describe('tag management write privileges', () => {
      before(async () => {
        await loginAs(USERS.DEFAULT_SPACE_SO_TAGGING_WRITE_USER);
        await PageObjects.tagManagement.navigateTo();
      });

      after(async () => {
        await PageObjects.security.forceLogout();
      });

      it(`can see all tags`, async () => {
        const tagNames = await tagManagementPage.getDisplayedTagNames();
        expect(tagNames.length).to.be(5);
      });

      it(`can delete tag`, async () => {
        expect(await tagManagementPage.isDeleteButtonVisible()).to.be(true);
      });

      it(`can create tag`, async () => {
        expect(await tagManagementPage.isCreateButtonVisible()).to.be(true);
      });

      it(`can edit tag`, async () => {
        expect(await tagManagementPage.isEditButtonVisible()).to.be(true);
      });

      it(`can't see relations to other objects`, async () => {
        expect(await tagManagementPage.isConnectionLinkDisplayed('tag-1')).to.be(false);
      });
    });
  });
}
