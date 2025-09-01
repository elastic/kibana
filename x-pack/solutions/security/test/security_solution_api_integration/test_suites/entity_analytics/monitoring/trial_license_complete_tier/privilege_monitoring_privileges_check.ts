/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { privilegeMonitoringRouteHelpersFactoryNoAuth } from '../../utils/privilege_monitoring';
import {
  PrivMonRolesUtils,
  READ_ALL_INDICES_ROLE,
  READ_NO_INDEX_ROLE,
  READ_NO_INDEX_ROLE_NO_PRIVILEGES_ROLE,
  READ_PRIV_MON_INDICES_ROLE,
  USER_PASSWORD,
} from './utils/role_utils';
import { PrivMonUtils } from './privileged_users/utils';

export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const privMonRoutesNoAuth = privilegeMonitoringRouteHelpersFactoryNoAuth(supertestWithoutAuth);
  const privMonRolesUtils = PrivMonRolesUtils(getService);
  const privMonUtils = PrivMonUtils(getService);

  const getPrivilegesForUsername = async (username: string) =>
    privMonRoutesNoAuth.privilegesForUser({
      username,
      password: USER_PASSWORD,
    });

  describe('@ess @skipInServerlessMKI Entity Privilege Monitoring APIs', () => {
    describe('privileges checks', () => {
      before(async () => {
        await privMonRolesUtils.createPrivilegeTestUsers();
      });

      after(async () => {
        await privMonRolesUtils.deletePrivilegeTestUsers();
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

    describe('privilege init engine access', () => {
      before(async () => {
        await privMonRolesUtils.createPrivilegeTestUsers();
      });

      after(async () => {
        await privMonRolesUtils.deletePrivilegeTestUsers();
      });
      it('should allow init for user with full privileges', async () => {
        const res = await privMonUtils.initPrivMonEngineWithoutAuth({
          username: READ_ALL_INDICES_ROLE.name,
          password: USER_PASSWORD,
        });
        expect(res.status).to.eql(200);
      });
      it('should return forbidden for user without correct kibana privileges ', async () => {
        const res = await privMonUtils.initPrivMonEngineWithoutAuth({
          username: READ_NO_INDEX_ROLE_NO_PRIVILEGES_ROLE.name,
          password: USER_PASSWORD,
        });
        expect(res.status).to.eql(403); // forbidden, should not access SO resources
      });
    });
  });
};
