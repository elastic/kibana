/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectionWithKey } from './types';
import { buildConnectionKey } from './build_connections_from_spans';

export function makeServiceConnection(source: string, target: string): ConnectionWithKey {
  return {
    source: { 'service.name': source },
    target: { 'service.name': target },
    metrics: undefined,
    _key: buildConnectionKey(source, target),
    _sourceName: source,
    _dependencyName: target,
  };
}

export function makeExternalConnection(
  source: string,
  resource: string,
  spanType = 'db',
  spanSubtype = 'postgresql'
): ConnectionWithKey {
  return {
    source: { 'service.name': source },
    target: {
      'span.destination.service.resource': resource,
      'span.type': spanType,
      'span.subtype': spanSubtype,
    },
    metrics: undefined,
    _key: buildConnectionKey(source, resource),
    _sourceName: source,
    _dependencyName: resource,
  };
}

export function getConnectionKeys(connections: ConnectionWithKey[]): string[] {
  return connections.map((c) => c._key).sort();
}
