/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { MAX_PROJECT_ROUTING_LENGTH } from './constants';

export const projectRoutingRT = new rt.Type<string, string, unknown>(
  'ProjectRouting',
  rt.string.is,
  (input, context) =>
    typeof input === 'string' && input.length <= MAX_PROJECT_ROUTING_LENGTH
      ? rt.success(input)
      : rt.failure(
          input,
          context,
          `projectRouting must not exceed ${MAX_PROJECT_ROUTING_LENGTH} characters`
        ),
  rt.identity
);
