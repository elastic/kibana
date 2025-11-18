/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * # Security Module Extension Guide
 *
 * This file provides a centralized system for managing security modules and their datasets
 * across the Resolver system. All security integrations should be defined here to ensure
 * consistency between schema detection and event filtering.
 *
 * ## Adding a New Security Module
 *
 * To add a new security module integration to Resolver:
 *
 * ### 1. Core Module (Always Enabled)
 *
 * For modules that should always be available:
 *
 * ```typescript
 * export const CORE_SECURITY_MODULES = [
 *   'crowdstrike',
 *   'jamf_protect',
 *   'sentinel_one',
 *   'sentinel_one_cloud_funnel',
 *   'new_security_module', // Add your module here
 * ] as const;
 * ```
 *
 * ### 2. Feature-Flagged Module (Conditional)
 *
 * For modules that require experimental feature flags:
 *
 * ```typescript
 * export const MICROSOFT_DEFENDER_MODULES = [
 *   'microsoft_defender_endpoint',
 *   'm365_defender',
 *   'new_experimental_module', // Add experimental module here
 * ] as const;
 * ```
 *
 * ### 3. Dataset Mapping
 *
 * Add the module's dataset mappings:
 *
 * ```typescript
 * export const SECURITY_MODULE_DATASETS = {
 *   // ... existing mappings
 *   new_security_module: [
 *     'new_security_module.alerts',
 *     'new_security_module.events',
 *     'new_security_module.incidents'
 *   ],
 * } as const;
 * ```
 *


 * ## Module Requirements
 *
 * For a security module to work with Resolver:
 *
 * - **Must set `event.kind`**: Either `"event"` or `"signal"`
 * - **Must set `event.module`**: The module name (e.g., 'crowdstrike')
 * - **Process events**: Should include process tree fields for correlation
 * - **Index patterns**: Should be included in the appropriate Kibana index patterns
 *
 * ## Architecture Notes
 *
 * - **Single Source of Truth**: All modules defined in this file
 * - **Automatic Integration**: Schema detection and event filtering use the same definitions
 * - **Performance Optimized**: Event filtering only processes relevant security data
 * - **Feature Flag Ready**: Conditional module support through experimental features
 *

 /**
 * Core security modules supported across all Resolver functionality.
 * This is the source of truth for security modules used by both schema detection
 * and event filtering to avoid duplication.
 *
 * These modules correspond to the integrations that can provide security events
 * for resolver analysis and need to be consistently filtered across queries.
 *
 * Note: The native 'endpoint' module is intentionally excluded because it provides
 * foundational event data (event.kind: "event") that's essential for process tree
 * integrity. Native endpoint events are included unconditionally in resolver queries,
 * while this list is used to filter security signals (event.kind: "signal") from
 * third-party integrations to reduce noise.
 */
export const CORE_SECURITY_MODULES = [
  'crowdstrike',
  'jamf_protect',
  'sentinel_one',
  'sentinel_one_cloud_funnel',
] as const;

/**
 * Microsoft Defender modules that are conditionally enabled.
 * These modules are feature-flagged and may not always be available.
 */
export const MICROSOFT_DEFENDER_MODULES = ['microsoft_defender_endpoint', 'm365_defender'] as const;

/**
 * Security module dataset mappings for filebeat integrations.
 * Maps each security module to its supported data streams.
 */
export const SECURITY_MODULE_DATASETS = {
  crowdstrike: ['crowdstrike.alert', 'crowdstrike.falcon', 'crowdstrike.fdr'],
  jamf_protect: [
    'jamf_protect.telemetry',
    'jamf_protect.alerts',
    'jamf_protect.web-threat-events',
    'jamf_protect.web-traffic-events',
  ],
  sentinel_one: ['sentinel_one.alert'],
  sentinel_one_cloud_funnel: ['sentinel_one_cloud_funnel.event'],
  microsoft_defender_endpoint: ['microsoft_defender_endpoint.log'],
  m365_defender: ['m365_defender.alert', 'm365_defender.incident'],
} as const;

/**
 * Gets all security modules including both core and Microsoft Defender modules.
 * This provides the complete list for event filtering when all features are enabled.
 *
 * @returns Array of all supported security module names
 */
export function getAllSecurityModules(): string[] {
  return [...CORE_SECURITY_MODULES, ...MICROSOFT_DEFENDER_MODULES];
}

/**
 * Gets all supported filebeat datasets for the specified security modules.
 *
 * @param modules - Array of security module names to get datasets for
 * @returns Array of dataset names (e.g., ['crowdstrike.alert', 'sentinel_one.alert', ...])
 */
export function getSecurityModuleDatasets(modules: readonly string[]): string[] {
  const datasets: string[] = [];

  modules.forEach((module) => {
    const moduleDatasets =
      SECURITY_MODULE_DATASETS[module as keyof typeof SECURITY_MODULE_DATASETS];
    if (moduleDatasets) {
      datasets.push(...moduleDatasets);
    }
  });

  return datasets;
}
