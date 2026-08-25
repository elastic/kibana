/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { operator } from '@kbn/securitysolution-io-ts-types';
import { RiskScore } from '../risk_score';

export type RiskScoreMappingItem = t.TypeOf<typeof RiskScoreMappingItem>;
export const RiskScoreMappingItem = t.exact(
  t.type({
    field: t.string,
    value: t.string,
    operator,
    risk_score: t.union([RiskScore, t.undefined]),
  })
);

export type RiskScoreMapping = t.TypeOf<typeof RiskScoreMapping>;
export const RiskScoreMapping = t.array(RiskScoreMappingItem);
