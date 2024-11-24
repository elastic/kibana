/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import {
  QueryRuleCreateProps,
  RulePreviewRequestBody,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { DETECTION_ENGINE_RULES_PREVIEW } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../../es_archive_path_builder';
import {
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
} from '../../../../../../../../common/utils/security_solution';

/**
 * Specific _id to use for some of the tests. If the archiver changes and you see errors
 * here, update this to a new value of a chosen auditbeat record and update the tests values.
 */
const ID = 'BhbXBmkBR346wHgn4PeZ';

export default ({ getService }: FtrProviderContext): void => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatPath = dataPathBuilder.getPath('auditbeat/hosts');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  let admin: TestAgent;
  let socManager: TestAgent;

  describe('@serverless @serverlessQA soc_manager rule execution API behaviors', () => {
    before(async () => {
      await esArchiver.load(auditbeatPath);
      admin = await utils.createSuperTest('admin');
      socManager = await utils.createSuperTest('soc_manager');
    });

    afterEach(async () => {
      await esDeleteAllIndices('.preview.alerts*');
    });

    after(async () => {
      await esArchiver.unload(auditbeatPath);
      await deleteAllAlerts(admin, log, es, [
        '.preview.alerts-security.alerts-*',
        '.alerts-security.alerts-*',
      ]);
      await deleteAllRules(admin, log);
    });

    describe('rule execution', () => {
      it('should return 200 for soc_manager', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const previewRequest: RulePreviewRequestBody = {
          ...rule,
          invocationCount: 1,
          timeframeEnd: new Date().toISOString(),
        };
        await socManager
          .post(DETECTION_ENGINE_RULES_PREVIEW)
          .query({ enable_logged_requests: true })
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(previewRequest)
          .expect(200);
      });
    });
  });
};
