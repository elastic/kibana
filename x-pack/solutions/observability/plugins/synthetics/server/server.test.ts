/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initSyntheticsServer } from './server';

const mockAddVersion = jest.fn();
const mockPost = jest.fn(() => ({ addVersion: mockAddVersion }));

jest.mock('./routes', () => ({
  syntheticsAppRestApiRoutes: [],
  syntheticsAppPublicRestApiRoutes: [
    {
      method: 'POST',
      path: '/api/synthetics/test-bulk-create',
      options: { body: { maxBytes: 100 * 1024 * 1024 } },
      validation: { request: { body: {} } },
      handler: jest.fn(),
    },
  ],
}));

jest.mock('./routes/create_route_with_auth', () => ({
  createSyntheticsRouteWithAuth: jest.fn((route) => route),
}));

jest.mock('./synthetics_route_wrapper', () => ({
  syntheticsRouteWrapper: jest.fn((route) => route),
}));

jest.mock('./alert_rules/tls_rule/tls_rule', () => ({
  registerSyntheticsTLSCheckRule: jest.fn(),
}));

jest.mock('./alert_rules/status_rule/monitor_status_rule', () => ({
  registerSyntheticsStatusCheckRule: jest.fn(),
}));

describe('initSyntheticsServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards public POST body options to the versioned router', () => {
    initSyntheticsServer(
      { router: { versioned: { post: mockPost } } } as any,
      {} as any,
      {} as any,
      {} as any
    );

    expect(mockPost).toHaveBeenCalledWith({
      access: 'public',
      security: undefined,
      path: '/api/synthetics/test-bulk-create',
      options: { body: { maxBytes: 100 * 1024 * 1024 } },
    });
  });
});
