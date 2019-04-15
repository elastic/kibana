/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import expect from '@kbn/expect';
// import { SecurityService, SpacesService } from '../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function featureControlsTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  // const supertest = getService('supertestWithoutAuth');
  // const security: SecurityService = getService('security');
  // const log = getService('log');

  // const expect404 = (result: any) => {
  //   expect(result.error).to.be(undefined);
  //   expect(result.response).not.to.be(undefined);
  //   expect(result.response).to.have.property('statusCode', 404);
  // };

  // const expect200 = (result: any) => {
  //   expect(result.error).to.be(undefined);
  //   expect(result.response).not.to.be(undefined);
  //   expect(result.response).to.have.property('statusCode', 200);
  // };

  // const endpoints = [
  //   {
  //     url: `/api/code/---`,
  //     expectForbidden: expect404,
  //     expectResponse: expect200,
  //   },
  // ];

  // async function executeRequest(
  //   endpoint: string,
  //   username: string,
  //   password: string,
  // ) {

  //   return await supertest
  //     .get(endpoint)
  //     .auth(username, password)
  //     .set('kbn-xsrf', 'foo')
  //     .then((response: any) => ({ error: undefined, response }))
  //     .catch((error: any) => ({ error, response: undefined }));
  // }

  // async function executeRequests(
  //   username: string,
  //   password: string,
  //   expectation: 'forbidden' | 'response'
  // ) {
  //   for (const endpoint of endpoints) {
  //     log.debug(`hitting ${endpoint}`);
  //     const result = await executeRequest(endpoint.url, username, password);
  //     if (expectation === 'forbidden') {
  //       endpoint.expectForbidden(result);
  //     } else {
  //       endpoint.expectResponse(result);
  //     }
  //   }
  // }

  describe('feature controls', () => {
    // TODO implement tests similar to APM
  });
}
