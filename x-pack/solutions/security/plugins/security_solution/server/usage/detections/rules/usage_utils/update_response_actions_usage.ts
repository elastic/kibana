/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsUsage, RuleMetric, FeatureTypeUsage } from '../types';

export interface UpdateResponseActionsUsage {
  detectionRuleMetric: RuleMetric;
  usage: FeatureTypeUsage;
}

export const updateResponseActionsUsage = ({
  detectionRuleMetric,
  usage,
}: UpdateResponseActionsUsage): ResponseActionsUsage => {
  const areResponseActionsConfigured = detectionRuleMetric.has_response_actions;

  // if rule does not have response actions configured
  // returned unchanged
  if (!areResponseActionsConfigured) {
    return usage.response_actions;
  }

  return {
    enabled: detectionRuleMetric.enabled
      ? usage.response_actions.enabled + 1
      : usage.response_actions.enabled,
    disabled: !detectionRuleMetric.enabled
      ? usage.response_actions.disabled + 1
      : usage.response_actions.disabled,
    response_actions: {
      endpoint: detectionRuleMetric.has_response_actions_endpoint
        ? usage.response_actions.response_actions.endpoint + 1
        : usage.response_actions.response_actions.endpoint,
      osquery: detectionRuleMetric.has_response_actions_osquery
        ? usage.response_actions.response_actions.osquery + 1
        : usage.response_actions.response_actions.osquery,
    },
  };
};
