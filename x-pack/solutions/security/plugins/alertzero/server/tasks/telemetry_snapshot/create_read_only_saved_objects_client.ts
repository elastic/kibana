/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

/** The reads an Advanced Settings read makes, and the namespace lookup a settings client needs. */
const READ_METHODS: ReadonlySet<PropertyKey> = new Set<keyof SavedObjectsClientContract>([
  'bulkGet',
  'bulkResolve',
  'find',
  'get',
  'getCurrentNamespace',
  'resolve',
]);

const refuse = (method: string): never => {
  throw SavedObjectsErrorHelpers.decorateForbiddenError(
    new Error(
      `The AlertZero telemetry snapshot reads saved objects only, so it refused "${method}"`
    )
  );
};

/**
 * Wraps a saved objects client so that only reads reach it. Any other method throws a forbidden
 * error before it reaches Elasticsearch, so nothing built on the wrapper can write. An Advanced
 * Settings client treats that error as a read-only user: when the space has no `config` object
 * for this Kibana version, it returns the values an upgrade would carry over (or the defaults)
 * instead of creating the object.
 */
export const createReadOnlySavedObjectsClient = (
  client: SavedObjectsClientContract
): SavedObjectsClientContract =>
  new Proxy(client, {
    get: (target, property) => {
      const value: unknown = Reflect.get(target, property, target);
      if (typeof value !== 'function') {
        return value;
      }
      return READ_METHODS.has(property) ? value.bind(target) : () => refuse(String(property));
    },
  });
