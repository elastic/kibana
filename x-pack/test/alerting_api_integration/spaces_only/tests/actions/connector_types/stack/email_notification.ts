/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog } from '../../../../../common/lib';
import { EmailDomainsAllowed } from '../../config';

// eslint-disable-next-line import/no-default-export
export default function emailNotificationTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('email notifications', () => {
    it('succeed', async () => {
      const to = EmailDomainsAllowed.map((domain) => `jeb@${domain}`).sort();

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
  });
}
