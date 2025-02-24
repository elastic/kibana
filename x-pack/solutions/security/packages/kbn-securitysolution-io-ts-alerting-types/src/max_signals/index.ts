/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { PositiveIntegerGreaterThanZero } from '@kbn/securitysolution-io-ts-types';

export const max_signals = PositiveIntegerGreaterThanZero;
export type MaxSignals = t.TypeOf<typeof max_signals>;

export const maxSignalsOrUndefined = t.union([max_signals, t.undefined]);
export type MaxSignalsOrUndefined = t.TypeOf<typeof maxSignalsOrUndefined>;
