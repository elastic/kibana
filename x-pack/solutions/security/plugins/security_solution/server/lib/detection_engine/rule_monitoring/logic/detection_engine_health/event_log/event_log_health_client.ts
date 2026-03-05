/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type {
  ClusterHealthParameters,
  HealthInterval,
  RuleHealthParameters,
  SpaceHealthParameters,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';

import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import * as f from '../../event_log/event_log_fields';
import {
  ALERTING_PROVIDER,
  RULE_EXECUTION_LOG_PROVIDER,
  RULE_SAVED_OBJECT_TYPE,
} from '../../event_log/event_log_constants';
import { kqlOr } from '../../utils/kql';
import type { IRuleSpacesClient } from '../rule_spaces/rule_spaces_client';
import {
  normalizeRuleHealthAggregationResult,
  normalizeSpacesHealthAggregationResult,
} from './normalizers';
import { getRuleHealthAggregation } from './aggregations/health_stats_for_rule';
import { getSpacesHealthAggregation } from './aggregations/get_spaces_health_aggregation';
import type { HealthOverInterval, SpaceHealthOverInterval } from './aggregations/types';

/**
 * Client for calculating health stats based on events in .kibana-event-log-* index.
 */
export interface IEventLogHealthClient {
  /**
   * Returns health stats for a given rule in the current Kibana space.
   * Calculates the stats based on events in .kibana-event-log-* index.
   */
  calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealth>;

  /**
   * Returns health stats for all rules in the current Kibana space.
   * Calculates the stats based on events in .kibana-event-log-* index.
   */
  calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth>;

  /**
   * Returns health stats for all rules in all existing Kibana spaces (the whole cluster).
   * Calculates the stats based on events in .kibana-event-log-* index.
   */
  calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth>;
}

type RuleHealth = HealthOverInterval;
type SpaceHealth = SpaceHealthOverInterval;
type ClusterHealth = SpaceHealthOverInterval;

export const createEventLogHealthClient = (
  eventLog: IEventLogClient,
  ruleSpacesClient: IRuleSpacesClient
): IEventLogHealthClient => {
  const EVENT_PROVIDERS = [RULE_EXECUTION_LOG_PROVIDER, ALERTING_PROVIDER];
  const EVENT_PROVIDERS_FILTER = `${f.EVENT_PROVIDER}: (${kqlOr(EVENT_PROVIDERS)})`;

  const aggregateEventsForRules = (
    ruleIds: string[],
    interval: HealthInterval,
    aggs: Record<string, estypes.AggregationsAggregationContainer>
  ) => {
    return withSecuritySpan('IEventLogHealthClient.aggregateEventsForRules', async () => {
      const soType = RULE_SAVED_OBJECT_TYPE;
      const soIds = ruleIds;

      return eventLog.aggregateEventsBySavedObjectIds(soType, soIds, {
        start: interval.from,
        end: interval.to,
        filter: EVENT_PROVIDERS_FILTER,
        aggs,
      });
    });
  };

  const aggregateEventsForSpaces = (
    spaceIds: string[],
    interval: HealthInterval,
    aggs: Record<string, estypes.AggregationsAggregationContainer>
  ) => {
    return withSecuritySpan('IEventLogHealthClient.aggregateEventsForSpaces', async () => {
      const soType = RULE_SAVED_OBJECT_TYPE;
      const authFilter = {} as KueryNode;

      // The `aggregateEventsWithAuthFilter` method accepts "namespace ids" instead of "space ids".
      // If you have two Kibana spaces with ids ['default', 'space-x'],
      // it will only work properly if you pass [undefined, 'space-x'].
      const namespaces = spaceIds.map((spaceId) => SavedObjectsUtils.namespaceStringToId(spaceId));

      return eventLog.aggregateEventsWithAuthFilter(
        soType,
        authFilter,
        {
          start: interval.from,
          end: interval.to,
          filter: EVENT_PROVIDERS_FILTER,
          aggs,
        },
        namespaces
      );
    });
  };

  return {
    calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealth> {
      return withSecuritySpan('IEventLogHealthClient.calculateRuleHealth', async () => {
        const { rule_id: ruleId, interval } = args;

        const aggs = getRuleHealthAggregation(interval.granularity);
        const result = await aggregateEventsForRules([ruleId], interval, aggs);
        return normalizeRuleHealthAggregationResult(result, aggs);
      });
    },

    calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth> {
      return withSecuritySpan('IEventLogHealthClient.calculateSpaceHealth', async () => {
        const { interval, num_of_top_rules: numOfTopRules } = args;

        const spaceIds = [ruleSpacesClient.getCurrentSpaceId()];

        const aggs = getSpacesHealthAggregation(interval.granularity, numOfTopRules);
        const result = await aggregateEventsForSpaces(spaceIds, interval, aggs);
        return normalizeSpacesHealthAggregationResult(result, aggs);
      });
    },

    calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth> {
      return withSecuritySpan('IEventLogHealthClient.calculateClusterHealth', async () => {
        const { interval, num_of_top_rules: numOfTopRules } = args;

        const spaceIds = await ruleSpacesClient.getAllSpaceIds();

        const aggs = getSpacesHealthAggregation(interval.granularity, numOfTopRules);
        const result = await aggregateEventsForSpaces(spaceIds, interval, aggs);
        return normalizeSpacesHealthAggregationResult(result, aggs);
      });
    },
  };
};
