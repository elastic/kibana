/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { TimeDuration } from '@kbn/securitysolution-io-ts-types';

export type RuleActionThrottle = t.TypeOf<typeof RuleActionThrottle>;
export const RuleActionThrottle = t.union([
  t.literal('no_actions'),
  t.literal('rule'),
  TimeDuration({ allowedUnits: ['s', 'm', 'h', 'd'] }),
]);
