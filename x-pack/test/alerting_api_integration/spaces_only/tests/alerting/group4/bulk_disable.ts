/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { ALERT_STATUS } from '@kbn/rule-data-utils';
import { Spaces } from '../../../scenarios';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';

const alertAsDataIndex = '.internal.alerts-observability.test.alerts.alerts-default-000001';

// eslint-disable-next-line import/no-default-export
export default function createDisableRuleTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');

  describe('bulkDisable', () => {
    const objectRemover = new ObjectRemover(supertest);

    const createRule = async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.always-firing-alert-as-data',
            schedule: { interval: '24h' },
            throttle: undefined,
            notify_when: undefined,
            params: {
              index: ES_TEST_INDEX_NAME,
              reference: 'test',
            },
          })
        )
        .expect(200);

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');
      return createdRule.id;
    };

    const getAlerts = async () => {
      const {
        hits: { hits: alerts },
      } = await es.search({
        index: alertAsDataIndex,
        body: { query: { match_all: {} } },
      });

      return alerts;
    };

    afterEach(async () => {
      await es.deleteByQuery({
        index: alertAsDataIndex,
        query: {
          match_all: {},
        },
        conflicts: 'proceed',
      });
      await objectRemover.removeAll();
    });

    it('should bulk disable and untrack', async () => {
      const createdRule1 = await createRule();
      const createdRule2 = await createRule();

      await retry.try(async () => {
        const alerts = await getAlerts();

        expect(alerts.length).eql(4);
        alerts.forEach((activeAlert: any) => {
          expect(activeAlert._source[ALERT_STATUS]).eql('active');
        });
      });

      await supertest
        .patch(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_disable`)
        .set('kbn-xsrf', 'foo')
        .send({
          ids: [createdRule1, createdRule2],
          untrack: true,
        })
        .expect(200);

      const alerts = await getAlerts();

      expect(alerts.length).eql(4);
      alerts.forEach((untrackedAlert: any) => {
        expect(untrackedAlert._source[ALERT_STATUS]).eql('untracked');
      });
    });

    it('should bulk disable and not untrack if untrack is false', async () => {
      const createdRule1 = await createRule();
      const createdRule2 = await createRule();

      await retry.try(async () => {
        const alerts = await getAlerts();

        expect(alerts.length).eql(4);
        alerts.forEach((activeAlert: any) => {
          expect(activeAlert._source[ALERT_STATUS]).eql('active');
        });
      });

      await supertest
        .patch(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_disable`)
        .set('kbn-xsrf', 'foo')
        .send({
          ids: [createdRule1, createdRule2],
          untrack: false,
        })
        .expect(200);

      const alerts = await getAlerts();

      expect(alerts.length).eql(4);
      alerts.forEach((activeAlert: any) => {
        expect(activeAlert._source[ALERT_STATUS]).eql('active');
      });
    });
  });
}
