/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';
import { superUser } from '../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/internal/rac/alerts';
  const SPACE1 = 'space1';
  const ALERT_SUMMARY_URL = `${TEST_URL}/_alert_summary`;
  const LOGS_ALERT_ID = '123456789XYZ';
  const LOGS_ALERT_ID2 = 'space1alertLogs';

  describe('Alerts - GET - _alert_summary', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    it('Alert summary for all LOGS alerts with features', async () => {
      const alertSummary = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${ALERT_SUMMARY_URL}`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          gte: '2020-12-16T15:00:00.000Z',
          lte: '2020-12-16T16:00:00.000Z',
          featureIds: ['logs'],
          fixed_interval: '10m',
        })
        .expect(200);

      expect(alertSummary.body).to.eql({
        activeAlertCount: 1,
        recoveredAlertCount: 1,
        activeAlerts: [
          { key_as_string: '1608130800000', key: 1608130800000, doc_count: 0 },
          { key_as_string: '1608131400000', key: 1608131400000, doc_count: 2 },
          { key_as_string: '1608132000000', key: 1608132000000, doc_count: 2 },
          { key_as_string: '1608132600000', key: 1608132600000, doc_count: 1 },
          { key_as_string: '1608133200000', key: 1608133200000, doc_count: 1 },
          { key_as_string: '1608133800000', key: 1608133800000, doc_count: 1 },
          { key_as_string: '1608134400000', key: 1608134400000, doc_count: 1 },
        ],
        recoveredAlerts: [
          { key_as_string: '2020-12-16T15:00:00.000Z', key: 1608130800000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:10:00.000Z', key: 1608131400000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:20:00.000Z', key: 1608132000000, doc_count: 1 },
          { key_as_string: '2020-12-16T15:30:00.000Z', key: 1608132600000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:40:00.000Z', key: 1608133200000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:50:00.000Z', key: 1608133800000, doc_count: 0 },
          { key_as_string: '2020-12-16T16:00:00.000Z', key: 1608134400000, doc_count: 0 },
        ],
      });
    });

    it('Alert summary with a filter where the alert is recovered', async () => {
      const alertSummary = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${ALERT_SUMMARY_URL}`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          gte: '2020-12-16T15:00:00.000Z',
          lte: '2020-12-16T16:00:00.000Z',
          filter: [
            {
              terms: {
                _id: [LOGS_ALERT_ID2],
              },
            },
          ],
          featureIds: ['logs'],
          fixed_interval: '10m',
        })
        .expect(200);

      expect(alertSummary.body).to.eql({
        activeAlertCount: 0,
        recoveredAlertCount: 1,
        activeAlerts: [
          { key_as_string: '1608130800000', key: 1608130800000, doc_count: 0 },
          { key_as_string: '1608131400000', key: 1608131400000, doc_count: 1 },
          { key_as_string: '1608132000000', key: 1608132000000, doc_count: 1 },
          { key_as_string: '1608132600000', key: 1608132600000, doc_count: 0 },
          { key_as_string: '1608133200000', key: 1608133200000, doc_count: 0 },
          { key_as_string: '1608133800000', key: 1608133800000, doc_count: 0 },
          { key_as_string: '1608134400000', key: 1608134400000, doc_count: 0 },
        ],
        recoveredAlerts: [
          { key_as_string: '2020-12-16T15:00:00.000Z', key: 1608130800000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:10:00.000Z', key: 1608131400000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:20:00.000Z', key: 1608132000000, doc_count: 1 },
          { key_as_string: '2020-12-16T15:30:00.000Z', key: 1608132600000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:40:00.000Z', key: 1608133200000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:50:00.000Z', key: 1608133800000, doc_count: 0 },
          { key_as_string: '2020-12-16T16:00:00.000Z', key: 1608134400000, doc_count: 0 },
        ],
      });
    });

    it('Alert summary with a filter where the alert is active', async () => {
      const alertSummary = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${ALERT_SUMMARY_URL}`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          gte: '2020-12-16T15:00:00.000Z',
          lte: '2020-12-16T16:00:00.000Z',
          filter: [
            {
              terms: {
                _id: [LOGS_ALERT_ID],
              },
            },
          ],
          featureIds: ['logs'],
          fixed_interval: '10m',
        })
        .expect(200);

      expect(alertSummary.body).to.eql({
        activeAlertCount: 1,
        recoveredAlertCount: 0,
        activeAlerts: [
          { key_as_string: '1608130800000', key: 1608130800000, doc_count: 0 },
          { key_as_string: '1608131400000', key: 1608131400000, doc_count: 1 },
          { key_as_string: '1608132000000', key: 1608132000000, doc_count: 1 },
          { key_as_string: '1608132600000', key: 1608132600000, doc_count: 1 },
          { key_as_string: '1608133200000', key: 1608133200000, doc_count: 1 },
          { key_as_string: '1608133800000', key: 1608133800000, doc_count: 1 },
          { key_as_string: '1608134400000', key: 1608134400000, doc_count: 1 },
        ],
        recoveredAlerts: [
          { key_as_string: '2020-12-16T15:00:00.000Z', key: 1608130800000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:10:00.000Z', key: 1608131400000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:20:00.000Z', key: 1608132000000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:30:00.000Z', key: 1608132600000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:40:00.000Z', key: 1608133200000, doc_count: 0 },
          { key_as_string: '2020-12-16T15:50:00.000Z', key: 1608133800000, doc_count: 0 },
          { key_as_string: '2020-12-16T16:00:00.000Z', key: 1608134400000, doc_count: 0 },
        ],
      });
    });
  });
};
