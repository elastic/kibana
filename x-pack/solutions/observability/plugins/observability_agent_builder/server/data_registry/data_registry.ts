/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistryTypes } from './data_registry_types';

export class ObservabilityAgentBuilderDataRegistry {
  private readonly providers = new Map<string, (...args: any[]) => Promise<any>>();

  constructor(private readonly logger: Logger) {}

  public registerDataProvider<K extends keyof ObservabilityAgentBuilderDataRegistryTypes>(
    id: K,
    provider: ObservabilityAgentBuilderDataRegistryTypes[K]
  ): void {
    if (this.providers.has(id)) {
      this.logger.warn(`Overwriting data provider for key: ${id}`);
    } else {
      this.logger.debug(`Registered data provider for key: ${id}`);
    }

    this.providers.set(id, provider);
  }

  public async getData<K extends keyof ObservabilityAgentBuilderDataRegistryTypes>(
    id: K,
    params: Parameters<ObservabilityAgentBuilderDataRegistryTypes[K]>[0]
  ): Promise<ReturnType<ObservabilityAgentBuilderDataRegistryTypes[K]> | undefined> {
    const provider = this.providers.get(id);

    if (!provider) {
      this.logger.error(`No data provider registered for key: ${id}`);
      return;
    }

    return provider(params) as Promise<ReturnType<ObservabilityAgentBuilderDataRegistryTypes[K]>>;
  }
}
