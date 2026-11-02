/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectionWithKey } from './types';

/**
 * Find messaging dependencies (Kafka topics, RabbitMQ queues, etc.) from a set of connections.
 * These are external nodes with span.type === 'messaging'.
 */
export function findMessagingDependencies(connections: ConnectionWithKey[]): string[] {
  const messagingDeps = new Set<string>();
  for (const conn of connections) {
    const { target } = conn;
    if ('span.type' in target && target['span.type'] === 'messaging') {
      messagingDeps.add(conn._dependencyName);
    }
  }
  return Array.from(messagingDeps);
}
