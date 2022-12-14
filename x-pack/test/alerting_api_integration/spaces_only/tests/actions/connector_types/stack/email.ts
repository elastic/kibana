/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { ObjectRemover } from '../../../../../common/lib';
import { EmailDomainsAllowed } from '../../../../config';

const EmailDomainAllowed = EmailDomainsAllowed[EmailDomainsAllowed.length - 1];

// eslint-disable-next-line import/no-default-export
export default function emailTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('email connector', () => {
    afterEach(() => objectRemover.removeAll());

    it('succeeds with allowed email domains', async () => {
      const from = `bob@${EmailDomainAllowed}`;
      const conn = await createConnector(from);
      expect(conn.status).to.be(200);

      const { id } = conn.body;
      expect(id).to.be.a('string');

      const to = EmailDomainsAllowed.map((domain) => `jeb@${domain}`).sort();
      const cc = EmailDomainsAllowed.map((domain) => `jim@${domain}`).sort();
      const bcc = EmailDomainsAllowed.map((domain) => `joe@${domain}`).sort();

      const ccNames = cc.map((email) => `Jimmy Jack <${email}>`);

      const run = await runConnector(id, to, ccNames, bcc);
      expect(run.status).to.be(200);

      const { status, data } = run.body || {};
      expect(status).to.be('ok');

      const { message } = data || {};
      const { from: fromMsg } = message || {};

      expect(fromMsg?.address).to.be(from);
      expect(addressesFromMessage(message, 'to')).to.eql(to);
      expect(addressesFromMessage(message, 'cc')).to.eql(cc);
      expect(addressesFromMessage(message, 'bcc')).to.eql(bcc);

      const ccNamesMsg = namesFromMessage(message, 'cc');
      for (const ccName of ccNamesMsg) {
        expect(ccName).to.be('Jimmy Jack');
      }
    });

    describe('fails for invalid email domains', () => {
      it('in create when invalid "from" used', async () => {
        const from = `bob@not.allowed`;
        const { status, body } = await createConnector(from);
        expect(status).to.be(400);

        const { message = 'no message returned' } = body || {};
        expect(message).to.match(/not allowed emails: bob@not.allowed/);
      });

      it('in execute when invalid "to", "cc" or "bcc" used', async () => {
        const from = `bob@${EmailDomainAllowed}`;
        const conn = await createConnector(from);
        expect(conn.status).to.be(200);

        const { id } = conn.body || {};
        expect(id).to.be.a('string');

        const to = EmailDomainsAllowed.map((domain) => `jeb@${domain}`).sort();
        const cc = EmailDomainsAllowed.map((domain) => `jim@${domain}`).sort();
        const bcc = EmailDomainsAllowed.map((domain) => `joe@${domain}`).sort();

        to.push('jeb1@not.allowed');
        cc.push('jeb2@not.allowed');
        bcc.push('jeb3@not.allowed');

        const { status, body } = await runConnector(id, to, cc, bcc);
        expect(status).to.be(200);

        expect(body?.status).to.be('error');
        expect(body?.message).to.match(
          /not allowed emails: jeb1@not.allowed, jeb2@not.allowed, jeb3@not.allowed/
        );
      });
    });

    describe('export, import, then execute email connector', () => {
      afterEach(() => objectRemover.removeAll());

      it('successfully executes with no auth', async () => {
        const from = `bob@${EmailDomainAllowed}`;
        const conn = await createConnector(from, false);
        expect(conn.status).to.be(200);
        const { id } = conn.body;

        const text = await exportConnector(id);

        const { body } = await importConnector(text);
        const importId = body.successResults[0].id;

        const to = EmailDomainsAllowed.map((domain) => `jeb@${domain}`).sort();
        const cc = EmailDomainsAllowed.map((domain) => `jim@${domain}`).sort();
        const bcc = EmailDomainsAllowed.map((domain) => `joe@${domain}`).sort();
        const ccNames = cc.map((email) => `Jimmy Jack <${email}>`);
        const run = await runConnector(importId, to, ccNames, bcc);

        expect(run.status).to.be(200);

        const { status } = run.body || {};
        expect(status).to.be('ok');
      });
    });
  });

  /* returns the following `body`, for the special email __json service:
  {
    "status": "ok",
    "data": {
        "envelope": {
            "from": "bob@example.org",
            "to": [ "jeb@example.com", ...]
        },
        "messageId": "<f11a4ac8-2ed6-70fe-5b09-c6c7e97fed25@example.org>",
        "message": {
            "from": { "address": "bob@example.org", "name": "" },
            "to": [ { "address": "jeb@example.com", "name": "" }, ...],
            "cc": [ ... ],
            "bcc": [ ... ],
            ...
        }
    },
    ...
  }
  */
  async function createConnector(
    from: string,
    hasAuth: boolean = true
  ): Promise<{ status: number; body: any }> {
    const connector: any = {
      name: `An email connector from ${__filename}`,
      connector_type_id: '.email',
      config: {
        service: '__json',
        from,
        hasAuth,
      },
    };
    if (hasAuth) {
      connector.secrets = {
        user: 'bob',
        password: 'changeme',
      };
    }
    const { status, body } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send(connector);

    if (status === 200) {
      objectRemover.add('default', body.id, 'connector', 'actions');
    }

    return { status, body };
  }

  async function runConnector(
    id: string,
    to: string[],
    cc: string[],
    bcc: string[]
  ): Promise<{ status: number; body: any }> {
    const subject = 'email-subject';
    const message = 'email-message';
    const { status, body } = await supertest
      .post(`/api/actions/connector/${id}/_execute`)
      .set('kbn-xsrf', 'foo')
      .send({ params: { to, cc, bcc, subject, message } });

    return { status, body };
  }

  async function exportConnector(id: string) {
    const { text } = await supertest
      .post(`/api/saved_objects/_export`)
      .send({
        objects: [
          {
            id,
            type: 'action',
          },
        ],
        includeReferencesDeep: true,
      })
      .set('kbn-xsrf', 'true');
    return text;
  }

  async function importConnector(text: any) {
    return await supertest
      .post('/api/saved_objects/_import')
      .query({ overwrite: true })
      .attach('file', Buffer.from(text), 'actions.ndjson')
      .set('kbn-xsrf', 'true');
  }
}

function addressesFromMessage(message: any, which: 'to' | 'cc' | 'bcc'): string[] {
  return addressFieldFromMessage(message, which, 'address');
}

function namesFromMessage(message: any, which: 'to' | 'cc' | 'bcc'): string[] {
  return addressFieldFromMessage(message, which, 'name');
}

function addressFieldFromMessage(
  message: any,
  which1: 'to' | 'cc' | 'bcc',
  which2: 'name' | 'address'
): string[] {
  const result: string[] = [];

  const list = message?.[which1];
  if (!Array.isArray(list)) return result;

  return list.map((entry) => `${entry?.[which2]}`).sort();
}
