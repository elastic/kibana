/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { EXCEPTION_APPLIES_TO } from '@kbn/securitysolution-exceptions-common/esql_output_columns';

/** What an exception item applies to. An item without it applies to the source documents. */
export const appliesTo = t.keyof({
  [EXCEPTION_APPLIES_TO.SOURCE_DOCUMENTS]: null,
  [EXCEPTION_APPLIES_TO.ESQL_OUTPUT_COLUMNS]: null,
});
export type AppliesTo = t.TypeOf<typeof appliesTo>;

export const appliesToOrUndefined = t.union([appliesTo, t.undefined]);
export type AppliesToOrUndefined = t.TypeOf<typeof appliesToOrUndefined>;
