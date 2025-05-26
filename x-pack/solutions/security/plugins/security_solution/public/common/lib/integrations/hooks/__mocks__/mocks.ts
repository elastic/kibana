/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockTrackLinkClick = jest.fn();

export const telemetry = {
  trackLinkClick: mockTrackLinkClick,
};
export const mockTelemetry = jest.fn(() => telemetry);

export const integrationContext = {
  spaceId: 'default',
  telemetry: mockTelemetry(),
};
export const mockIntegrationContext = jest.fn(() => integrationContext);
