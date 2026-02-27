/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lab-only domain variants (`.lab` TLD) for safe local environments.
 * Avoids accidental interaction with real infrastructure.
 */
export const REF7707_DOMAINS: string[] = [
  'poster.checkponit.lab',
  'support.fortineat.lab',
  'update.hobiter.lab',
  'support.vmphere.lab',
  'cloud.autodiscovar.lab',
  'digert.ictnsc.lab',
];

/**
 * Real-world-like domain variants (`.com` TLD) from the Elastic Security Labs
 * REF7707 report (Fragile Web). Used in detection rules and browser history injection.
 *
 * Reference: https://www.elastic.co/security-labs/fragile-web-ref7707
 */
export const REF7707_DEMO_DOMAINS: string[] = [
  'poster.checkponit.com',
  'support.fortineat.com',
  'update.hobiter.com',
  'support.vmphere.com',
  'cloud.autodiscovar.com',
  'digert.ictnsc.com',
];
