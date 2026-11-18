/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { getEsqlOutputColumnsItemErrors } from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import type { ValidateEsqlOutputColumnsItemOptions } from '@kbn/securitysolution-exceptions-common/esql_output_columns';

const MAX_REPORTED_ERRORS = 10;

/** Throws a bad request error that names every problem of the item (at most 10), or returns when the item is valid. */
export const validateEsqlOutputColumnsItem = (
  options: ValidateEsqlOutputColumnsItemOptions
): void => {
  const errors = [...new Set(getEsqlOutputColumnsItemErrors(options))];
  if (errors.length === 0) {
    return;
  }
  const shown = errors.slice(0, MAX_REPORTED_ERRORS);
  const hidden = errors.length - shown.length;
  throw new BadRequestError(
    `Invalid exception item: ${shown.join('; ')}${hidden > 0 ? `; and ${hidden} more` : ''}`
  );
};
