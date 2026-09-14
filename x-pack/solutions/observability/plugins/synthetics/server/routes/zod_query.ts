/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BooleanFromString } from '@kbn/zod-helpers';

export const MAX_ROUTE_ID_LENGTH = 1024;
export const MAX_ROUTE_STRING_LENGTH = 4096;
export const MAX_DATE_RANGE_LENGTH = 256;

export const queryNumber = z.coerce.number();
export const queryBoolean = BooleanFromString;
export const routeId = z.string().min(1).max(MAX_ROUTE_ID_LENGTH);
export const optionalRouteId = z.string().max(MAX_ROUTE_ID_LENGTH).optional();
export const optionalQueryString = z.string().max(MAX_ROUTE_STRING_LENGTH).optional();
