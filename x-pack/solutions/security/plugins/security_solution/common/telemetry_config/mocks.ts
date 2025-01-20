/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryConfigProvider } from './telemetry_config_provider';

export const createTelemetryConfigProviderMock = (): jest.Mocked<TelemetryConfigProvider> => ({
  start: jest.fn(),
  stop: jest.fn(),
  getObservable: jest.fn(),
  getIsOptedIn: jest.fn().mockReturnValue(true),
});
