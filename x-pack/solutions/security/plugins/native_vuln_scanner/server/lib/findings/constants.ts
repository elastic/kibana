/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CDR_LATEST_NATIVE_SCANNER_VULNERABILITIES_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';

/**
 * Read alias, shared with the CNVM dashboard and detection-rule builders so they cannot drift.
 * It matches the CNVM UI pattern `security_solution-*.vulnerability_latest`.
 */
export const FINDINGS_ALIAS = CDR_LATEST_NATIVE_SCANNER_VULNERABILITIES_INDEX_PATTERN;

export const FINDINGS_INDEX_VERSION = 1;

/**
 * Concrete index every write targets. The `kibana_system` reserved role grants write
 * privileges only on `security_solution-*.vulnerability_latest-*`, not on the bare alias.
 */
export const FINDINGS_INDEX = `${FINDINGS_ALIAS}-${FINDINGS_INDEX_VERSION}`;

export const FINDINGS_INDEX_TEMPLATE = FINDINGS_ALIAS;

export const FINDINGS_DATASET = 'native_vuln_scanner.vulnerability';

export const FINDINGS_VENDOR = 'Elastic native scanner';

export type FindingState = 'new' | 'active' | 'fixed' | 'reopened' | 'unfixed';
