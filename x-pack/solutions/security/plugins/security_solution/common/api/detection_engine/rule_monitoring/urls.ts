/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_DETECTION_ENGINE_URL as INTERNAL_URL } from '../../../constants';

// -------------------------------------------------------------------------------------------------
// Detection Engine health API

/**
 * Get health overview of the whole cluster. Scope: all detection rules in all Kibana spaces.
 * See the corresponding route handler for more details.
 */
export const GET_CLUSTER_HEALTH_URL = `${INTERNAL_URL}/health/_cluster` as const;

/**
 * Get health overview of the current Kibana space. Scope: all detection rules in the space.
 * See the corresponding route handler for more details.
 */
export const GET_SPACE_HEALTH_URL = `${INTERNAL_URL}/health/_space` as const;

/**
 * Get health overview of a rule. Scope: a given detection rule in the current Kibana space.
 * See the corresponding route handler for more details.
 */
export const GET_RULE_HEALTH_URL = `${INTERNAL_URL}/health/_rule` as const;

/**
 * Similar to the "setup" command of beats, this endpoint installs resources
 * (dashboards, data views, etc) related to rule monitoring and Detection Engine health,
 * and can do any other setup work.
 */
export const SETUP_HEALTH_URL = `${INTERNAL_URL}/health/_setup` as const;

// -------------------------------------------------------------------------------------------------
// Rule execution logs API

/**
 * Get plain individual rule execution events, such as status changes, execution metrics,
 * log messages, etc.
 */
export const GET_RULE_EXECUTION_EVENTS_URL =
  `${INTERNAL_URL}/rules/{ruleId}/execution/events` as const;
export const getRuleExecutionEventsUrl = (ruleId: string) =>
  `${INTERNAL_URL}/rules/${ruleId}/execution/events` as const;

/**
 * Get aggregated rule execution results. Each result object is built on top of all individual
 * events logged during the corresponding rule execution.
 */
export const GET_RULE_EXECUTION_RESULTS_URL =
  `${INTERNAL_URL}/rules/{ruleId}/execution/results` as const;
export const getRuleExecutionResultsUrl = (ruleId: string) =>
  `${INTERNAL_URL}/rules/${ruleId}/execution/results` as const;
