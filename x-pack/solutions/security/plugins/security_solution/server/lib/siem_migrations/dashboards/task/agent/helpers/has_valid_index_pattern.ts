/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../common/constants';

/** Explorer returned a non-empty index pattern that is not the migration sentinel. */
export function hasValidIndexPattern(indexPattern: string | undefined): indexPattern is string {
  return (
    typeof indexPattern === 'string' &&
    indexPattern.length > 0 &&
    indexPattern !== MISSING_INDEX_PATTERN_PLACEHOLDER
  );
}
