/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { operator } from '@kbn/securitysolution-io-ts-types';
import { Severity } from '../severity';

export type SeverityMappingItem = t.TypeOf<typeof SeverityMappingItem>;
export const SeverityMappingItem = t.exact(
  t.type({
    field: t.string,
    operator,
    value: t.string,
    severity: Severity,
  })
);

export type SeverityMapping = t.TypeOf<typeof SeverityMapping>;
export const SeverityMapping = t.array(SeverityMappingItem);
