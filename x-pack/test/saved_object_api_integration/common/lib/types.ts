/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type ExpectResponseBody = (response: Record<string, any>) => Promise<void>;

export interface TestDefinition {
  title: string;
  responseStatusCode: number;
  responseBody: ExpectResponseBody;
}

export interface TestSuite<T> {
  user?: TestUser;
  spaceId?: string;
  tests: T[];
}

export interface TestCase {
  type: string;
  id: string;
  failure?: 400 | 403 | 404 | 409;
}

export interface TestUser {
  username: string;
  password: string;
  description: string;
  authorizedAtSpaces: string[];
}
