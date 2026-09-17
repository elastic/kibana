/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SYSTEM_SECURITY_WORKER_IDS } from '@kbn/pnd-common';
import {
  SYSTEM_SECURITY_WORKER_CATALOG,
  type SystemSecurityWorkerCatalogEntry,
} from '@kbn/pnd-common';
import {
  getManagedWorkflowDefinition,
  type ManagedWorkflowTemplateValues,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { workerSettingsById, type WorkerSettingsRegistration } from './workers';

export type RegisteredWorkerId = (typeof SYSTEM_SECURITY_WORKER_IDS)[number];

export interface WorkerRegistration {
  id: RegisteredWorkerId;
  catalog: SystemSecurityWorkerCatalogEntry;
  settings: WorkerSettingsRegistration;
}

interface RegisteredWorkerInstallOptions {
  spaceId: string;
  workflowId?: string;
  workflowIdSuffix?: string;
  values?: ManagedWorkflowTemplateValues;
}

/** The runtime registry guarantees that template values came from the definition with this id. */
export const installRegisteredWorker = async (
  client: PluginScopedManagedWorkflowsApi,
  registration: WorkerRegistration,
  options: RegisteredWorkerInstallOptions
): Promise<void> => {
  const install = client.install as (
    id: RegisteredWorkerId,
    installOptions: RegisteredWorkerInstallOptions
  ) => Promise<void>;
  await install(registration.id, options);
};

class WorkerRegistry {
  private readonly registrations = new Map<RegisteredWorkerId, WorkerRegistration>();

  register(registration: WorkerRegistration): void {
    if (this.registrations.has(registration.id)) {
      throw new Error(`Worker "${registration.id}" is already registered`);
    }
    this.registrations.set(registration.id, registration);
  }

  get(id: string): WorkerRegistration | undefined {
    return this.registrations.get(id as RegisteredWorkerId);
  }

  list(): WorkerRegistration[] {
    return [...this.registrations.values()];
  }
}

export const workerRegistry = new WorkerRegistry();

for (const catalog of SYSTEM_SECURITY_WORKER_CATALOG) {
  const managedWorkflow = getManagedWorkflowDefinition(catalog.id);
  if (!managedWorkflow) {
    throw new Error(`Worker "${catalog.id}" has no managed workflow definition`);
  }
  if (!('yamlTemplate' in managedWorkflow) || typeof managedWorkflow.yamlTemplate !== 'function') {
    throw new Error(`Worker "${catalog.id}" must use a managed YAML template`);
  }
  const settings = workerSettingsById[catalog.id];
  workerRegistry.register({
    id: catalog.id,
    catalog,
    settings,
  });
}
