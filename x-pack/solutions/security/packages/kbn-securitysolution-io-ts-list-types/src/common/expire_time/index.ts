/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { IsoDateString } from '@kbn/securitysolution-io-ts-types';

export const expireTime = IsoDateString;
export const expireTimeOrUndefined = t.union([expireTime, t.undefined]);
export type ExpireTimeOrUndefined = t.TypeOf<typeof expireTimeOrUndefined>;
