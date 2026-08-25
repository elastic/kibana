/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { NoParametersRequestSchema } from '../../common/base';

export const UnisolateRouteRequestSchema = NoParametersRequestSchema;
export type UnisolationRouteRequestBody = TypeOf<typeof UnisolateRouteRequestSchema.body>;
