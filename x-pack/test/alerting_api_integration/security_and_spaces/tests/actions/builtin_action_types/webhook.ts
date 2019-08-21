/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '../../../../common/fixtures/plugins/actions';

const defaultValues: Record<string, any> = {
  headers: null,
  proxy: null,
  connection_timeout: null,
  read_timeout: null,
  method: 'post',
};

function extractCredentialsFromUrl(url: string): { url: string; user: string; password: string } {
  return { url: url.replace('elastic:changeme@', ''), user: 'elastic', password: 'changeme' };
}

// eslint-disable-next-line import/no-default-export
export default function webhookTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  async function createWebhookAction(urlWithCreds: string): Promise<string> {
    const { url, user, password } = extractCredentialsFromUrl(urlWithCreds);
    const { body: createdAction } = await supertest
      .post('/api/action')
      .set('kbn-xsrf', 'test')
      .send({
        description: 'A generic Webhook action',
        actionTypeId: '.webhook',
        secrets: {
          user,
          password,
        },
        config: {
          url,
          headers: {
            'Content-Type': 'text/plain',
          },
        },
      })
      .expect(200);

    return createdAction.id;
  }

  describe('webhook action', () => {
    let webhookSimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      const kibanaServer = getService('kibanaServer');
      const kibanaUrl = kibanaServer.status && kibanaServer.status.kibanaServerUrl;
      const webhookServiceUrl = getExternalServiceSimulatorPath(ExternalServiceSimulator.WEBHOOK);
      webhookSimulatorURL = `${kibanaUrl}${webhookServiceUrl}`;
    });

    after(() => esArchiver.unload('empty_kibana'));

    it('should return 200 when creating a webhook action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'test')
        .send({
          description: 'A generic Webhook action',
          actionTypeId: '.webhook',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: webhookSimulatorURL,
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        description: 'A generic Webhook action',
        actionTypeId: '.webhook',
        config: {
          ...defaultValues,
          url: webhookSimulatorURL,
        },
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/action/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        description: 'A generic Webhook action',
        actionTypeId: '.webhook',
        config: {
          ...defaultValues,
          url: webhookSimulatorURL,
        },
      });
    });

    it('should send authentication to the webhook target', async () => {
      const webhookActionId = await createWebhookAction(webhookSimulatorURL);
      const { body: result } = await supertest
        .post(`/api/action/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'validateAuthentication',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });
  });
}
