/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EVALUATOR_ERRORS = {
  INVALID_OUTPUT_STRUCTURE:
    'Invalid output structure: expected {results: [{ name: string; requiredPaths: string[]; optionalPaths: string[]; excludedPaths: string[]; }]}',
  NO_RESULTS: "No results found in the run's output",
  GROUPS_COUNT: 'Number of insight groups does not match number of requirements',
};
