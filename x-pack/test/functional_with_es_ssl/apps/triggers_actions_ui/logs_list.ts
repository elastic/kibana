/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { Role, User } from '../../../cases_api_integration/common/lib/authentication/types';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../cases_api_integration/common/lib/authentication';

const SPACE2 = {
  id: 'space-2',
  name: 'Space 2',
  disabledFeatures: [],
};
const ONLY_S2_ROLE: Role = {
  name: 'only_s2',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        base: ['all'],
        feature: {},
        spaces: [SPACE2.id],
      },
    ],
  },
};

const ONLY_S2_USER: User = {
  username: 'only_s2_user',
  password: 'changeme',
  roles: [ONLY_S2_ROLE.name],
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header', 'security']);
  const spaces = getService('spaces');

  async function refreshLogsList() {
    await pageObjects.common.navigateToApp('triggersActions');
    await testSubjects.click('logsTab');
  }

  describe('logs list', function () {
    before(async () => {
      await createUsersAndRoles(getService, [ONLY_S2_USER], [ONLY_S2_ROLE]);
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('logsTab');
    });

    after(async () => {
      await deleteUsersAndRoles(getService, [ONLY_S2_USER], [ONLY_S2_ROLE]);
      await spaces.delete(SPACE2.id);
      await pageObjects.security.forceLogout();
    });

    it('should not show the logs space switch when only one space exists', async () => {
      const spacesSwitchExists = await testSubjects.exists('showAllSpacesSwitch');
      expect(spacesSwitchExists).to.be(false);
    });

    it('should show the logs space switch when multiple spaces are accessible', async () => {
      await spaces.create(SPACE2);

      await refreshLogsList();
      const spacesSwitch = await testSubjects.find('showAllSpacesSwitch');
      expect(spacesSwitch).not.to.be(undefined);
      const switchControl = await spacesSwitch.findByCssSelector('button');
      expect(await switchControl.getAttribute('aria-checked')).to.be('false');
      await switchControl.click();
      expect(await switchControl.getAttribute('aria-checked')).to.be('true');
    });

    it('should not show the logs space switch when multiple spaces exist but only one is accessible', async () => {
      await pageObjects.security.forceLogout();
      await pageObjects.security.login(ONLY_S2_USER.username, ONLY_S2_USER.password);

      await pageObjects.common.navigateToApp('triggersActions', { basePath: `/s/${SPACE2.id}` });
      await testSubjects.click('logsTab');

      const spacesSwitchExists = await testSubjects.exists('showAllSpacesSwitch');
      expect(spacesSwitchExists).to.be(false);
    });
  });
};
