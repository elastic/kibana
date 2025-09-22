/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Core security modules supported across all Resolver functionality.
 * This is the source of truth for security modules used by both schema detection
 * and event filtering to avoid duplication.
 *
 * These modules correspond to the integrations that can provide security events
 * for resolver analysis and need to be consistently filtered across queries.
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
export const MICROSOFT_DEFENDER_MODULES = [
  'microsoft_defender_endpoint',
  'm365_defender',
] as const;

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
    'jamf_protect.web-traffic-events'
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
    const moduleDatasets = SECURITY_MODULE_DATASETS[module as keyof typeof SECURITY_MODULE_DATASETS];
    if (moduleDatasets) {
      datasets.push(...moduleDatasets);
    }
  });

  return datasets;
}