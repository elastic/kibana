/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';
import { resolveTelemetryTarget } from './telemetry_targets';

const sandbox = config.schema.validate({
  sandbox: {
    telemetry_connector_id: 'legacy',
    telemetry_readable_indices: 'legacy:logs-*',
    telemetry_targets: {
      c0: { connector_id: 'customer0', readable_indices: 'remote:logs-*' },
      orca: { connector_id: 'orca', readable_indices: 'logs-orcabench.*' },
    },
  },
}).sandbox;

it('preserves the legacy default and resolves named targets independently', () => {
  expect(resolveTelemetryTarget(sandbox)).toEqual({
    connectorId: 'legacy',
    readableIndices: 'legacy:logs-*',
  });
  expect(resolveTelemetryTarget(sandbox, 'c0')).toEqual({
    connectorId: 'customer0',
    readableIndices: 'remote:logs-*',
  });
  expect(resolveTelemetryTarget(sandbox, 'orca')).toEqual({
    connectorId: 'orca',
    readableIndices: 'logs-orcabench.*',
  });
  expect(resolveTelemetryTarget(sandbox, 'none')).toEqual({});
});

it('does not reapply a named default to an existing legacy conversation', () => {
  expect(
    resolveTelemetryTarget({
      ...sandbox,
      telemetry_targets: sandbox?.telemetry_targets ?? {},
      default_telemetry_target: 'orca',
    })
  ).toMatchObject({ connectorId: 'legacy' });
  expect(
    resolveTelemetryTarget(
      {
        ...sandbox,
        telemetry_targets: sandbox?.telemetry_targets ?? {},
        default_telemetry_target: 'orca',
      },
      'none'
    )
  ).toEqual({});
});

it.each(['unknown', 'toString', '__proto__', 'UPPERCASE'])(
  'rejects an unconfigured or invalid target %s',
  (target) => {
    expect(() => resolveTelemetryTarget(sandbox, target)).toThrow();
  }
);

it('runs without telemetry when none is configured', () => {
  expect(resolveTelemetryTarget(undefined)).toEqual({
    connectorId: undefined,
    readableIndices: undefined,
  });
});
