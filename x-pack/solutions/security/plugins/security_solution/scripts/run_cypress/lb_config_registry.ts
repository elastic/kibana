/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoadBalancerConfig } from './utils';
import { SECURITY_SOLUTION_LOAD_BALANCER_CONFIG } from './security_solution_config';

/**
 * Registry that maps Buildkite JOB names to their LoadBalancerConfig.
 * Each Cypress suite shell script sets `export JOB=<name>`, which this
 * registry uses to select the right config at runtime.
 *
 * Suites without a registered config fall back to the generic weight-based
 * sort (counting `it()` calls) with no dynamic runner detection.
 */
const CONFIG_REGISTRY: Record<string, LoadBalancerConfig> = {
  'kibana-security-solution-chrome': SECURITY_SOLUTION_LOAD_BALANCER_CONFIG,
};

/**
 * Resolve the LoadBalancerConfig for the current CI job.
 * Returns undefined when no suite-specific config is registered,
 * causing the runner to fall back to generic weight-based ordering.
 */
export const resolveLoadBalancerConfig = (): LoadBalancerConfig | undefined => {
  const job = process.env.JOB;
  if (!job) return undefined;

  return CONFIG_REGISTRY[job];
};
