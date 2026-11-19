/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One summary doc per scan run. The name has to sit under `.kibana*`: the reserved
 * `kibana_system` role grants index-creation and write there, and nowhere a plugin could
 * otherwise pick (`security_solution-*.<name>`, `.native-vuln-scanner-*` and
 * `logs-native_vuln_scanner-*` all fail with `indices:admin/create is unauthorized`;
 * covered by `integration_tests/summary_index.test.ts`).
 */
export const SUMMARY_INDEX = '.kibana-native-vuln-scanner-runs';

export type {
  SummaryDoc,
  SummaryFeed,
  SummaryFeedStatus,
  SummaryRunStatus,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
