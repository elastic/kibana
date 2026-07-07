/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DefaultStringBooleanFalse } from '@kbn/securitysolution-io-ts-types';

export const GetIndexStatsParams = t.type({
  pattern: t.string,
});

export const GetIndexStatsQuery = t.type({
  isILMAvailable: DefaultStringBooleanFalse,
  startDate: t.union([t.string, t.null, t.undefined]),
  endDate: t.union([t.string, t.null, t.undefined]),
});
