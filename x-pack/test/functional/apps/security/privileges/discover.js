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
  const PageObjects = getPageObjects(['discover', 'security']);
  const testSubjects = getService('testSubjects');

  describe('discover', () => {
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
    });

    after(async () => {
      await security.role.delete('global_discover_all_role');
      await security.user.delete('global_discover_all_user');
    });

    it('shows discover navlink', async () => {
      await PageObjects.security.login('global_discover_all_user', 'password');
      const appLinks = await testSubjects.findAll('appLink');
      const linksText = await Promise.all(appLinks.map(appLink => appLink.getVisibleText()));
      expect(linksText).to.eql([
        'Discover',
        'Management',
        ...getAlwaysPresentNavLinks('global discover all user')
      ]);
    });
  });
}
