/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';
import { getTelemetryTargets, resolveTelemetryTarget } from './telemetry_targets';

const sandbox = config.schema.validate({
  sandbox: {
    telemetry_targets: {
      c0: { connector_id: 'customer0', readable_indices: 'remote:logs-*' },
      orca: { connector_id: 'orca', readable_indices: 'logs-orcabench.*' },
    },
  },
}).sandbox;

it('resolves named targets and nothing else', () => {
  expect(resolveTelemetryTarget(sandbox)).toEqual({});
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

it('leaves a conversation without a target untouched by the configured default', () => {
  // Defaults are applied where a conversation is created, never when its stored target is read.
  expect(
    resolveTelemetryTarget({
      ...sandbox,
      telemetry_targets: sandbox?.telemetry_targets ?? {},
      default_telemetry_target: 'orca',
    })
  ).toEqual({});
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
  expect(resolveTelemetryTarget(undefined)).toEqual({});
  expect(getTelemetryTargets(undefined)).toEqual([]);
});

it('lists every configured target', () => {
  expect(getTelemetryTargets(sandbox)).toEqual([
    { connectorId: 'customer0', readableIndices: 'remote:logs-*' },
    { connectorId: 'orca', readableIndices: 'logs-orcabench.*' },
  ]);
});
