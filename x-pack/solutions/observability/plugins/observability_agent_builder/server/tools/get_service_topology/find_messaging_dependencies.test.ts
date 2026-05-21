/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findMessagingDependencies } from './find_messaging_dependencies';
import { makeExternalConnection, makeServiceConnection } from './test_helpers';

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
