/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SuperTest from 'supertest';

export const assertStatusCode = (statusCode: number, response: SuperTest.Response) => {
  if (response.status !== statusCode) {
    throw new Error(
      `Expected status code ${statusCode}, but got ${response.statusCode} \n` + response.text
    );
  }
};
