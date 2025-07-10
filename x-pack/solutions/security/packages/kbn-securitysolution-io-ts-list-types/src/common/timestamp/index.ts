/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { IsoDateString } from '@kbn/securitysolution-io-ts-types';

export const timestamp = IsoDateString;
export const timestampOrUndefined = t.union([IsoDateString, t.undefined]);

/**
 * timestamp field type as it can be returned form ES: string, number or undefined
 */
export const timestampFromEsResponse = t.union([IsoDateString, t.number, t.undefined]);
