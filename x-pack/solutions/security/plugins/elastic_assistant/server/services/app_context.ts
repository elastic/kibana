/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { defaultAssistantFeatures, AssistantFeatures } from '@kbn/elastic-assistant-common';
import { AssistantTool } from '../types';

export type PluginName = string;
export type RegisteredToolsStorage = Map<PluginName, Set<AssistantTool>>;
export type RegisteredFeaturesStorage = Map<PluginName, AssistantFeatures>;
export type GetRegisteredTools = (pluginName: string | string[]) => AssistantTool[];
export type GetRegisteredFeatures = (pluginName: string) => AssistantFeatures;
export interface ElasticAssistantAppContext {
  logger: Logger;
}
export enum CallbackIds {
  DefendInsightsPostCreate = 'defend-insights:post-create',
  DefendInsightsPreCreate = 'defend-insights:pre-create',
  DefendInsightsPostFetch = 'defend-insights:post-fetch',
}
export type RegisteredCallbacks = Map<CallbackIds, Function[]>;

/**
 * Service for managing context specific to the Elastic Assistant
 *
 * Inspired by `AppContextService` impl from fleet plugin: x-pack/platform/plugins/shared/fleet/server/services/app_context.ts
 */
class AppContextService {
  private logger: Logger | undefined;
  private registeredTools: RegisteredToolsStorage = new Map<PluginName, Set<AssistantTool>>();
  private registeredFeatures: RegisteredFeaturesStorage = new Map<PluginName, AssistantFeatures>();
  private registeredCallbacks: RegisteredCallbacks = new Map<CallbackIds, Function[]>();

  public start(appContext: ElasticAssistantAppContext) {
    this.logger = appContext.logger;
  }

  public stop() {
    this.registeredTools.clear();
    this.registeredFeatures.clear();
  }

  /**
   * Register tools to be used by the Elastic Assistant
   *
   * @param pluginName
   * @param tools
   */
  public registerTools(pluginName: string, tools: AssistantTool[]) {
    this.logger?.debug('AppContextService:registerTools');
    this.logger?.debug(`pluginName: ${pluginName}`);
    this.logger?.debug(`tools: ${tools.map((tool) => tool.name).join(', ')}`);

    if (!this.registeredTools.has(pluginName)) {
      this.logger?.debug('plugin has no tools, initializing...');
      this.registeredTools.set(pluginName, new Set<AssistantTool>());
    }
    tools.forEach((tool) => this.registeredTools.get(pluginName)?.add(tool));
  }

  /**
   * Get the registered tools
   *
   * @param pluginName
   */
  public getRegisteredTools(pluginName: string | string[]): AssistantTool[] {
    const pluginNames = Array.isArray(pluginName) ? pluginName : [pluginName];

    const tools = [
      ...new Set(
        pluginNames
          .map((name) => this.registeredTools?.get(name) ?? new Set<AssistantTool>())
          .flatMap((set) => [...set])
      ),
    ];

    this.logger?.debug('AppContextService:getRegisteredTools');
    this.logger?.debug(`pluginName: ${pluginName}`);
    this.logger?.debug(`tools: ${tools.map((tool) => tool.name).join(', ')}`);

    return tools;
  }

  /**
   * Register features to be used by the Elastic Assistant
   *
   * @param pluginName
   * @param features
   */
  public registerFeatures(pluginName: string, features: Partial<AssistantFeatures>) {
    this.logger?.debug('AppContextService:registerFeatures');
    this.logger?.debug(`pluginName: ${pluginName}`);
    this.logger?.debug(
      () =>
        `features: ${Object.entries(features)
          .map(([feature, enabled]) => `${feature}:${enabled}`)
          .join(', ')}`
    );

    if (!this.registeredFeatures.has(pluginName)) {
      this.logger?.debug('plugin has no features, initializing...');
      this.registeredFeatures.set(pluginName, defaultAssistantFeatures);
    }

    const registeredFeatures = this.registeredFeatures.get(pluginName);
    if (registeredFeatures != null) {
      this.registeredFeatures.set(pluginName, { ...registeredFeatures, ...features });
    }
  }

  /**
   * Get the registered features
   *
   * @param pluginName
   */
  public getRegisteredFeatures(pluginName: string): AssistantFeatures {
    const features = this.registeredFeatures?.get(pluginName) ?? defaultAssistantFeatures;

    this.logger?.debug('AppContextService:getRegisteredFeatures');
    this.logger?.debug(`pluginName: ${pluginName}`);
    this.logger?.debug(
      () =>
        `features: ${Object.entries(features)
          .map(([feature, enabled]) => `${feature}:${enabled}`)
          .join(', ')}`
    );

    return features;
  }

  /**
   * Register a callback to a callbackId
   * @param callbackId
   * @param callback
   */
  public registerCallback(callbackId: CallbackIds, callback: Function) {
    const callbacks = this.registeredCallbacks.get(callbackId) ?? [];
    this.registeredCallbacks.set(callbackId, [...callbacks, callback]);
  }

  /**
   * Get all registered callbacks for a callbackId
   * @param callbackId
   */
  public getRegisteredCallbacks(callbackId: CallbackIds): Function[] {
    return this.registeredCallbacks.get(callbackId) ?? [];
  }
}

export const appContextService = new AppContextService();
