/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { privilegeMonitoringRouteHelpersFactoryNoAuth } from '../../utils/privilege_monitoring';
import { usersAndRolesFactory } from '../../utils/users_and_roles';

const USER_PASSWORD = 'changeme';
const BASIC_SECURITY_SOLUTION_PRIVILEGES = [
  {
    feature: {
      [SECURITY_FEATURE_ID]: ['read'],
    },
    spaces: ['default'],
  },
];
const READ_ALL_INDICES_ROLE = {
  name: 'all',
  privileges: {
    kibana: BASIC_SECURITY_SOLUTION_PRIVILEGES,
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
  },
};

const READ_PRIV_MON_INDICES_ROLE = {
  name: 'priv_mon_read',
  privileges: {
    kibana: BASIC_SECURITY_SOLUTION_PRIVILEGES,
    elasticsearch: {
      indices: [
        {
          names: ['.entity_analytics.monitoring*'],
          privileges: ['read'],
        },
      ],
    },
  },
};

const READ_NO_INDEX_ROLE = {
  name: 'no_index',
  privileges: {
    kibana: BASIC_SECURITY_SOLUTION_PRIVILEGES,
    elasticsearch: {
      indices: [],
    },
  },
};

const ROLES = [READ_ALL_INDICES_ROLE, READ_PRIV_MON_INDICES_ROLE, READ_NO_INDEX_ROLE];

export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const privMonRoutesNoAuth = privilegeMonitoringRouteHelpersFactoryNoAuth(supertestWithoutAuth);
  const userHelper = usersAndRolesFactory(getService('security'));

  async function createPrivilegeTestUsers() {
    const rolePromises = ROLES.map((role) => userHelper.createRole(role));

    await Promise.all(rolePromises);
    const userPromises = ROLES.map((role) =>
      userHelper.createUser({ username: role.name, roles: [role.name], password: USER_PASSWORD })
    );

    return Promise.all(userPromises);
  }

  async function deletePrivilegeTestUsers() {
    const userPromises = ROLES.map((role) => userHelper.deleteUser(role.name));
    const rolePromises = ROLES.map((role) => userHelper.deleteRole(role.name));
    await Promise.all([...userPromises, ...rolePromises]);
  }

  const getPrivilegesForUsername = async (username: string) =>
    privMonRoutesNoAuth.privilegesForUser({
      username,
      password: USER_PASSWORD,
    });

  describe('@ess @skipInServerlessMKI Entity Privilege Monitoring APIs', () => {
    describe('privileges checks', () => {
      before(async () => {
        await createPrivilegeTestUsers();
      });

      after(async () => {
        await deletePrivilegeTestUsers();
      });

      it('should return has_all_required true for user with all priv_mon privileges', async () => {
        const { body } = await getPrivilegesForUsername(READ_ALL_INDICES_ROLE.name);
        expect(body.has_all_required).to.eql(true);
        expect(body.privileges).to.eql({
          elasticsearch: {
            index: {
              '.alerts-security.alerts-default': {
                read: true,
              },
              '.entity_analytics.monitoring.users-default': {
                read: true,
              },
              '.ml-anomalies-shared': {
                read: true,
              },
              'risk-score.risk-score-*': {
                read: true,
              },
            },
          },
          kibana: {},
        });
      });

      it('should return has_all_required false for user with no privileges', async () => {
        const { body } = await getPrivilegesForUsername(READ_NO_INDEX_ROLE.name);
        expect(body.has_all_required).to.eql(false);
        expect(body.privileges).to.eql({
          elasticsearch: {
            index: {
              '.alerts-security.alerts-default': {
                read: false,
              },
              '.entity_analytics.monitoring.users-default': {
                read: false,
              },
              '.ml-anomalies-shared': {
                read: false,
              },
              'risk-score.risk-score-*': {
                read: false,
              },
            },
          },
          kibana: {},
        });
      });

      it('should return has_all_required false for user with partial index privileges', async () => {
        const { body } = await getPrivilegesForUsername(READ_PRIV_MON_INDICES_ROLE.name);
        expect(body.has_all_required).to.eql(false);
        expect(body.privileges).to.eql({
          elasticsearch: {
            index: {
              '.alerts-security.alerts-default': {
                read: false,
              },
              '.entity_analytics.monitoring.users-default': {
                read: true,
              },
              '.ml-anomalies-shared': {
                read: false,
              },
              'risk-score.risk-score-*': {
                read: false,
              },
            },
          },
          kibana: {},
        });
      });
    });
  });
};
