/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';

const getAlwaysPresentNavLinks = (usersFullName) => {
  return [
    usersFullName,
    'Logout',
    'Collapse',
  ];
};

export default function ({ getPageObjects, getService }) {
  const security = getService('security');
  const spaces = getService('spaces');
  const PageObjects = getPageObjects(['discover', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');

  const expectAppNavLinks = async (appNavLinkTexts) => {
    const appLinks = await testSubjects.findAll('appLink');
    const linksText = await Promise.all(appLinks.map(appLink => appLink.getVisibleText()));
    expect(linksText).to.eql([
      ...appNavLinkTexts,
      ...getAlwaysPresentNavLinks('global discover all user')
    ]);
  };

  describe('discover', () => {
    describe('global discover all privileges', () => {
      before(async () => {
        await security.role.create('global_discover_all_role', {
          kibana: {
            global: {
              feature: {
                discover: ['all']
              },
            }
          }
        });

        await security.user.create('global_discover_all_user', {
          password: 'password',
          roles: ['global_discover_all_role'],
          full_name: 'global discover all user',
        });

        await spaces.create({
          id: 'space_1',
          name: 'space_1',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await security.role.delete('global_discover_all_role');
        await security.user.delete('global_discover_all_user');
        await spaces.delete('space_1');
      });

      it('shows discover navlink in both spaces', async () => {
        await PageObjects.security.login('global_discover_all_user', 'password', {
          expectSpaceSelector: true,
        });
        await PageObjects.spaceSelector.clickSpaceCard('default');
        await PageObjects.spaceSelector.expectHomePage('default');
        await expectAppNavLinks([
          'Discover',
          'Management',
        ]);

        await PageObjects.spaceSelector.openSpacesNav();
        await PageObjects.spaceSelector.clickSpaceAvatar('space_1');
        await PageObjects.spaceSelector.expectHomePage('space_1');
        await expectAppNavLinks([
          'Discover',
          'Management',
        ]);
      });
    });
  });
}
