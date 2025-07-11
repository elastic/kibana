/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EventLogStatusMetric,
  MaxAvgMin,
  RulesTypeUsage,
  SingleEventLogStatusMetric,
  SingleEventMetric,
  AlertSuppressionUsage,
  SpacesUsage,
  FeatureTypeUsage,
  ResponseActionsUsage,
  UpgradeableRulesSummary,
} from './types';

export const initialAlertSuppression: AlertSuppressionUsage = {
  enabled: 0,
  disabled: 0,
  suppressed_per_time_period: 0,
  suppressed_per_rule_execution: 0,
  suppressed_fields_count: {
    one: 0,
    two: 0,
    three: 0,
  },
  suppresses_missing_fields: 0,
  does_not_suppress_missing_fields: 0,
};

export const initialResponseActionsUsage: ResponseActionsUsage = {
  enabled: 0,
  disabled: 0,
  response_actions: {
    endpoint: 0,
    osquery: 0,
  },
};

export const getInitialSpacesUsage = (): SpacesUsage => ({
  total: 0,
  rules_in_spaces: [],
});

export const getInitialFeatureTypeUsage = (): FeatureTypeUsage => ({
  enabled: 0,
  disabled: 0,
  alerts: 0,
  cases: 0,
  legacy_notifications_enabled: 0,
  legacy_notifications_disabled: 0,
  notifications_enabled: 0,
  notifications_disabled: 0,
  legacy_investigation_fields: 0,
  alert_suppression: initialAlertSuppression,
  response_actions: initialResponseActionsUsage,
  has_exceptions: 0,
});

/**
 * Default detection rule usage count, split by type + elastic/custom
 */
export const getInitialRulesUsage = (): RulesTypeUsage => ({
  query: getInitialFeatureTypeUsage(),
  query_custom: getInitialFeatureTypeUsage(),
  threshold: getInitialFeatureTypeUsage(),
  threshold_custom: getInitialFeatureTypeUsage(),
  eql: getInitialFeatureTypeUsage(),
  eql_custom: getInitialFeatureTypeUsage(),
  machine_learning: getInitialFeatureTypeUsage(),
  machine_learning_custom: getInitialFeatureTypeUsage(),
  threat_match: getInitialFeatureTypeUsage(),
  threat_match_custom: getInitialFeatureTypeUsage(),
  new_terms: getInitialFeatureTypeUsage(),
  new_terms_custom: getInitialFeatureTypeUsage(),
  esql: getInitialFeatureTypeUsage(),
  esql_custom: getInitialFeatureTypeUsage(),
  elastic_total: getInitialFeatureTypeUsage(),
  custom_total: getInitialFeatureTypeUsage(),
});

/**
 * Returns the initial usage of event logs specific to rules.
 * This returns them for all rules, custom rules, and "elastic_rules"/"immutable rules"/pre-packaged rules
 * @returns The initial event log usage
 */
export const getInitialEventLogUsage = (): EventLogStatusMetric => ({
  all_rules: getInitialSingleEventLogUsage(),
  custom_rules: getInitialSingleEventLogUsage(),
  elastic_rules: getInitialSingleEventLogUsage(),
});

/**
 * Returns the initial single event metric for a particular event log.
 * This returns the initial single event metric for either rules, custom rules, or "elastic_rules"/"immutable rules"/pre-packaged rules
 * @see getInitialEventLogUsage
 * @returns The initial event log usage for a single event metric.
 */
export const getInitialSingleEventLogUsage = (): SingleEventLogStatusMetric => ({
  eql: getInitialSingleEventMetric(),
  new_terms: getInitialSingleEventMetric(),
  esql: getInitialSingleEventMetric(),
  threat_match: getInitialSingleEventMetric(),
  machine_learning: getInitialSingleEventMetric(),
  query: getInitialSingleEventMetric(),
  saved_query: getInitialSingleEventMetric(),
  threshold: getInitialSingleEventMetric(),
  total: {
    failures: 0,
    partial_failures: 0,
    succeeded: 0,
  },
});

/**
 * Returns the initial single event metric.
 * This returns the initial single event metric for either rules, custom rules, or "elastic_rules"/"immutable rules"/pre-packaged rules
 * @see getInitialEventLogUsage
 * @returns The initial event log usage for a single event metric.
 */
export const getInitialSingleEventMetric = (): SingleEventMetric => ({
  failures: 0,
  top_failures: [],
  partial_failures: 0,
  top_partial_failures: [],
  succeeded: 0,
  index_duration: getInitialMaxAvgMin(),
  search_duration: getInitialMaxAvgMin(),
  enrichment_duration: getInitialMaxAvgMin(),
  gap_duration: getInitialMaxAvgMin(),
  gap_count: 0,
});

/**
 * Returns the max, avg, or min for an event.
 * This returns the max, avg, or min for a single event metric.
 * @see getInitialEventLogUsage
 * @returns The max, avg, or min.
 */
export const getInitialMaxAvgMin = (): MaxAvgMin => ({
  max: 0.0,
  avg: 0.0,
  min: 0.0,
});

export const getInitialRuleUpgradeStatus = (): UpgradeableRulesSummary => ({
  total: 0,
  customized: 0,
  enabled: 0,
  disabled: 0,
});
