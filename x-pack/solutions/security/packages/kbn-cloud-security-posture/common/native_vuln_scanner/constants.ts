/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NATIVE_VULN_SCANNER_API_BASE_PATH = '/internal/native_vuln_scanner';
export const NATIVE_VULN_SCANNER_API_VERSION = '1';

/** `vulnerability.scanner.vendor` of every finding the native scanner writes. */
export const NATIVE_VULN_SCANNER_VENDOR = 'Elastic native scanner';

export const ONBOARDING_STATUS_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/onboarding/status`;
export const ONBOARDING_PLAN_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/onboarding/plan`;
export const ONBOARDING_RUNTIME_PIN_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/onboarding/runtime_pin`;
export const ONBOARDING_SCHEDULE_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/onboarding/schedule`;
export const SCAN_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/scan`;
export const KNOWLEDGE_PATH = `${NATIVE_VULN_SCANNER_API_BASE_PATH}/knowledge/{knowledge_id}`;

/**
 * Ids of the vendor-text docs: `cve:<source>:<release>:<CVE>` and `adv:<source>:<release>:<advisory>`.
 * The release is in the id because two releases of one vendor carry different text for a CVE.
 */
export const KNOWLEDGE_ID_PATTERN =
  '^(cve|adv):(ubuntu|redhat):[a-z0-9-]{1,16}:[A-Za-z0-9:._-]{1,64}$';
/** Longest possible id under {@link KNOWLEDGE_ID_PATTERN} (3+1+6+1+16+1+64). */
export const KNOWLEDGE_ID_MAX_LENGTH = 92;
export const MAX_KNOWLEDGE_ADVISORIES = 20;

/**
 * Id-safe form of an OS release (`noble`, `9`, `10`). Ubuntu codenames and RHEL majors are
 * already in this alphabet; anything else is folded so an id never carries a separator.
 */
export const knowledgeReleaseToken = (release: string): string =>
  release
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16) || 'unknown';

/** The API privilege of the CNVM read routes, which the flyout's callers already hold. */
export const CLOUD_SECURITY_POSTURE_READ_PRIVILEGE = 'cloud-security-posture-read';

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
