/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NATIVE_VULN_SCANNER_API_BASE_PATH = '/internal/native_vuln_scanner';
export const NATIVE_VULN_SCANNER_API_VERSION = '1';

export const ONBOARDING_STATUS_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/onboarding/status`;
export const ONBOARDING_PLAN_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/onboarding/plan`;
export const ONBOARDING_RUNTIME_PIN_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/onboarding/runtime_pin`;
export const ONBOARDING_SCHEDULE_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/onboarding/schedule`;
export const SCAN_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/scan`;

/**
 * Fleet's own API privileges (`FLEET_API_PRIVILEGES.AGENT_POLICIES`). Fleet does not export them,
 * and this plugin adds no privilege of its own: onboarding edits agent policies.
 */
export const FLEET_AGENT_POLICIES_READ_PRIVILEGE = 'fleet-agent-policies-read';
export const FLEET_AGENT_POLICIES_ALL_PRIVILEGE = 'fleet-agent-policies-all';

/** Machine-readable `attributes.code` of the error responses. */
export const ErrorCode = {
  LicenseRequired: 'LICENSE_REQUIRED',
  ScanInProgress: 'SCAN_IN_PROGRESS',
  ScheduleDisabled: 'SCHEDULE_DISABLED',
  WorkflowNotInstalled: 'WORKFLOW_NOT_INSTALLED',
  WorkflowInvalid: 'WORKFLOW_INVALID',
  FleetUnavailable: 'FLEET_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const MAX_POLICY_IDS = 100;
export const MAX_POLICY_ID_LENGTH = 256;

/**
 * Id of the managed workflow that runs a scan. Mirrors `NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID` in
 * `@kbn/workflows/managed`, which is server-only (it reads YAML from disk) and cannot be imported
 * by browser code.
 */
export const NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID = 'system-security-native-vuln-scan';
