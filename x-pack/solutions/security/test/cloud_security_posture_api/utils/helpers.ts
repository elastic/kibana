/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { Agent } from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CallbackHandler, Response } from 'superagent';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import expect from '@kbn/expect';

/**
 * Checks if plugin initialization was done
 * Required before indexing findings
 */
export const waitForPluginInitialized = ({
  retry,
  logger,
  supertest,
}: {
  retry: RetryService;
  logger: ToolingLog;
  supertest: Pick<Agent, 'get'>;
}): Promise<void> =>
  retry.try(async () => {
    logger.debug('Check CSP plugin is initialized');
    const response = await supertest
      .get('/internal/cloud_security_posture/status?check=init')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .expect(200);
    expect(response.body).to.eql({ isPluginInitialized: true });
    logger.debug('CSP plugin is initialized');
  });

export function result(status: number, logger?: ToolingLog): CallbackHandler {
  return (err: any, res: Response) => {
    if ((res?.status || err.status) !== status) {
      throw new Error(
        `Expected ${status} ,got ${res?.status || err.status} resp: ${
          res?.body ? JSON.stringify(res.body) : err.text
        }`
      );
    } else if (err) {
      logger?.warning(`Error result ${err.text}`);
    }
  };
}
