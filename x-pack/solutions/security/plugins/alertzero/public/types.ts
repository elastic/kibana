/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { WorkflowsPublicPluginStart } from '@kbn/workflows-management-plugin/public';
import type { ImpactEntityOpener } from './impact_entity_opener';

export interface AlertZeroClientConfig {
  enabled: boolean;
}

export type AlertZeroSetupDependencies = Record<string, never>;

export interface AlertZeroStartDependencies {
  /** Required plugin, see `requiredPlugins` in kibana.jsonc. */
  agentBuilder: AgentBuilderPluginStart;
  /** Optional; absent in minimal Kibana deployments without X-Pack security. */
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  share?: SharePluginStart;
  workflowsManagement?: WorkflowsPublicPluginStart;
}

/**
 * Soft-enable contract. Always returned from `setup()` so optional consumers
 * can gate on `enabled` without reading `xpack.alertzero` config themselves.
 */
export interface AlertZeroPublicSetup {
  enabled: boolean;
}
export interface AlertZeroPublicStart {
  /**
   * Registers the handler that opens an Impact entity as a Flyout V2 child of the investigation.
   * Invoked at click time, so Security Solution can register after this plugin's start returns.
   */
  registerImpactEntityOpener: (opener: ImpactEntityOpener) => void;
}
