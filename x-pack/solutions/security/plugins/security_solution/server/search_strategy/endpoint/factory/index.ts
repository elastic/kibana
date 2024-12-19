/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointFactoryQueryTypes } from '../../../../common/search_strategy/endpoint';

import { responseActionsFactory } from './response_actions';
import type { EndpointFactory } from './types';

export const endpointFactory: Record<
  EndpointFactoryQueryTypes,
  EndpointFactory<EndpointFactoryQueryTypes>
> = {
  ...responseActionsFactory,
};
