/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { OpsgenieSimulator } from '../../../../../common/fixtures/plugins/actions_simulators/server/opsgenie_simulation';

// eslint-disable-next-line import/no-default-export
export default function opsgenieTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Opsgenie', () => {
    describe('action creation', () => {
      const simulator = new OpsgenieSimulator();
      let simulatorUrl: string;

      before(async () => {
        simulatorUrl = await simulator.start();
      });

      after(() => {
        simulator.close();
      });

      it('should return 200 when creating the connector', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An opsgenie action',
            connector_type_id: '.opsgenie',
            config: {
              apiUrl: simulatorUrl,
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_deprecated: false,
          name: 'An opsgenie action',
          connector_type_id: '.opsgenie',
          is_missing_secrets: false,
          config: {
            apiUrl: simulatorUrl,
          },
        });
      });

      it('should return 400 Bad Request when creating the connector without the apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An opsgenie action',
            connector_type_id: '.opsgenie',
            config: {},
            secrets: {
              apiKey: '123',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [apiUrl]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector with a apiUrl that is not allowed', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An opsgenie action',
            connector_type_id: '.opsgenie',
            config: {
              apiUrl: 'http://opsgenie.mynonexistent.com',
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error configuring connector action: target url "http://servicenow.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An opsgenie action',
            connector_type_id: '.opsgenie',
            config: {
              apiUrl: simulatorUrl,
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [apiKey]: expected value of type [string] but got [undefined]',
            });
          });
      });
    });
  });
}
