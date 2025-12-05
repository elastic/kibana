/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentDataRegistryTypes } from './data_registry_types';

export class ObservabilityAgentDataRegistry {
  private readonly providers: Partial<{
    [K in keyof ObservabilityAgentDataRegistryTypes]: ObservabilityAgentDataRegistryTypes[K];
  }> = {};

  constructor(private readonly logger: Logger) {}

  public registerDataProvider<K extends keyof ObservabilityAgentDataRegistryTypes>(
    id: K,
    provider: ObservabilityAgentDataRegistryTypes[K]
  ): void {
    if (this.providers[id]) {
      this.logger.warn(`Overwriting data provider for key: ${id}`);
    } else {
      this.logger.debug(`Registered data provider for key: ${id}`);
    }

    this.providers[id] = provider;
  }

  public async getData<K extends keyof ObservabilityAgentDataRegistryTypes>(
    id: K,
    params: Parameters<ObservabilityAgentDataRegistryTypes[K]>[0]
  ): Promise<ReturnType<ObservabilityAgentDataRegistryTypes[K]> | undefined> {
    const provider = this.providers[id] as ObservabilityAgentDataRegistryTypes[K] | undefined;

    if (!provider) {
      this.logger.error(`No data provider registered for key: ${id}`);
      return;
    }

    const fn = this.providers[id] as unknown as (
      args: Parameters<ObservabilityAgentDataRegistryTypes[K]>[0]
    ) => Promise<ReturnType<ObservabilityAgentDataRegistryTypes[K]>>;

    return fn(params);
  }
}
