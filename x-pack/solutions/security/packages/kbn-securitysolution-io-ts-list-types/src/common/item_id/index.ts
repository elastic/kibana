/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

export const item_id = NonEmptyString;
export type ItemId = t.TypeOf<typeof item_id>;
export const itemIdOrUndefined = t.union([item_id, t.undefined]);
export type ItemIdOrUndefined = t.TypeOf<typeof itemIdOrUndefined>;
