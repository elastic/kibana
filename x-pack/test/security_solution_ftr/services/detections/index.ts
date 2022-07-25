/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Response } from 'superagent';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '@kbn/security-solution-plugin/common/constants';
import { estypes } from '@elastic/elasticsearch';
import { FtrService } from '../../../functional/ftr_provider_context';

export class DetectionsTestService extends FtrService {
  private readonly supertest = this.ctx.getService('supertest');
  private readonly retry = this.ctx.getService('retry');
  private readonly config = this.ctx.getService('config');
  private readonly defaultTimeout = this.config.get('timeouts.waitFor');

  /**
   * Returns an error handler for `supertest` request that will dump out more useful information
   * when things fail.
   *
   * @param ignoredStatusCodes
   * @private
   *
   * @example
   *
   * await this.supertest
   *    .post('/some/api')
   *    .set('kbn-xsrf', 'true')
   *    .send(somePayLoad)
   *    .then(this.getHttpResponseFailureHandler([409]));
   */
  private getHttpResponseFailureHandler(
    ignoredStatusCodes: number[] = []
  ): (res: Response) => Promise<Response> {
    return async (res) => {
      if (!res.ok && !ignoredStatusCodes.includes(res.status)) {
        throw new EndpointError(JSON.stringify(res.error, null, 2));
      }

      return res;
    };
  }

  /**
   * Waits for alerts to have been loaded into `.alerts-security.alerts-default` index
   */
  async waitForAlerts() {
    await this.retry.waitForWithTimeout(
      'Checking alerts index for data',
      this.defaultTimeout,
      async (): Promise<boolean> => {
        const res = await this.supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send({
            query: {
              match_all: {},
            },
            size: 1,
          })
          .then(this.getHttpResponseFailureHandler())
          .then((response) => response.body as estypes.SearchResponse);

        return Boolean((res.hits.total as estypes.SearchTotalHits)?.value ?? 0);
      }
    );
  }
}
