/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializerContext, Plugin as PluginType } from '@kbn/core/server';

import { ObservabilitySharedConfig } from '../common/config';

export class ObservabilitySharedPlugin implements PluginType {
  private config?: ObservabilitySharedConfig;

  constructor(private readonly initContext: PluginInitializerContext<ObservabilitySharedConfig>) {}

  public setup() {
    this.config = this.initContext.config.get<ObservabilitySharedConfig>();
    return {};
  }

  public start() {
    return {
      config: this.config,
    };
  }

  public stop() {}
}
