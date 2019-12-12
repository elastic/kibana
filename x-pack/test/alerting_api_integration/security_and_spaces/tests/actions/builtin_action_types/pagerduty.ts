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

// eslint-disable-next-line import/no-default-export
export default function pagerdutyTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('pagerduty action', () => {
    let simulatedActionId = '';
    let pagerdutySimulatorURL: string = '<could not determine kibana url>';

    // need to wait for kibanaServer to settle ...
    before(() => {
      pagerdutySimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.PAGERDUTY)
      );
    });

    after(() => esArchiver.unload('empty_kibana'));

    it('should return successfully when passed valid create parameters', async () => {
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A pagerduty action',
          actionTypeId: '.pagerduty',
          secrets: {
            routingKey: 'pager-duty-routing-key',
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        name: 'A pagerduty action',
        actionTypeId: '.pagerduty',
        config: {
          apiUrl: null,
        },
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/action/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        name: 'A pagerduty action',
        actionTypeId: '.pagerduty',
        config: {
          apiUrl: null,
        },
      });
    });

    it('should return unsuccessfully when passed invalid create parameters', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A pagerduty action',
          actionTypeId: '.pagerduty',
          secrets: {},
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type secrets: [routingKey]: expected value of type [string] but got [undefined]',
          });
        });
    });

    it('should create pagerduty simulator action successfully', async () => {
      const { body: createdSimulatedAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A pagerduty simulator',
          actionTypeId: '.pagerduty',
          config: {
            apiUrl: pagerdutySimulatorURL,
          },
          secrets: {
            routingKey: 'pager-duty-routing-key',
          },
        })
        .expect(200);

      simulatedActionId = createdSimulatedAction.id;
    });

    it('should handle executing with a simulated success', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            summary: 'just a test',
          },
        })
        .expect(200);
      expect(result).to.eql({
        status: 'ok',
        actionId: simulatedActionId,
        data: {
          dedup_key: `action:${simulatedActionId}`,
          message: 'Event processed',
          status: 'success',
        },
      });
    });

    it('should handle a 40x pagerduty error', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            summary: 'respond-with-418',
          },
        })
        .expect(200);
      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error posting pagerduty event: unexpected status 418/);
    });

    it('should handle a 429 pagerduty error', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            summary: 'respond-with-429',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(
        /error posting pagerduty event: http status 429, retry later/
      );
      expect(result.retry).to.equal(true);
    });

    it('should handle a 500 pagerduty error', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            summary: 'respond-with-502',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error posting pagerduty event: http status 502/);
      expect(result.retry).to.equal(true);
    });
  });
}
