/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { endpointFieldsRequestSchema } from '../../../common/api/search_strategy/endpoint_fields/endpoint_fields';

export const parseRequest = (request: unknown) => endpointFieldsRequestSchema.parse(request);
