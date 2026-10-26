/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0; you may not use this file except in compliance with the Elastic
 * License 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

/**
 * AlertZero onboarding e2e (plumbing-only; the stub `.gen-ai` connector is never
 * invoked, so no real model is required). This directory's name selects the
 * non-EIS `alertzero` config set, which pins the plugin flags the suite needs
 * (alertzero/agenticInvestigations/proposals enabled, service accounts on,
 * restrictInternalApis=true) without any EIS connector dependency — safe in CI.
 *
 * Onboarding flows mutate shared per-space state (workers, service accounts,
 * inference settings), so specs must not run in parallel.
 */
export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
});
