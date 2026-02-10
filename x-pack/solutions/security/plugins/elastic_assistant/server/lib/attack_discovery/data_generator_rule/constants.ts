/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Dev-only rule type used by the Security Solution data generator.
 *
 * This rule persists Attack Discoveries as Alerts-as-Data via the alerting framework `alertsClient`,
 * so we do not need to manually construct and bulk-index alert documents into dot-prefixed indices.
 */
export const ATTACK_DISCOVERY_DATA_GENERATOR_RULE_TYPE_ID =
  'security.attack_discovery.data_generator' as const;
