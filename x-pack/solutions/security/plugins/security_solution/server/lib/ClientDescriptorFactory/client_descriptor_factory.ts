/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable prettier/prettier */

import type { SavedObjectsClientContract } from '@kbn/core/server';

interface DescriptorClientDeps<T> {
  type: string;
  soClient: SavedObjectsClientContract;
  namespace: string;
  getIdPrefix: (namespace: string) => string;
  defaultAttributes: () => T;
  mergeAttributes?: (existing: T) => Partial<T>;
  statusField?: keyof T;
}

// A reusable factory for creating SavedObject descriptor clients
export function createDescriptorClient<T>({
  type,
  soClient,
  namespace,
  getIdPrefix,
  defaultAttributes,
  mergeAttributes,
  statusField,
}: DescriptorClientDeps<T>) {
  const id = getIdPrefix(namespace);

  const base = {
    getSavedObjectId: () => id,

    async find() {
      return soClient.find<T>({ type, namespaces: [namespace] });
    },

    async get() {
      const { attributes } = await soClient.get<T>(type, id);
      return attributes;
    },

    async delete() {
      return soClient.delete(type, id);
    },

    async update(update: Partial<T>) {
      const { attributes } = await soClient.update<T>(type, id, update, {
        refresh: 'wait_for',
      });
      return attributes;
    },

    async init() {
      const existing = await this.find();
      if (existing.total === 1) {
        const old = existing.saved_objects[0].attributes;
        const update = mergeAttributes ? mergeAttributes(old) : { ...old, ...defaultAttributes() };
        return this.update(update);
      }
      const { attributes } = await soClient.create<T>(type, defaultAttributes(), { id });
      return attributes;
    },
  };

  if (statusField) {
    return {
      ...base,
      async updateStatus(status: T[typeof statusField]) {
        return base.update({ [statusField]: status } as Partial<T>);
      },
    };
  }

  return base;
}

/**
 * Usage example of above factory
 *
interface MonitoringEntitySourceDescriptor {
  error: Record<string, number>;
  status: string;
}

const soClient = {} as SavedObjectsClientContract;

export const client = createDescriptorClient<MonitoringEntitySourceDescriptor>({
  type: 'privilege-monitoring',
  soClient,
  namespace: 'default',
  getIdPrefix: (ns) => `entity-analytics-monitoring-entity-source-${ns}`,
  defaultAttributes: () => ({ status: 'installing', error: {} }),
  mergeAttributes: (existing) => ({
    ...existing,
    error: undefined,
    status: 'installing',
  }),
  statusField: 'status',
}) as ReturnType<typeof createDescriptorClient<MonitoringEntitySourceDescriptor>> & {
  updateStatus: (status: string) => Promise<MonitoringEntitySourceDescriptor>;
};

client.updateStatus('ready');
*/