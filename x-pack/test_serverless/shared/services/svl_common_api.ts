/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../functional/ftr_provider_context';

const COMMON_REQUEST_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

const INTERNAL_REQUEST_HEADERS = {
  ...COMMON_REQUEST_HEADERS,
  'x-elastic-internal-origin': 'kibana',
};

export function SvlCommonApiServiceProvider({}: FtrProviderContext) {
  return {
    getCommonRequestHeader() {
      return COMMON_REQUEST_HEADERS;
    },

    getInternalRequestHeader() {
      return INTERNAL_REQUEST_HEADERS;
    },

    assertResponseStatusCode(expectedStatus: number, actualStatus: number, responseBody: object) {
      expect(actualStatus).to.eql(
        expectedStatus,
        `Expected status code ${expectedStatus}, got ${actualStatus} with body '${JSON.stringify(
          responseBody
        )}'`
      );
    },

    assertApiNotFound(body: unknown, status: number) {
      expect(body).to.eql({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      });
      expect(status).to.eql(404);
    },
  };
}
