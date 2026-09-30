/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout-security';
import { apiTest as baseApiTest } from '@kbn/scout-security';

export const apiTest = baseApiTest.extend<ScoutTestFixtures, ScoutWorkerFixtures>({});

export * as testData from './constants';
