/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgenticInvestigationsPublicPluginStart } from '@kbn/agentic-investigations-plugin/public';
import type { ProposalsPublicPluginStart } from '@kbn/proposals-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { WorkflowsPublicPluginStart } from '@kbn/workflows-management-plugin/public';

export interface AlertZeroClientConfig {
  enabled: boolean;
}

export type AlertZeroSetupDependencies = Record<string, never>;

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

/**
 * Soft-enable contract. Always returned from `setup()` so optional consumers
 * can gate on `enabled` without reading `xpack.alertzero` config themselves.
 */
export interface AlertZeroPublicSetup {
  enabled: boolean;
}
export interface AlertZeroPublicStart {
  setServerlessTierAvailable: (available: boolean) => void;
}
