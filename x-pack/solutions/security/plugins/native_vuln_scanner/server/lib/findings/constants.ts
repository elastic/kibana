/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Read alias. It matches the CNVM UI pattern `security_solution-*.vulnerability_latest`, so
 * findings show up in the existing vulnerabilities page without UI changes.
 */
export const FINDINGS_ALIAS = 'security_solution-native.vulnerability_latest';

export const FINDINGS_INDEX_VERSION = 1;

/**
 * Concrete index every write targets. The `kibana_system` reserved role grants write
 * privileges only on `security_solution-*.vulnerability_latest-*`, not on the bare alias.
 */
export const FINDINGS_INDEX = `${FINDINGS_ALIAS}-${FINDINGS_INDEX_VERSION}`;

export const FINDINGS_INDEX_TEMPLATE = FINDINGS_ALIAS;

export const FINDINGS_DATASET = 'native_vuln_scanner.vulnerability';

export const FINDINGS_VENDOR = 'Elastic';

export type FindingState = 'new' | 'active' | 'fixed' | 'reopened';
