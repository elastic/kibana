/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type {
  ClusterHealthParameters,
  ClusterHealthSnapshot,
  RuleHealthParameters,
  RuleHealthSnapshot,
  SpaceHealthParameters,
  SpaceHealthSnapshot,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { RULE_SAVED_OBJECT_TYPE } from '../../event_log/event_log_constants';
import { DETECTION_RULES_FILTER } from './filters';
import {
  getClusterHealthAggregation,
  normalizeClusterHealthAggregationResult,
} from './aggregations/health_stats_for_cluster';
import {
  getSpaceHealthAggregation,
  normalizeSpaceHealthAggregationResult,
} from './aggregations/health_stats_for_space';
import { fetchRuleById } from './fetch_rule_by_id';

/**
 * Client for calculating health stats based on rule objects (saved objects of type "alert").
 */
export interface IRuleObjectsHealthClient {
  /**
   * Returns health stats for a given rule in the current Kibana space.
   * Calculates the stats based on rule objects.
   */
  calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealth>;

  /**
   * Returns health stats for all rules in the current Kibana space.
   * Calculates the stats based on rule objects.
   */
  calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth>;

  /**
   * Returns health stats for all rules in all existing Kibana spaces (the whole cluster).
   * Calculates the stats based on rule objects.
   */
  calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth>;
}

type RuleHealth = Pick<RuleHealthSnapshot, 'state_at_the_moment' | 'debug'>;
type SpaceHealth = Pick<SpaceHealthSnapshot, 'state_at_the_moment' | 'debug'>;
type ClusterHealth = Pick<ClusterHealthSnapshot, 'state_at_the_moment' | 'debug'>;

export const createRuleObjectsHealthClient = (
  rulesClient: RulesClientApi,
  internalSavedObjectsClient: SavedObjectsClientContract,
  logger: Logger
): IRuleObjectsHealthClient => {
  return {
    async calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealth> {
      const rule = await fetchRuleById(rulesClient, args.rule_id);
      return {
        state_at_the_moment: { rule },
        debug: {},
      };
    },

    async calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth> {
      const aggs = getSpaceHealthAggregation();
      const aggregations = await rulesClient.aggregate({
        options: {
          filter: DETECTION_RULES_FILTER, // make sure to query only detection rules
        },
        aggs,
      });

      return {
        state_at_the_moment: normalizeSpaceHealthAggregationResult(aggregations),
        debug: {
          rulesClient: {
            request: { aggs },
            response: { aggregations },
          },
        },
      };
    },

    async calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth> {
      const aggs = getClusterHealthAggregation();
      const response = await internalSavedObjectsClient.find<unknown, Record<string, unknown>>({
        type: RULE_SAVED_OBJECT_TYPE, // query rules
        filter: DETECTION_RULES_FILTER, // make sure to query only detection rules
        namespaces: ['*'], // aggregate rules in all Kibana spaces
        perPage: 0, // don't return rules in the response, we only need aggs
        aggs,
      });

      return {
        state_at_the_moment: normalizeClusterHealthAggregationResult(response.aggregations),
        debug: {
          savedObjectsClient: {
            request: { aggs },
            response,
          },
        },
      };
    },
  };
};
