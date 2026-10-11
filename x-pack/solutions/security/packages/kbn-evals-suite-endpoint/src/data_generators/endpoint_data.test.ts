/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SCENARIOS } from './endpoint_data';

// The endpoint actions data streams type `error` as an ECS object; a bare
// string fails index-time validation and breaks both suites' setup.
describe('endpoint_data seeded isolation failure documents', () => {
  const extraDocs = SCENARIOS.routingUnhealthyHost.extraDocuments ?? [];

  it('seeds the failed isolate action with an error object carrying a message', () => {
    const actionDoc = extraDocs.find((doc) => doc.index === '.logs-endpoint.actions-default');
    expect(actionDoc).toBeDefined();
    expect(actionDoc?.document.error).toEqual({
      message: expect.any(String),
    });
  });

  it('seeds the failed isolate action response with an error object carrying a message', () => {
    const responseDoc = extraDocs.find(
      (doc) => doc.index === '.logs-endpoint.action.responses-default'
    );
    expect(responseDoc).toBeDefined();
    expect(responseDoc?.document.error).toEqual({
      message: expect.any(String),
    });
  });
});
