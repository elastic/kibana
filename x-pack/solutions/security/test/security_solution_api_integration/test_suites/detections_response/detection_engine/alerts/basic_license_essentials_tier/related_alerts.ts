/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { createAlertsIndex, deleteAllAlerts } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

const ALERTS_INDEX = '.alerts-security.alerts-default';
const RELATED_ALERTS_API_PATH = '/internal/security_solution/alert_analysis/related_alerts';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');

  describe('@ess related alert analysis', () => {
    beforeEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await createAlertsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
    });

    it('finds the source alert after the alerts alias rolls over', async () => {
      const timestamp = new Date().toISOString();

      await es.index({
        index: ALERTS_INDEX,
        id: 'source-alert',
        document: {
          '@timestamp': timestamp,
          'host.name': 'shared-host',
        },
        refresh: 'wait_for',
      });

      await es.indices.rollover({ alias: ALERTS_INDEX });

      await es.index({
        index: ALERTS_INDEX,
        id: 'related-alert',
        document: {
          '@timestamp': timestamp,
          'host.name': 'shared-host',
        },
        refresh: 'wait_for',
      });

      const { body } = await supertest
        .post(RELATED_ALERTS_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          alertId: 'source-alert',
          timeWindowHours: 24,
          maxResults: 25,
        })
        .expect(200);

      expect(body.ok).to.be(true);
      expect(body.sourceEntities.hostNames).to.eql(['shared-host']);
      expect(body.relatedAlerts.map((alert: { _id: string }) => alert._id)).to.eql([
        'related-alert',
      ]);
    });
  });
};
