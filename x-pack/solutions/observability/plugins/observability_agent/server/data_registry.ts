/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';

interface ObservabilityAgentDataRegistryTypes {
  apmErrors: unknown;
}

interface ObservabilityAgentDataProviderDependencies {
  request: KibanaRequest;
}

type ObservabilityAgentDataProvider<K extends keyof ObservabilityAgentDataRegistryTypes> = (
  context: ObservabilityAgentDataProviderDependencies
) => Promise<ObservabilityAgentDataRegistryTypes[K]>;

export class ObservabilityAgentDataRegistry {
  private readonly providers = new Map<
    keyof ObservabilityAgentDataRegistryTypes,
    ObservabilityAgentDataProvider<any>
  >();

  constructor(private readonly logger: Logger) {}

  public registerDataProvider<K extends keyof ObservabilityAgentDataRegistryTypes>(
    id: K,
    provider: ObservabilityAgentDataProvider<K>
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
    context: ObservabilityAgentDataProviderDependencies
  ): Promise<ObservabilityAgentDataRegistryTypes[K]> {
    const provider = this.providers.get(id);

    if (!provider) {
      throw new Error(`No data provider registered for key: ${id}`);
    }

    return provider(context);
  }
}
