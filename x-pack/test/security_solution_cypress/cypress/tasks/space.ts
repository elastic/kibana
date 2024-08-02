/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_HEADERS } from './api_calls/common';

/**
 * Creates a space and sets it as the current one
 */
export function activateSpace(spaceId: string): void {
  const baseUrl = Cypress.config().baseUrl;
  if (!baseUrl) {
    throw Error(`Cypress config baseUrl not set!`);
  }

  cy.request({
    url: `${baseUrl}/api/spaces/space`,
    method: 'POST',
    body: {
      id: spaceId,
      name: spaceId,
    },
    headers: API_HEADERS,
    // For the majority cases the specified space already exists and
    // this request would fail. To avoid condition logic and an extra
    // request to check for space existence it fails silently.
    //
    // While it will make errors less transparent when a user doesn't
    // have credentials to create spaces. But it's a trade off for now
    // choosing simplicity over errors transparency.
    failOnStatusCode: false,
  });

  cy.setCurrentSpace(spaceId);
}

/**
 * Constructs a space aware url
 */
export function getSpaceUrl(spaceId: string, url: string): string {
  return spaceId ? `/s/${spaceId}${url}` : url;
}
