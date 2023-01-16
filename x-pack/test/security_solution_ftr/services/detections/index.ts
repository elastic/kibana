/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Response } from 'superagent';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { estypes } from '@elastic/elasticsearch';
import { Rule } from '@kbn/security-solution-plugin/public/detection_engine/rule_management/logic/types';
// @ts-expect-error we have to check types with "allowJs: false" for now, causing this import to fail
import { kibanaPackageJson } from '@kbn/repo-info';
import { wrapErrorIfNeeded } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/utils';
import { FtrService } from '../../../functional/ftr_provider_context';
import { EndpointRuleAlertGenerator } from './endpoint_rule_alert_generator';
import { getAlertsIndexMappings } from './alerts_security_index_mappings';
import { ELASTIC_SECURITY_RULE_ID } from '../../../detection_engine_api_integration/utils/create_prebuilt_rule_saved_objects';

export interface IndexedEndpointRuleAlerts {
  alerts: estypes.WriteResponseBase[];
  cleanup: () => Promise<void>;
}

export class DetectionsTestService extends FtrService {
  private readonly supertest = this.ctx.getService('supertest');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly config = this.ctx.getService('config');
  private readonly esClient = this.ctx.getService('es');
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

  private async ensureEndpointRuleAlertsIndexExists(): Promise<void> {
    const indexMappings = getAlertsIndexMappings().value;

    if (indexMappings.mappings?._meta?.kibana.version) {
      indexMappings.mappings._meta.kibana.version = kibanaPackageJson.version;
    }

    try {
      await this.esClient.indices.create({
        index: indexMappings.index,
        body: {
          settings: indexMappings.settings,
          mappings: indexMappings.mappings,
          aliases: indexMappings.aliases,
        },
      });
    } catch (error) {
      // ignore error that indicate index is already created
      if (
        ['resource_already_exists_exception', 'invalid_alias_name_exception'].includes(
          error?.body?.error?.type
        )
      ) {
        return;
      }

      throw wrapErrorIfNeeded(error);
    }
  }

  /**
   * Fetches the endpoint security rule using the pre-packaged `rule_id`
   */
  async fetchEndpointSecurityRule(): Promise<Rule> {
    return this.supertest
      .get(DETECTION_ENGINE_RULES_URL)
      .set('kbn-xsrf', 'true')
      .query({ rule_id: ELASTIC_SECURITY_RULE_ID })
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
   * Waits for alerts to have been loaded by continuously calling the alerts api until data shows up
   * @param query
   * @param timeoutMs
   */
  async waitForAlerts(query: object = { match_all: {} }, timeoutMs?: number): Promise<void> {
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

  /**
   * Loads alerts for Endpoint directly into the internal index that the Endpoint Rule
   * would have written them to for a given endpoint
   * @param endpointAgentId
   * @param count
   */
  async loadEndpointRuleAlerts(
    endpointAgentId: string,
    count: number = 2
  ): Promise<IndexedEndpointRuleAlerts> {
    this.log.info(`Loading ${count} endpoint rule alerts`);

    await this.ensureEndpointRuleAlertsIndexExists();

    const alertsGenerator = new EndpointRuleAlertGenerator();
    const esClient = this.esClient;
    const indexedAlerts: estypes.IndexResponse[] = [];

    for (let n = 0; n < count; n++) {
      const alert = alertsGenerator.generate({ agent: { id: endpointAgentId } });
      const indexedAlert = await esClient.index({
        index: `${DEFAULT_ALERTS_INDEX}-default`,
        refresh: 'wait_for',
        body: alert,
      });

      indexedAlerts.push(indexedAlert);
    }

    this.log.info(`Endpoint rule alerts created:`, indexedAlerts);

    return {
      alerts: indexedAlerts,
      cleanup: async (): Promise<void> => {
        if (indexedAlerts.length) {
          this.log.info('cleaning up loaded endpoint rule alerts');

          await esClient.bulk({
            body: indexedAlerts.map((indexedDoc) => {
              return {
                delete: {
                  _index: indexedDoc._index,
                  _id: indexedDoc._id,
                },
              };
            }),
          });

          this.log.info(
            `Deleted ${indexedAlerts.length} endpoint rule alerts. Ids: [${indexedAlerts
              .map((alert) => alert._id)
              .join()}]`
          );
        }
      },
    };
  }
}
