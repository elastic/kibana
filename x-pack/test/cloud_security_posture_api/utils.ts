/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { Agent } from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { CallbackHandler, Response } from 'superagent';
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

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

export class EsIndexDataProvider {
  private es: EsClient;
  private readonly index: string;

  constructor(es: EsClient, index: string) {
    this.es = es;
    this.index = index;
  }

  async addBulk(docs: Array<Record<string, any>>, overrideTimestamp = true) {
    const operations = docs.flatMap((doc) => [
      { create: { _index: this.index } },
      { ...doc, ...(overrideTimestamp ? { '@timestamp': new Date().toISOString() } : {}) },
    ]);

    const resp = await this.es.bulk({ refresh: 'wait_for', index: this.index, operations });
    expect(resp.errors).eql(false, `Error in bulk indexing: ${JSON.stringify(resp)}`);

    return resp;
  }

  async deleteAll() {
    const indexExists = await this.es.indices.exists({ index: this.index });

    if (indexExists) {
      return this.es.deleteByQuery({
        index: this.index,
        query: { match_all: {} },
        refresh: true,
      });
    }
  }

  async destroyIndex() {
    const indexExists = await this.es.indices.exists({ index: this.index });

    if (indexExists) {
      return this.es.indices.delete({ index: this.index });
    }
  }
}
