/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServicesQueries } from '../../../../../common/api/search_strategy';
import type { FactoryQueryTypes } from '../../../../../common/search_strategy/security_solution';

import type { SecuritySolutionFactory } from '../types';
import { observedServiceDetails } from './observed_details';

export const servicesFactory: Record<
  ServicesQueries,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [ServicesQueries.observedDetails]: observedServiceDetails,
};
