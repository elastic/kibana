/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { URL, format as formatUrl } from 'url';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '../../../../common/fixtures/plugins/actions';

// eslint-disable-next-line import/no-default-export
export default function webhookTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  async function createWebhookAction(
    urlWithCreds: string,
    config: Record<string, string | Record<string, string>> = {}
  ): Promise<string> {
    const url = formatUrl(new URL(urlWithCreds), { auth: false });
    const composedConfig = {
      headers: {
        'Content-Type': 'text/plain',
      },
      ...config,
      url,
    };

    const { body: createdAction } = await supertest
      .post('/api/action')
      .set('kbn-xsrf', 'test')
      .send({
        name: 'A generic Webhook action',
        actionTypeId: '.webhook',
        secrets: {},
        config: composedConfig,
      })
      .expect(200);

    return createdAction.id;
  }

  describe('webhook action', () => {
    let webhookSimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      webhookSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.WEBHOOK)
      );
    });

    after(() => esArchiver.unload('empty_kibana'));

    it('webhook can be executed without username and password', async () => {
      const webhookActionId = await createWebhookAction(webhookSimulatorURL);
      const { body: result } = await supertest
        .post(`/api/action/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'success',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });
  });
}
