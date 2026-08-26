/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_IDS,
  createCatalogWatchPlaceholder,
  type Watch,
} from '@kbn/pnd-common';
import {
  getManagedWorkflowDefinition,
  type ManagedWorkflowTemplateValues,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { watchSettingsById, type WatchSettingsRegistration } from './watches';

export type RegisteredWatchId = (typeof SYSTEM_SECURITY_WATCH_IDS)[number];

export interface WatchRegistration {
  id: RegisteredWatchId;
  watch: Watch;
  settings?: WatchSettingsRegistration;
}

interface RegisteredWatchInstallOptions {
  spaceId: string;
  workflowId?: string;
  workflowIdSuffix?: string;
  values?: ManagedWorkflowTemplateValues;
}

/** The runtime registry guarantees that template values came from the definition with this id. */
export const installRegisteredWatch = async (
  client: PluginScopedManagedWorkflowsApi,
  registration: WatchRegistration,
  options: RegisteredWatchInstallOptions
): Promise<void> => {
  const install = client.install as (
    id: RegisteredWatchId,
    installOptions: RegisteredWatchInstallOptions
  ) => Promise<void>;
  await install(registration.id, options);
};

class WatchRegistry {
  private readonly registrations = new Map<RegisteredWatchId, WatchRegistration>();

  register(registration: WatchRegistration): void {
    if (this.registrations.has(registration.id)) {
      throw new Error(`Watch "${registration.id}" is already registered`);
    }
    this.registrations.set(registration.id, registration);
  }

  get(id: string): WatchRegistration | undefined {
    return this.registrations.get(id as RegisteredWatchId);
  }

  list(): WatchRegistration[] {
    return [...this.registrations.values()];
  }
}

export const watchRegistry = new WatchRegistry();

for (const id of SYSTEM_SECURITY_WATCH_IDS) {
  const managedWorkflow = getManagedWorkflowDefinition(id);
  if (!managedWorkflow) {
    throw new Error(`Watch "${id}" has no managed workflow definition`);
  }
  const settings = watchSettingsById[id];
  const usesTemplate = 'yamlTemplate' in managedWorkflow;
  if (usesTemplate !== Boolean(settings)) {
    throw new Error(
      `Watch "${id}" must register settings if and only if it uses a managed YAML template`
    );
  }
  watchRegistry.register({
    id,
    watch: createCatalogWatchPlaceholder(id),
    ...(settings ? { settings } : {}),
  });
}
