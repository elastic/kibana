/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

/**
 * The audit-failure-class spec runs every scenario in three input variants (baseline, enriched,
 * enriched_context; 15 examples) per model and is not part of the default suite run (the weekly
 * CI invokes the whole suite): set EVAL_AUDIT_FAILURE_CLASSES=1 to include it.
 */
const AUDIT_SPEC = '**/audit_failure_classes.spec.ts';
const includeAuditFailureClasses = process.env.EVAL_AUDIT_FAILURE_CLASSES === '1';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  timeout: 30 * 60_000,
  ...(includeAuditFailureClasses ? {} : { testIgnore: AUDIT_SPEC }),
});
