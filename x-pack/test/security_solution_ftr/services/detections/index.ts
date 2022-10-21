/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Response } from 'superagent';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { estypes } from '@elastic/elasticsearch';
import endpointPrePackagedRule from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/content/prepackaged_rules/elastic_endpoint_security.json';
import { Rule } from '@kbn/security-solution-plugin/public/detection_engine/rule_management/logic/types';
import { FtrService } from '../../../functional/ftr_provider_context';

export class DetectionsTestService extends FtrService {
  private readonly supertest = this.ctx.getService('supertest');
  private readonly log = this.ctx.getService('log');
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
   * Fetches the endpoint security rule using the pre-packaged `rule_id`
   */
  async fetchEndpointSecurityRule(): Promise<Rule> {
    return this.supertest
      .get(DETECTION_ENGINE_RULES_URL)
      .set('kbn-xsrf', 'true')
      .query({ rule_id: endpointPrePackagedRule.rule_id })
      .send()
      .then(this.getHttpResponseFailureHandler())
      .then((response) => response.body as Rule);
  }

  /**
   * Disables and then re-enables the Endpoint Security Rule. Use this to speed up triggering
   * the rule to run, since it is immediately ran when it is enabled.
   */
  async stopStartEndpointRule(): Promise<void> {
    const endpointSecurityRule = await this.fetchEndpointSecurityRule();

    // First disable/stop it
    this.log.info(`Disabling Endpoint Security Rule (id: ${endpointSecurityRule.id})`);

    await this.supertest
      .post(DETECTION_ENGINE_RULES_BULK_ACTION)
      .set('kbn-xsrf', 'true')
      .send({
        action: 'disable',
        ids: [endpointSecurityRule.id],
      })
      .then(this.getHttpResponseFailureHandler())
      .then((response) => response.body as Rule);

    // Now enable/start it
    this.log.info(`Re-Enabling Endpoint Security Rule (id: ${endpointSecurityRule.id})`);

    await this.supertest
      .post(DETECTION_ENGINE_RULES_BULK_ACTION)
      .set('kbn-xsrf', 'true')
      .send({
        action: 'enable',
        ids: [endpointSecurityRule.id],
      })
      .then(this.getHttpResponseFailureHandler())
      .then((response) => response.body as Rule);
  }

  /**
   * Waits for alerts to have been loaded into `.alerts-security.alerts-default` index
   * @param query
   */
  async waitForAlerts(query: object = { match_all: {} }, timeoutMs?: number) {
    await this.retry.waitForWithTimeout(
      'Checking alerts index for data',
      timeoutMs ?? this.defaultTimeout,
      async (): Promise<boolean> => {
        const res = await this.supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send({
            query,
            size: 1,
          })
          .then(this.getHttpResponseFailureHandler())
          .then((response) => response.body as estypes.SearchResponse);

        const hitsTotal = (res.hits.total as estypes.SearchTotalHits)?.value;
        const response = Boolean(hitsTotal ?? 0);

        if (response) {
          this.log.info(`Found ${hitsTotal} alerts for query: ${JSON.stringify(query)}`);
        }

        return response;
      }
    );
  }
}
