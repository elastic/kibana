/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestAlertData, ObjectRemover, getEventLog } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { validateEvent } from '../../../spaces_only/tests/alerting/event_log';

// eslint-disable-next-line import/no-default-export
export default function eventLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('eventLog', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should generate events for alert decrypt errors', async () => {
      const spaceId = Spaces[0].id;
      const response = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.noop',
            schedule: { interval: '1s' },
            throttle: null,
          })
        );

      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(spaceId, alertId, 'alert', 'alerts');

      // break AAD
      await supertest
        .put(`${getUrlPrefix(spaceId)}/api/alerts_fixture/saved_object/alert/${alertId}`)
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            name: 'bar',
          },
        })
        .expect(200);

      const events = await retry.try(async () => {
        // there can be a successful execute before the error one
        const someEvents = await getEventLog({
          getService,
          spaceId,
          type: 'alert',
          id: alertId,
          provider: 'alerting',
          actions: ['execute'],
        });
        const errorEvents = someEvents.filter(
          (event) => event?.kibana?.alerting?.status === 'error'
        );
        if (errorEvents.length === 0) {
          throw new Error('no execute/error events yet');
        }
        return errorEvents;
      });

      const event = events[0];
      expect(event).to.be.ok();

      validateEvent(event, {
        spaceId,
        savedObjects: [{ type: 'alert', id: alertId, rel: 'primary' }],
        outcome: 'failure',
        message: `test.noop:${alertId}: execution failed`,
        errorMessage: 'Unable to decrypt attribute "apiKey"',
        status: 'error',
        reason: 'decrypt',
      });
    });
  });
}
