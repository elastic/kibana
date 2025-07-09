/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializerContext, Plugin as PluginType } from '@kbn/core/server';
import { CaseSuggestionRegistry } from './services/case_suggestion_registry';
import { ObservabilityCaseSuggestionRegistryConfig } from '../common/config';

export interface ObservabilityCaseSuggestionRegistryPluginSetup {
  config: ObservabilityCaseSuggestionRegistryConfig;
  caseSuggestionRegistry: CaseSuggestionRegistry;
}

export interface ObservabilityCaseSuggestionRegistryPluginStart {
  config: ObservabilityCaseSuggestionRegistryConfig;
  caseSuggestionRegistry: CaseSuggestionRegistry;
}

export class ObservabilitySharedPlugin implements PluginType {
  private config?: ObservabilityCaseSuggestionRegistryConfig;
  private caseSuggestionRegistry?: CaseSuggestionRegistry;

  constructor(
    private readonly initContext: PluginInitializerContext<ObservabilityCaseSuggestionRegistryConfig>
  ) {}

  public setup() {
    this.config = this.initContext.config.get<ObservabilityCaseSuggestionRegistryConfig>();
    this.caseSuggestionRegistry = new CaseSuggestionRegistry();
    return {
      config: this.config,
      caseSuggestionRegistry: this.caseSuggestionRegistry,
    };
  }

  public start() {
    return {
      config: this.config || {},
      caseSuggestionRegistry: this.caseSuggestionRegistry,
    };
  }

  public stop() {}
}
