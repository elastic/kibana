/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentDataRegistryTypes } from './data_registry_types';

export class ObservabilityAgentDataRegistry {
  private readonly providers = new Map<string, (...args: any[]) => Promise<any>>();

  constructor(private readonly logger: Logger) {}

  public registerDataProvider<K extends keyof ObservabilityAgentDataRegistryTypes>(
    id: K,
    provider: ObservabilityAgentDataRegistryTypes[K]
  ): void {
    if (this.providers.has(id)) {
      this.logger.warn(`Overwriting data provider for key: ${id}`);
    } else {
      this.logger.debug(`Registered data provider for key: ${id}`);
    }

    this.providers.set(id, provider);
  }

  public async getData<K extends keyof ObservabilityAgentDataRegistryTypes>(
    id: K,
    params: Parameters<ObservabilityAgentDataRegistryTypes[K]>[0]
  ): Promise<ReturnType<ObservabilityAgentDataRegistryTypes[K]> | undefined> {
    const provider = this.providers.get(id) as ObservabilityAgentDataRegistryTypes[K] | undefined;

    if (!provider) {
      this.logger.error(`No data provider registered for key: ${id}`);
      return;
    }

    return provider(params) as Promise<ReturnType<ObservabilityAgentDataRegistryTypes[K]>>;
  }
}
