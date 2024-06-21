/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const VULNERABILITIES_LATEST_INDEX =
  'logs-cloud_security_posture.vulnerabilities_latest-default';
export const VULNERABILITIES_INDEX_DEFAULT_NS =
  'logs-cloud_security_posture.vulnerabilities-default';
export const BENCHMARK_SCORES_INDEX = 'logs-cloud_security_posture.scores-default';
export const FINDINGS_INDEX = 'logs-cloud_security_posture.findings-default';
export const FINDINGS_LATEST_INDEX = 'logs-cloud_security_posture.findings_latest-default';

export const INDEX_ARRAY = [
  FINDINGS_INDEX,
  FINDINGS_LATEST_INDEX,
  VULNERABILITIES_LATEST_INDEX,
  VULNERABILITIES_INDEX_DEFAULT_NS,
];
