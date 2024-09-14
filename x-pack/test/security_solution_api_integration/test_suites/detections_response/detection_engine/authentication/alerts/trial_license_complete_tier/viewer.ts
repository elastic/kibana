/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import {
  DETECTION_ENGINE_ALERT_TAGS_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
} from '@kbn/security-solution-plugin/common/constants';
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
import { getAlertStatus, setAlertStatus, setAlertTags } from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

const query = {
  ...getAlertStatus(),
  query: {
    bool: {
      should: [{ match_all: {} }],
    },
  },
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  let viewer: TestAgent;

  describe('@serverless @serverlessQA viewer alerts API behaviors', () => {
    before(async () => {
      await esArchiver.load(path);
      viewer = await utils.createSuperTest('viewer');
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await createAlertsIndex(supertest, log);
    });

    after(async () => {
      await esArchiver.unload(path);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
    });

    describe('find alerts', () => {
      it('should return 200 for viewer', async () => {
        await viewer
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(query)
          .expect(200);
      });
    });

    describe('set alert tags', () => {
      it('should return 403 for viewer', async () => {
        const rule = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 10, [id]);
        const alerts = await getAlertsByIds(supertest, log, [id]);
        const alertIds = alerts.hits.hits.map((alert) => alert._id!);

        await viewer
          .post(DETECTION_ENGINE_ALERT_TAGS_URL)
          .set('kbn-xsrf', 'true')
          .send(
            setAlertTags({
              tagsToAdd: ['tag-1'],
              tagsToRemove: [],
              ids: alertIds,
            })
          )
          .expect(403);
      });
    });

    describe('update alert status', () => {
      it('should return 403 for viewer', async () => {
        const rule = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 10, [id]);

        await viewer
          .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send(setAlertStatus({ query: { match_all: {} }, status: 'open' }))
          .expect(403);
      });
    });
  });
};
