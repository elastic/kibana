/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseActionsQueries } from '../../../../../common/search_strategy/endpoint/response_actions';
import { allActions } from './actions';
import { actionResults } from './results';
import type { EndpointFactory } from '../types';
import type { EndpointFactoryQueryTypes } from '../../../../../common/search_strategy/endpoint';

export const responseActionsFactory: Record<
  ResponseActionsQueries,
  EndpointFactory<EndpointFactoryQueryTypes>
> = {
  [ResponseActionsQueries.actions]: allActions,
  [ResponseActionsQueries.results]: actionResults,
};
