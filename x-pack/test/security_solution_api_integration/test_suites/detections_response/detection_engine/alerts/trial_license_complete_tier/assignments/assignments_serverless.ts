/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_ALERT_ASSIGNEES_URL } from '@kbn/security-solution-plugin/common/constants';
import TestAgent from 'supertest/lib/agent';

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
  const esArchiver = getService('esArchiver');
  const utils = getService('securitySolutionUtils');
  const log = getService('log');
  const es = getService('es');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  let admin: TestAgent;
  let t1Analyst: TestAgent;
  let t2Analyst: TestAgent;
  let t3Analyst: TestAgent;
  let platformEngineer: TestAgent;
  let ruleAuthor: TestAgent;
  let socManager: TestAgent;
  let detectionsAdmin: TestAgent;

  describe('@serverless Alert User Assignment - Serverless', () => {
    before(async () => {
      await esArchiver.load(path);
      admin = await utils.createSuperTest('admin');
      t1Analyst = await utils.createSuperTest('t1_analyst');
      t2Analyst = await utils.createSuperTest('t2_analyst');
      t3Analyst = await utils.createSuperTest('t3_analyst');
      platformEngineer = await utils.createSuperTest('platform_engineer');
      ruleAuthor = await utils.createSuperTest('rule_author');
      socManager = await utils.createSuperTest('soc_manager');
      detectionsAdmin = await utils.createSuperTest('detections_admin');
    });

    after(async () => {
      await esArchiver.unload(path);
    });

    beforeEach(async () => {
      await deleteAllRules(admin, log);
      await createAlertsIndex(admin, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(admin, log, es);
    });

    describe('authorization / RBAC', () => {
      const successfulAssignWithRole = async (userAndRole: TestAgent) => {
        const rule = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(admin, log, rule);
        await waitForRuleSuccess({ supertest: admin, log, id });
        await waitForAlertsToBePresent(admin, log, 10, [id]);
        const alerts = await getAlertsByIds(admin, log, [id]);
        const alertIds = alerts.hits.hits.map((alert) => alert._id!);

        // Try to set all of the alerts to the state of closed.
        // This should not be possible with the given user.
        await userAndRole
          .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(
            setAlertAssignees({
              assigneesToAdd: ['user-1'],
              assigneesToRemove: [],
              ids: alertIds,
            })
          )
          .expect(200);
      };

      it('should allow `ROLES.t1_analyst` to assign alerts', async () => {
        await successfulAssignWithRole(t1Analyst);
      });

      it('should allow `ROLES.t2_analyst` to assign alerts', async () => {
        await successfulAssignWithRole(t2Analyst);
      });

      it('should allow `ROLES.t3_analyst` to assign alerts', async () => {
        await successfulAssignWithRole(t3Analyst);
      });

      it('should allow `ROLES.detections_admin` to assign alerts', async () => {
        await successfulAssignWithRole(detectionsAdmin);
      });

      it('should allow `ROLES.platform_engineer` to assign alerts', async () => {
        await successfulAssignWithRole(platformEngineer);
      });

      it('should allow `ROLES.rule_author` to assign alerts', async () => {
        await successfulAssignWithRole(ruleAuthor);
      });

      it('should allow `ROLES.soc_manager` to assign alerts', async () => {
        await successfulAssignWithRole(socManager);
      });
    });
  });
};
