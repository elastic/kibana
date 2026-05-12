/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import type { SearchPageObjects } from '../page_objects';

export interface SearchTestFixtures extends ScoutTestFixtures {
  pageObjects: SearchPageObjects;
}

export type SearchApiServicesFixture = ApiServicesFixture;

export interface SearchWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: SearchApiServicesFixture;
}

export interface SearchParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: SearchPageObjects;
}

export interface SearchParallelWorkerFixtures extends ScoutParallelWorkerFixtures {
  apiServices: SearchApiServicesFixture;
}
