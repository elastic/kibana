/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from '@kbn/core/public';
import type { PluginInitializerContext } from '@kbn/core/public';
import { ObservabilityCaseSuggestionRegistryBrowserConfig } from '../common/config';
import { CaseSuggestionRegistry } from './services/case_suggestion_registry';

export type ObservabilityCaseSuggestionRegistryPluginSetup = ReturnType<
  ObservabilityCaseSuggestionRegistryPlugin['setup']
>;
export type ObservabilityCaseSuggestionRegistryPluginStart = ReturnType<
  ObservabilityCaseSuggestionRegistryPlugin['start']
>;

export class ObservabilityCaseSuggestionRegistryPlugin implements Plugin {
  private config?: ObservabilityCaseSuggestionRegistryBrowserConfig;
  private caseSuggestionRegistry?: CaseSuggestionRegistry;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup() {
    this.config =
      this.initializerContext.config.get<ObservabilityCaseSuggestionRegistryBrowserConfig>();
    this.caseSuggestionRegistry = new CaseSuggestionRegistry();

    return {
      caseSuggestionRegistry: this.caseSuggestionRegistry,
      config: this.config,
    };
  }

  public start() {
    return {
      caseSuggestionRegistry: this.caseSuggestionRegistry!,
      config: this.config,
    };
  }

  public stop() {}
}
