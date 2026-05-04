/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Maximum number of prebuilt rules processed per iteration of the install
// and upgrade loops. Bounds memory and per-call payload (validation +
// detection-rule creation) while still letting `fetchAssetsByVersion` retrieve
// up to `MAX_PREBUILT_RULES_COUNT` assets in a single call.
export const PREBUILT_RULE_BATCH_SIZE = 100;
