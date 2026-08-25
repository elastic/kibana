/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Advanced policy settings that control the Endpoint's artifact trust anchor and download source.
 * Changing any of these redirects artifact downloads to an attacker-controlled server or replaces
 * the key used to verify the manifest signature, enabling fleet-wide tampering by a non-superuser.
 * Writing these fields requires the superuser/admin tier (`canWriteAdminData`).
 */
export const PROTECTED_ARTIFACT_SETTING_SUFFIXES = [
  'artifacts.global.public_key',
  'artifacts.global.base_url',
  'artifacts.global.manifest_relative_url',
  'artifacts.global.ca_cert',
  'artifacts.global.proxy_url',
  'artifacts.global.proxy_disable',
  'artifacts.user.public_key',
  'artifacts.user.ca_cert',
  'artifacts.user.proxy_url',
  'artifacts.user.proxy_disable',
] as const;

/**
 * Fully-qualified PolicyConfig dotted paths for all protected artifact settings,
 * e.g. `windows.advanced.artifacts.global.public_key`.
 * Used by both the server-side validation handler and the UI schema to gate these fields.
 */
export const PROTECTED_POLICY_SETTING_PATHS: readonly string[] = (
  ['windows', 'mac', 'linux'] as const
).flatMap((os) => PROTECTED_ARTIFACT_SETTING_SUFFIXES.map((suffix) => `${os}.advanced.${suffix}`));
