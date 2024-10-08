/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog, ObjectRemover } from '../../../../../common/lib';
import { EmailDomainsAllowed } from '../../config';

// eslint-disable-next-line import/no-default-export
export default function emailNotificationTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const objectRemover = new ObjectRemover(supertest);
  const from = `bob@${EmailDomainsAllowed[0]}`;
  const to = [`jim@${EmailDomainsAllowed[0]}`];

  describe('email using html', () => {
    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('succeeds as notification', async () => {
      const startDate = new Date().toISOString();

      // The route sends two notifications, which will send two emails.
      // see: x-pack/test/alerting_api_integration/common/plugins/alerts/server/routes.ts
      const body = {
        to,
        subject: 'testing',
        message: 'plain text message',
        messageHTML: 'html message',
      };

      const res = await supertest
        .post('/_test/send_notification')
        .set('kbn-xsrf', 'foo')
        .send(body);
      expect(res.status).to.eql(200);
      expect(res.body?.ok).to.eql(true);

      // We don't have a way to check the emails generated, when run this
      // way, but we can check the event log to make sure the connector
      // ran successfully.  Filter manually with the start date, in
      // case someone's running FT with the same ES instance - old EL
      // docs for this test will linger.
      const events: IValidatedEvent[] = await retry.try(async () => {
        const events_ = await getEventLog({
          getService,
          spaceId: 'default',
          type: 'action',
          id: 'notification-email',
          provider: 'actions',
          actions: new Map([['execute', { gte: 2 }]]),
        });

        const filteredEvents = events_.filter((event) => event!['@timestamp']! >= startDate);
        if (filteredEvents.length < 2) throw new Error('no recent events found yet');

        return filteredEvents;
      });

      for (const event of events) {
        expect(event?.event?.outcome).to.be('success');
        expect(event?.kibana?.action?.execution?.source).to.be('notification');
      }
    });

    it('fails as http execution', async () => {
      const { body: connBody, status: connStatus } = await createConnector(
        supertest,
        objectRemover,
        from
      );
      expect(connStatus).to.be(200);
      const connId = connBody.id;

      await supertest
        .post(`/api/actions/connector/${connId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            to,
            subject: 'HTML message check',
            message: '_italic_ **bold** https://elastic.co link',
            messageHTML: '<html><body>Hallo!</body></html>',
          },
        })
        .expect(200)
        .then((resp: any) => {
          const { status: runStatus, message } = resp.body;
          expect(runStatus).to.eql('error');
          expect(message).to.eql('HTML email can only be sent via notifications');
        });
    });

    it('fails as action execution', async () => {
      const { body: connBody, status: connStatus } = await createConnector(
        supertest,
        objectRemover,
        from
      );
      expect(connStatus).to.be(200);
      const connId = connBody.id;

      const ruleParams = {
        enabled: true,
        name: 'rule testing html email',
        schedule: { interval: '1s' },
        throttle: '1m',
        rule_type_id: 'test.always-firing',
        consumer: 'alertsFixture',
        params: {
          index: ES_TEST_INDEX_NAME,
          reference: 'ignore',
        },
        notify_when: 'onActiveAlert',
        actions: [
          {
            group: 'default',
            id: connId,
            params: {
              to,
              subject: 'HTML message check',
              message: '_italic_ **bold** https://elastic.co link',
              messageHTML: '<html><body>Hallo!</body></html>',
            },
          },
        ],
      };

      const response = await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(ruleParams);
      expect(response.status).to.eql(200);
      const ruleId = response.body.id;
      objectRemover.add('default', ruleId, 'rule', 'alerting');

      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'default',
          type: 'action',
          id: connId,
          provider: 'actions',
          actions: new Map([['execute', { gte: 1 }]]),
        });
      });

      const event = events[0];
      expect(event?.event?.outcome).to.be('failure');
      expect(event?.error?.message).to.be('HTML email can only be sent via notifications');
    });
  });
}

async function createConnector(
  supertest: ReturnType<FtrProviderContext['getService']>,
  objectRemover: ObjectRemover,
  from: string
): Promise<{ status: number; body: any }> {
  const connector: any = {
    name: `An email connector from ${__filename}`,
    connector_type_id: '.email',
    config: {
      service: '__json',
      from,
      hasAuth: false,
    },
  };
  const { status, body } = await supertest
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'foo')
    .send(connector);

  if (status === 200) {
    objectRemover.add('default', body.id, 'connector', 'actions');
  }

  return { status, body };
}
