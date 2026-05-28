/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real implementation lands in PR10 (Schedule Integration).
// Returns the input unchanged so callers compile FF-off; not reached at
// runtime when the feature flag is OFF.
export const transformCreatePropsFromApi = (apiProps: unknown): unknown => apiProps;
