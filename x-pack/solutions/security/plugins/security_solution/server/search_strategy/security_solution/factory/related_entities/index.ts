/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FactoryQueryTypes } from '../../../../../common/search_strategy/security_solution';
import { RelatedEntitiesQueries } from '../../../../../common/search_strategy/security_solution/related_entities';

import type { SecuritySolutionFactory } from '../types';
import { hostsRelatedUsers } from './related_users';
import { usersRelatedHosts } from './related_hosts';

export const relatedEntitiesFactory: Record<
  RelatedEntitiesQueries,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [RelatedEntitiesQueries.relatedHosts]: usersRelatedHosts,
  [RelatedEntitiesQueries.relatedUsers]: hostsRelatedUsers,
};
