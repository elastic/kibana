/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SuperTest from 'supertest';
import { ToolingLog } from '@kbn/tooling-log';

export interface LogErrorDetailsInterface {
  (this: SuperTest.Test, err: Error & { response?: any }): SuperTest.Test;
  ignoreCodes: (
    codes: number[]
  ) => (this: SuperTest.Test, err: Error & { response?: SuperTest.Response }) => SuperTest.Test;
}

/**
 * Creates a logger that can be used with `supertest` to log details around errors
 *
 * @param log
 *
 * @example
 * const errorLogger = createSupertestErrorLogger(log);
 * supertestWithoutAuth
 *    .post(`some/url`)
 *    .on('error', errorLogger) //<< Add logger to `error` event
 *    .send({})
 */
export const createSupertestErrorLogger = (log: ToolingLog): LogErrorDetailsInterface => {
  /**
   * Utility for use with `supertest` that logs errors with details returned by the API
   * @param err
   */
  const logErrorDetails: LogErrorDetailsInterface = function (err) {
    if (err.response && (err.response.body || err.response.text)) {
      let outputData =
        'RESPONSE:\n' + err.response.body
          ? JSON.stringify(err.response.body, null, 2)
          : err.response.text;

      if (err.response.request) {
        const { url = '', method = '', _data = '' } = err.response.request;

        outputData += `\nREQUEST:
  ${method}  ${url}
  ${JSON.stringify(_data, null, 2)}
  `;
      }

      log.error(outputData);
    }

    return this ?? err;
  };
  logErrorDetails.ignoreCodes = (codes) => {
    return function (err) {
      if (err.response && err.response.status && !codes.includes(err.response.status)) {
        return logErrorDetails.call(this, err);
      }
      return this;
    };
  };

  return logErrorDetails;
};
