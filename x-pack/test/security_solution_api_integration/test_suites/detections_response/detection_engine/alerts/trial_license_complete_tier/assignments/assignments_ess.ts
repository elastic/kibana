/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_ALERT_ASSIGNEES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';

import {
  createUserAndRole,
  deleteUserAndRole,
} from '../../../../../../../common/services/security_solution';
import { setAlertAssignees } from '../../../../utils';
import {
  createAlertsIndex,
  createRule,
  deleteAllAlerts,
  deleteAllRules,
  getAlertsByIds,
  getRuleForAlertTesting,
  waitForAlertsToBePresent,
  waitForRuleSuccess,
} from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess Alert User Assignment - ESS', () => {
    before(async () => {
      await esArchiver.load(path);
    });

    after(async () => {
      await esArchiver.unload(path);
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await createAlertsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
    });

    describe('authorization / RBAC', () => {
      it('should not allow viewer user to assign alerts', async () => {
        const rule = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 10, [id]);
        const alerts = await getAlertsByIds(supertest, log, [id]);
        const alertIds = alerts.hits.hits.map((alert) => alert._id);

        const userAndRole = ROLES.reader;
        await createUserAndRole(getService, userAndRole);

        // Try to set all of the alerts to the state of closed.
        // This should not be possible with the given user.
        await supertestWithoutAuth
          .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
          .set('kbn-xsrf', 'true')
          .auth(userAndRole, 'changeme') // each user has the same password
          .send(
            setAlertAssignees({
              assigneesToAdd: ['user-1'],
              assigneesToRemove: [],
              ids: alertIds,
            })
          )
          .expect(403);

        await deleteUserAndRole(getService, userAndRole);
      });
    });
  });
};
