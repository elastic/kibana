/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BURN_RATE_EXECUTOR_SPAN_NAMES = {
  LOAD_DEFINITION: 'slo_burn_rate_executor:load_definition',
  EVAL: 'slo_burn_rate_executor:eval',
  EVAL_DEPENDENCIES: 'slo_burn_rate_executor:eval_dependencies',
  ACTION_DISPATCH: 'slo_burn_rate_executor:action_dispatch',
  ES_QUERY: 'slo_burn_rate_executor:es_query',
} as const;
