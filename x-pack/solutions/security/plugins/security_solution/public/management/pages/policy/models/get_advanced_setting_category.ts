/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdvancedSettingCategory } from './advanced_policy_schema';

/**
 * Maps an advanced policy setting key to one of the PM-proposed categories
 * (Performance, Product Features, Logs, Configs, Others) for discoverability.
 * Uses key path patterns; can be replaced later with explicit category per schema entry.
 */
export function getCategory(key: string): AdvancedSettingCategory {
  const k = key;

  // Logs: logging configuration
  if (k.includes('.logging.')) {
    return 'logs';
  }

  // Configs: artifacts, elasticsearch, agent, event_filter, flags, proxy
  if (
    k.includes('.artifacts.') ||
    k.includes('.elasticsearch.') ||
    k.includes('.agent.') ||
    k.includes('.event_filter.') ||
    k.endsWith('.flags')
  ) {
    return 'configs';
  }

  // Performance: utilization, tty_io, file_cache, deduplicate, aggregate
  if (
    k.includes('.utilization_limits.') ||
    k.includes('.tty_io.') ||
    k.includes('.file_cache.') ||
    k.includes('deduplicate') ||
    k.includes('aggregate_')
  ) {
    return 'performance';
  }

  // Product Features: malware, ransomware, memory_protection, kernel, alerts, diagnostic,
  // device_control, harden, fanotify, host_isolation, mitigations, document_enrichment,
  // firewall, etc.
  if (
    k.includes('.malware.') ||
    k.includes('.ransomware.') ||
    k.includes('.memory_protection.') ||
    k.includes('.kernel.') ||
    k.includes('.alerts.') ||
    k.includes('.diagnostic.') ||
    k.includes('.device_control.') ||
    k.includes('.harden.') ||
    k.includes('.fanotify.') ||
    k.includes('.host_isolation.') ||
    k.includes('.mitigations.') ||
    k.includes('.document_enrichment.') ||
    k.includes('firewall_anti_tamper') ||
    k.includes('.events.') ||
    k.includes('.kernel.') ||
    k.includes('.ppl.') ||
    k.includes('dev_drives.')
  ) {
    return 'product_features';
  }

  return 'others';
}
