/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getStats,
  getWebHookAction,
} from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');

  describe('legacy notification telemetry', async () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    it('should have 1 legacy notification when there is a rule on the default', async () => {
      // create an connector/action
      const { body: hookAction } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getWebHookAction())
        .expect(200);

      // create a rule without actions
      const createRuleBody = await createRule(supertest, log, getSimpleRule('rule-1'));

      // attach the legacy notification
      await supertest
        .post(`/internal/api/detection/legacy/notifications?alert_id=${createRuleBody.id}`)
        .set('kbn-xsrf', 'true')
        .send({
          name: 'Legacy notification with one action',
          interval: '1h',
          actions: [
            {
              id: hookAction.id,
              group: 'default',
              params: {
                message:
                  'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
              },
              actionTypeId: hookAction.actionTypeId,
            },
          ],
        })
        .expect(200);

      await retry.try(async () => {
        const stats = await getStats(supertest, log);
        // NOTE: We have to do "above 0" until this bug is fixed: https://github.com/elastic/kibana/issues/122456 because other tests are accumulating non-cleaned up legacy actions/notifications and this number isn't reliable at the moment
        expect(stats.detection_rules.detection_rule_usage.legacy_notifications.total).to.above(0);
      });
    });
  });
};
