/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { createDescriptorClient } from '../../../ClientDescriptorFactory/client_descriptor_factory';

interface MonitoringEntitySourceDescriptor {
  error: Record<string, number>;
  status: string;
}

const soClient = {} as SavedObjectsClientContract; // if we need to use it like this, then maybe we don't want to use this way?

export const client = createDescriptorClient<MonitoringEntitySourceDescriptor>({
  type: 'entity-analytics-monitoring-entity-source',
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
