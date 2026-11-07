/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './src/search_strategy';
export * from './src/api/search_strategy';

// Both subtrees declare a `RunTimeMappings` type with the same name but different shapes.
// The `search_strategy` variant is the one consumed externally, so re-export it explicitly
// to resolve the star-export ambiguity (TS2308). The API request-schema variant (inferred
// from zod) is re-exported under an explicit alias for the few consumers that need it.
export type { RunTimeMappings } from './src/search_strategy';
export type { RunTimeMappings as ApiRunTimeMappings } from './src/api/search_strategy';
