/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SCHEMA } from '../../../../../common/constants';
import { getInventoryRequestSchema } from './get_inventory_request_schema';

describe('getInventoryRequestSchema', () => {
  it('keeps leftover Hosts OpenTelemetry schema off Kubernetes Pod requests when the flag is off', () => {
    expect(getInventoryRequestSchema('pod', 'semconv')).toBe('ecs');
    expect(getInventoryRequestSchema('pod', 'semconv', { isPodSchemaSelectorEnabled: false })).toBe(
      'ecs'
    );
  });

  it('keeps Kubernetes Pods on Elastic Common Schema when preferredSchema is unset and the flag is off', () => {
    expect(getInventoryRequestSchema('pod', null)).toBe('ecs');
    expect(getInventoryRequestSchema('pod', undefined)).toBe('ecs');
  });

  it('forwards preferredSchema for Kubernetes Pods when the flag is on', () => {
    expect(getInventoryRequestSchema('pod', 'semconv', { isPodSchemaSelectorEnabled: true })).toBe(
      'semconv'
    );
    expect(getInventoryRequestSchema('pod', 'ecs', { isPodSchemaSelectorEnabled: true })).toBe(
      'ecs'
    );
  });

  it('falls through to DEFAULT_SCHEMA for Kubernetes Pods when preferredSchema is unset and the flag is on', () => {
    expect(getInventoryRequestSchema('pod', null, { isPodSchemaSelectorEnabled: true })).toBe(
      DEFAULT_SCHEMA
    );
    expect(getInventoryRequestSchema('pod', undefined, { isPodSchemaSelectorEnabled: true })).toBe(
      DEFAULT_SCHEMA
    );
  });

  it('forwards Hosts preferredSchema, including leftover OpenTelemetry', () => {
    expect(getInventoryRequestSchema('host', 'semconv')).toBe('semconv');
    expect(getInventoryRequestSchema('host', 'ecs')).toBe('ecs');
  });

  it('falls through to DEFAULT_SCHEMA for Hosts when preferredSchema is unset', () => {
    expect(getInventoryRequestSchema('host', null)).toBe(DEFAULT_SCHEMA);
    expect(getInventoryRequestSchema('host', undefined)).toBe(DEFAULT_SCHEMA);
  });

  it('forwards preferredSchema for other node types', () => {
    expect(getInventoryRequestSchema('container', 'semconv')).toBe('semconv');
    expect(getInventoryRequestSchema('awsRDS', 'ecs')).toBe('ecs');
  });
});
