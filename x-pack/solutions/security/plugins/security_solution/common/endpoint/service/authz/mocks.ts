/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointAuthz } from '../../types/authz';
import { getEndpointAuthzInitialState } from './authz';

/**
 * Returns the Endpoint Authz values all set to `true` (authorized)
 * @param overrides
 */
export const getEndpointAuthzInitialStateMock = (
  overrides: Partial<EndpointAuthz> = {}
): EndpointAuthz => {
  const authz: EndpointAuthz = {
    ...(
      Object.entries(getEndpointAuthzInitialState()) as Array<[keyof EndpointAuthz, boolean]>
    ).reduce((mockPrivileges, [key, value]) => {
      // Invert the initial values (from `false` to `true`) so that everything is authorized
      mockPrivileges[key] = true;

      return mockPrivileges;
    }, {} as EndpointAuthz),
    ...overrides,
  };

  return authz;
};
