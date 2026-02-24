/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default domain set is intentionally **lab-only** (not the real-world domains).
 *
 * Rationale:
 * - avoids accidental interaction with real infrastructure
 * - keeps the lab safe-by-default
 * - still provides campaign-like typosquat structure for investigation pivots
 *
 * These domains are resolved by the lab DNS server (`dns-vm`) to `web-vm`.
 */
export const REF7707_DOMAINS: string[] = [
  'poster.checkponit.lab',
  'support.fortineat.lab',
  'update.hobiter.lab',
  'support.vmphere.lab',
  'cloud.autodiscovar.lab',
  'digert.ictnsc.lab',
];

export const DEFAULT_WEB_PORT = 8080;

/**
 * Real-world-like domain variants (`.com` TLD) for detection rules and browser history injection.
 * These are NOT resolved by lab DNS -- they exist purely to trigger detection rules and
 * to be injected into browser history for forensic investigation demos.
 */
export const REF7707_DEMO_DOMAINS: string[] = [
  'poster.checkponit.com',
  'support.fortineat.com',
  'update.hobiter.com',
  'support.vmphere.com',
  'cloud.autodiscovar.com',
  'digert.ictnsc.com',
];
