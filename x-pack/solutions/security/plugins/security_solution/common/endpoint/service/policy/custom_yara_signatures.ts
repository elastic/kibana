/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Advanced policy keys gated behind the Custom YARA Signatures feature. */
export const CUSTOM_YARA_SIGNATURES_ADVANCED_KEYS: ReadonlySet<string> = new Set([
  'linux.advanced.memory_protection.user_yara_rescan_interval_seconds',
  'mac.advanced.memory_protection.user_yara_rescan_interval_seconds',
  'windows.advanced.memory_protection.user_yara_rescan_interval_seconds',
]);
