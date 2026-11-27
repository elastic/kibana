/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_HEALTH_HINT_PARTIAL_RESULTS } from './translations';

/**
 * PROTOTYPE: a plain-words hint for a saved rule error. Only errors that have been reproduced get a
 * hint; any other error returns `undefined` so the raw error is shown on its own.
 */
export const getRuleFailureHint = (lastError: string | null): string | undefined =>
  lastError?.includes('returned partial results') ? RULES_HEALTH_HINT_PARTIAL_RESULTS : undefined;
