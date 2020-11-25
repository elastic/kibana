/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import { USERS, User } from '../../common/lib';

interface PrivilegeMap {
  view: boolean;
  delete: boolean;
  create: boolean;
  edit: boolean;
  viewRelations: boolean;
}

interface FeatureControlUserSuite {
  user: User;
  description: string;
  privileges: PrivilegeMap;
}

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

  const addFeatureControlSuite = ({ user, description, privileges }: FeatureControlUserSuite) => {
    const testPrefix = (allowed: boolean) => (allowed ? `can` : `can't`);

    describe(description, () => {
      before(async () => {
        await loginAs(user);
        await tagManagementPage.navigateTo();
      });

      after(async () => {
        await PageObjects.security.forceLogout();
      });

      it(`${testPrefix(privileges.view)} see all tags`, async () => {
        const tagNames = await tagManagementPage.getDisplayedTagNames();
        expect(tagNames.length).to.be(privileges.view ? 5 : 0);
      });

      it(`${testPrefix(privileges.delete)} delete tag`, async () => {
        expect(await tagManagementPage.isDeleteButtonVisible()).to.be(privileges.delete);
      });

      it(`${testPrefix(privileges.create)} create tag`, async () => {
        expect(await tagManagementPage.isCreateButtonVisible()).to.be(privileges.create);
      });

      it(`${testPrefix(privileges.edit)} edit tag`, async () => {
        expect(await tagManagementPage.isEditButtonVisible()).to.be(privileges.edit);
      });

      it(`${testPrefix(privileges.viewRelations)} see relations to other objects`, async () => {
        expect(await tagManagementPage.isConnectionLinkDisplayed('tag-1')).to.be(
          privileges.viewRelations
        );
      });
    });
  };

  describe('feature controls', () => {
    before(async () => {
      await esArchiver.load('functional_base');
    });
    after(async () => {
      await esArchiver.unload('functional_base');
    });

    addFeatureControlSuite({
      user: USERS.DEFAULT_SPACE_SO_TAGGING_READ_USER,
      description: 'tag management read privileges',
      privileges: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        viewRelations: false,
      },
    });

    addFeatureControlSuite({
      user: USERS.DEFAULT_SPACE_SO_TAGGING_WRITE_USER,
      description: 'tag management write privileges',
      privileges: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        viewRelations: false,
      },
    });

    addFeatureControlSuite({
      user: USERS.DEFAULT_SPACE_SO_TAGGING_READ_SO_MANAGEMENT_READ_USER,
      description: 'tag management read and so management read privileges',
      privileges: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        viewRelations: true,
      },
    });

    addFeatureControlSuite({
      user: USERS.DEFAULT_SPACE_WRITE_USER,
      description: 'base write privileges',
      privileges: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        viewRelations: true,
      },
    });
  });
}
