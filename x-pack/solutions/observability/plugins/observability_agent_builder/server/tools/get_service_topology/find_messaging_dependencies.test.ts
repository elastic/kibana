/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectionWithKey } from './types';
import { findMessagingDependencies } from './get_service_topology';

function makeExternalConnection(
  source: string,
  resource: string,
  spanType: string,
  spanSubtype: string
): ConnectionWithKey {
  return {
    source: { 'service.name': source },
    target: {
      'span.destination.service.resource': resource,
      'span.type': spanType,
      'span.subtype': spanSubtype,
    },
    metrics: undefined,
    _key: `${source}::${resource}`,
    _sourceName: source,
    _dependencyName: resource,
  };
}

function makeServiceConnection(source: string, target: string): ConnectionWithKey {
  return {
    source: { 'service.name': source },
    target: { 'service.name': target },
    metrics: undefined,
    _key: `${source}::${target}`,
    _sourceName: source,
    _dependencyName: target,
  };
}

describe('findMessagingDependencies', () => {
  it('returns empty array when no connections exist', () => {
    expect(findMessagingDependencies([])).toEqual([]);
  });

  it('returns empty array when no messaging dependencies exist', () => {
    const connections = [
      makeExternalConnection('backend', 'postgres:5432', 'db', 'postgresql'),
      makeExternalConnection('backend', 'redis:6379', 'db', 'redis'),
      makeServiceConnection('frontend', 'backend'),
    ];

    expect(findMessagingDependencies(connections)).toEqual([]);
  });

  it('finds kafka messaging dependencies', () => {
    const connections = [
      makeExternalConnection('fraud-detection', 'kafka/orders', 'messaging', 'kafka'),
      makeExternalConnection('fraud-detection', 'flagd:8013', 'external', 'grpc'),
    ];

    expect(findMessagingDependencies(connections)).toEqual(['kafka/orders']);
  });

  it('finds multiple messaging dependencies', () => {
    const connections = [
      makeExternalConnection('checkout', 'kafka/orders', 'messaging', 'kafka'),
      makeExternalConnection('checkout', 'rabbitmq/notifications', 'messaging', 'rabbitmq'),
      makeExternalConnection('checkout', 'postgres:5432', 'db', 'postgresql'),
    ];

    expect(findMessagingDependencies(connections).sort()).toEqual([
      'kafka/orders',
      'rabbitmq/notifications',
    ]);
  });

  it('deduplicates when multiple services connect to the same broker', () => {
    const connections = [
      makeExternalConnection('checkout', 'kafka/orders', 'messaging', 'kafka'),
      makeExternalConnection('fraud-detection', 'kafka/orders', 'messaging', 'kafka'),
    ];

    expect(findMessagingDependencies(connections)).toEqual(['kafka/orders']);
  });

  it('ignores service-to-service connections', () => {
    const connections = [
      makeServiceConnection('frontend', 'backend'),
      makeExternalConnection('backend', 'kafka/events', 'messaging', 'kafka'),
    ];

    expect(findMessagingDependencies(connections)).toEqual(['kafka/events']);
  });
});
