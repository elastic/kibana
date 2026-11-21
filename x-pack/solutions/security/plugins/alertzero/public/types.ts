/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, ReactNode } from 'react';
import type { AgenticInvestigationsPublicPluginStart } from '@kbn/agentic-investigations-plugin/public';
import type { ProposalsPublicPluginStart } from '@kbn/proposals-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { WorkflowsPublicPluginStart } from '@kbn/workflows-management-plugin/public';

export interface AlertZeroClientConfig {
  enabled: boolean;
}

export interface AlertZeroSetupDependencies {
  /** Required plugin, see `requiredPlugins` in kibana.jsonc. */
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export interface AlertZeroStartDependencies {
  licensing: LicensingPluginStart;
  cloud?: CloudStart;
  agentBuilder?: AgentBuilderPluginStart;
  agenticInvestigations?: AgenticInvestigationsPublicPluginStart;
  proposals?: ProposalsPublicPluginStart;
  /** Optional; absent in minimal Kibana deployments without X-Pack security. */
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  share?: SharePluginStart;
  workflowsManagement?: WorkflowsPublicPluginStart;
}

export interface ClassicPageTemplateProps {
  /** The navigation entry to select: `alertzero:<deep link id>`. */
  selectedId: string;
  children: ReactNode;
}

/** A Classic page template that renders its solution's navigation around AlertZero's pages. */
export type ClassicPageTemplate = ComponentType<ClassicPageTemplateProps>;

/**
 * Soft-enable contract. Always returned from `setup()` so optional consumers
 * can gate on `enabled` without reading `xpack.alertzero` config themselves.
 */
export interface AlertZeroPublicSetup {
  enabled: boolean;
  /**
   * Sets the page template AlertZero renders around its pages in Classic chrome, so they show the
   * Security navigation. Security Solution sets it. Absent when the plugin is disabled.
   */
  setClassicPageTemplate?: (template: ClassicPageTemplate) => void;
}
export interface AlertZeroPublicStart {
  setServerlessTierAvailable: (available: boolean) => void;
}
