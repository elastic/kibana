/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Space } from '@kbn/spaces-plugin/common';
import { request } from './common';

export const createSpace = (spaceId: string): Cypress.Chainable<Cypress.Response<Space>> => {
  return request<Space>({
    method: 'POST',
    url: '/api/spaces/space',
    body: {
      name: spaceId,
      id: spaceId,
    },
  });
};

export const deleteSpace = (spaceId: string): Cypress.Chainable<Cypress.Response<void>> => {
  return request<void>({
    method: 'DELETE',
    url: `/api/spaces/space/${spaceId}`,
  });
};
