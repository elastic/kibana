/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { SecurityPageObjects } from '../page_objects';

export interface SecurityTestFixtures extends ScoutTestFixtures {
  pageObjects: SecurityPageObjects;
}

export type SecurityWorkerFixtures = ScoutWorkerFixtures;

export interface SecurityParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: SecurityPageObjects;
}

export type SecurityParallelWorkerFixtures = ScoutParallelWorkerFixtures;
