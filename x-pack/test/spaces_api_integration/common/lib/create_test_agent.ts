/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
import { TestDefinitionAuthentication } from './types';

export const createTestAgent = (
  baseAgent: SupertestWithoutAuthProviderType,
  user: TestDefinitionAuthentication | undefined
) => {
  // Returns a function that accepts the request method and URL
  return (method: 'get' | 'post' | 'delete' | 'put' | 'head', url: string) => {
    // Creating a request object from the baseAgent using the provided method and URL
    let request = baseAgent[method](url);

    // If a user is provided, apply authentication to the request
    if (user) {
      request = request.auth(user.username, user.password);
    }

    // Return the request object with or without auth
    return request;
  };
};
