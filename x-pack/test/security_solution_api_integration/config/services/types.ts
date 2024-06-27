/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';

export interface SecuritySolutionUtils {
  getUsername: (role?: string) => Promise<string>;
  createSuperTest: (role?: string) => Promise<TestAgent<any>>;
}
