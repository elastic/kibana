/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMissingIdFieldWarning, getMetadataIdInjectionFailedWarning } from '../../utils/utils';

/**
 * Returns a warning message if the ES|QL response does not contain an `_id` column.
 * When `injectionFailureReason` is provided, the warning explains why automatic injection failed.
 * Returns `undefined` when no warning is needed (empty results or `_id` present).
 */
export const checkMissingIdFieldWarning = ({
  response,
  injectionFailureReason,
}: {
  response: { columns: Array<{ name: string }>; values: unknown[] };
  injectionFailureReason?: string;
}): string | undefined => {
  if (response.values.length === 0) {
    return undefined;
  }

  const hasIdColumn = response.columns.some((col) => col.name === '_id');
  if (hasIdColumn) {
    return undefined;
  }

  return injectionFailureReason
    ? getMetadataIdInjectionFailedWarning(injectionFailureReason)
    : getMissingIdFieldWarning();
};
