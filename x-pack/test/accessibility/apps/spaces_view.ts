/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const a11y = getService('a11y'); 
  const PageObjects = getPageObjects(['common',
    'dashboard',
    'header',
    'home',
    'security',
    'spaceSelector',]);

  describe('Spaces', () => {
    describe('Spaces view', () => {
      before(async () => await esArchiver.load('spaces/selector'));
      after(async () => await esArchiver.unload('spaces/selector'));

      afterEach(async () => {
        await PageObjects.security.logout();
      });

      after(async () => {
        await esArchiver.unload('empty_kibana');
      });

      afterEach(async () => {
        await PageObjects.security.logout();
      });

      it('Spaces page meets a11y requirements', async () => {
        await PageObjects.security.login(null, null, {
          expectSpaceSelector: true,
        });
        await PageObjects.spaceSelector.clickSpaceAvatar('default');
        await a11y.testAppSnapshot();
      });
    });
  });
}
