/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest, mergeTests } from '@kbn/scout-security';
import { securitySolutionApiFixture } from '@kbn/security-solution-test-api-clients/scout';

/**
 * Discoveries API tests get the generated Security Solution Scout clients (`discoveriesApi`, ...) on
 * top of the default `@kbn/scout-security` API fixtures.
 */
export const apiTest = mergeTests(baseApiTest, securitySolutionApiFixture);

export { tags } from '@kbn/scout-security';
