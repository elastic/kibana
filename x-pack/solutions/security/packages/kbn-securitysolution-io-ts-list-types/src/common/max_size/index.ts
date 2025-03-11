/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { PositiveIntegerGreaterThanZero } from '@kbn/securitysolution-io-ts-types';
import * as t from 'io-ts';

export const max_size = PositiveIntegerGreaterThanZero;
export type MaxSize = t.TypeOf<typeof max_size>;

export const maxSizeOrUndefined = t.union([max_size, t.undefined]);
export type MaxSizeOrUndefined = t.TypeOf<typeof maxSizeOrUndefined>;
