/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import expect from '@kbn/expect';

import getPort from 'get-port';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getXmattersServer } from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function xmattersTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe.only('xmatters action', () => {
    let xmattersServer: http.Server;
    let xmattersSimulatorURL: string = '';

    // need to wait for kibanaServer to settle ...
    before(async () => {
      xmattersServer = await getXmattersServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      if (!xmattersServer.listening) {
        xmattersServer.listen(availablePort);
      }
      xmattersSimulatorURL = `http://localhost:${availablePort}`;
    });

    it('xmatters connector can be executed without username and password', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An xMatters action',
          connector_type_id: '.xmatters',
          config: {
            url: xmattersSimulatorURL,
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        name: 'A xmatters action',
        connector_type_id: '.xmatters',
        is_missing_secrets: true,
        config: {
          url: xmattersSimulatorURL,
        },
      });
    });

    // it('should return successfully when passed valid create parameters', async () => {
    //   const { body: createdAction } = await supertest
    //     .post('/api/actions/connector')
    //     .set('kbn-xsrf', 'foo')
    //     .send({
    //       name: 'A xMatters action',
    //       connector_type_id: '.xmatters',
    //       config: {
    //         url: xmattersSimulatorURL,
    //       },
    //       secrets: {
    //         user: 'username',
    //         password: 'mypassphrase',
    //       },
    //     })
    //     .expect(200);

    //   expect(createdAction).to.eql({
    //     id: createdAction.id,
    //     is_preconfigured: false,
    //     name: 'A xMatters action',
    //     connector_type_id: '.xmatters',
    //     is_missing_secrets: false,
    //     config: {
    //       url: xmattersSimulatorURL,
    //     },
    //   });

    //   expect(typeof createdAction.id).to.be('string');

    //   const { body: fetchedAction } = await supertest
    //     .get(`/api/actions/connector/${createdAction.id}`)
    //     .expect(200);

    //   expect(fetchedAction).to.eql({
    //     id: fetchedAction.id,
    //     is_preconfigured: false,
    //     name: 'A xMatters action',
    //     connector_type_id: '.xmatters',
    //     is_missing_secrets: false,
    //     config: {
    //       url: xmattersSimulatorURL,
    //     },
    //   });
    // });

  //   it('should return unsuccessfully when passed invalid create parameters', async () => {
  //     await supertest
  //       .post('/api/actions/connector')
  //       .set('kbn-xsrf', 'foo')
  //       .send({
  //         name: 'A xmatters action',
  //         connector_type_id: '.xmatters',
  //         config: {
  //           url: xmattersSimulatorURL,
  //         },
  //         secrets: {},
  //         params: {
  //           alertActionGroupName: 'some group name',
  //         },
  //       })
  //       .expect(400)
  //       .then((resp: any) => {
  //         expect(resp.body).to.eql({
  //           statusCode: 400,
  //           error: 'Bad Request',
  //           message:
  //             'error validating action type parameters: [alertId]: expected value of type [string] but got [undefined]',
  //         });
  //       });
  //   });

  //   it('should return unsuccessfully when default xmatters url is not present in allowedHosts', async () => {
  //     await supertest
  //       .post('/api/actions/connector')
  //       .set('kbn-xsrf', 'foo')
  //       .send({
  //         name: 'A xmatters action',
  //         connector_type_id: '.xmatters',
  //         secrets: {},
  //       })
  //       .expect(400)
  //       .then((resp: any) => {
  //         expect(resp.body).to.eql({
  //           statusCode: 400,
  //           error: 'Bad Request',
  //           message:
  //             'error validating action type config: error configuring xmatters action: target url "https://events.xmatters.com/v2/enqueue" is not added to the Kibana config xpack.actions.allowedHosts',
  //         });
  //       });
  //   });

  //   it('should create xmatters simulator action successfully', async () => {
  //     const { body: createdSimulatedAction } = await supertest
  //       .post('/api/actions/connector')
  //       .set('kbn-xsrf', 'foo')
  //       .send({
  //         name: 'A xmatters simulator',
  //         connector_type_id: '.xmatters',
  //         config: {
  //           url: xmattersSimulatorURL,
  //         },
  //         secrets: {
  //           routingKey: 'pager-duty-routing-key',
  //         },
  //       })
  //       .expect(200);

  //     simulatedActionId = createdSimulatedAction.id;
  //   });

  //   it('should handle executing with a simulated success', async () => {
  //     const { body: result } = await supertest
  //       .post(`/api/actions/connector/${simulatedActionId}/_execute`)
  //       .set('kbn-xsrf', 'foo')
  //       .send({
  //         params: {
  //           summary: 'success',
  //         },
  //       })
  //       .expect(200);

  //     expect(proxyHaveBeenCalled).to.equal(true);
  //     expect(result).to.eql({
  //       status: 'ok',
  //       connector_id: simulatedActionId,
  //       data: {
  //         message: 'Event processed',
  //         status: 'success',
  //       },
  //     });
  //   });

  //   it('should handle a 40x xmatters error', async () => {
  //     const { body: result } = await supertest
  //       .post(`/api/actions/connector/${simulatedActionId}/_execute`)
  //       .set('kbn-xsrf', 'foo')
  //       .send({
  //         params: {
  //           summary: 'respond-with-40x',
  //         },
  //       })
  //       .expect(200);
  //     expect(result.status).to.equal('error');
  //     expect(result.message).to.match(/error posting xmatters event: unexpected status 418/);
  //   });

  //   it('should handle a 429 xmatters error', async () => {
  //     const { body: result } = await supertest
  //       .post(`/api/actions/connector/${simulatedActionId}/_execute`)
  //       .set('kbn-xsrf', 'foo')
  //       .send({
  //         params: {
  //           summary: 'respond-with-429',
  //         },
  //       })
  //       .expect(200);

  //     expect(result.status).to.equal('error');
  //     expect(result.message).to.match(/error posting xmatters event: http status 429, retry later/);
  //     expect(result.retry).to.equal(true);
  //   });

  //   it('should handle a 500 xmatters error', async () => {
  //     const { body: result } = await supertest
  //       .post(`/api/actions/connector/${simulatedActionId}/_execute`)
  //       .set('kbn-xsrf', 'foo')
  //       .send({
  //         params: {
  //           summary: 'respond-with-502',
  //         },
  //       })
  //       .expect(200);

  //     expect(result.status).to.equal('error');
  //     expect(result.message).to.match(/error posting xmatters event: http status 502/);
  //     expect(result.retry).to.equal(true);
  //   });

  //   after(() => {
  //     if (proxyServer) {
  //       proxyServer.close();
  //     }
  //   });
  // });
  });
}
