/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from './common';

export interface BedrockConnectorRequestBody {
  id: string;
  apiUrl: string;
  defaultModel: string;
  accessKey: string;
  secret: string;
}

export function addBedrockConnector(
  body: BedrockConnectorRequestBody
): Cypress.Chainable<Cypress.Response<{}>> {
  return rootRequest<{}>({
    method: 'POST',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/api/actions/connector`,
    body,
  });
}
