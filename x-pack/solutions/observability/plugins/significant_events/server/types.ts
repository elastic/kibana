/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type {
  NightshiftInvestigationsServerSetup,
  NightshiftInvestigationsServerStart,
} from '@kbn/nightshift-investigations-plugin/server';
import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { AlertingServerStart as AlertingV2ServerStart } from '@kbn/alerting-v2-plugin/server';
import type {
  PluginStartContract as ActionsPluginStart,
  RelayClientContract,
} from '@kbn/actions-plugin/server';
import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  AgentBuilderSmlPluginSetup,
  AgentBuilderSmlPluginStart,
} from '@kbn/agent-builder-sml-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CPSServerSetup } from '@kbn/cps/server';
import type {
  FieldsMetadataServerSetup,
  FieldsMetadataServerStart,
} from '@kbn/fields-metadata-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type {
  NightshiftSourcesServerSetup,
  NightshiftSourcesServerStart,
} from '@kbn/nightshift-sources-plugin/server';
import type { PriceResult } from './lib/cost/price_service';
import type { KnowledgeIndicatorClient } from './lib/knowledge_indicators/knowledge_indicator_client';
import type { RuleEventsClient } from './lib/significant_events/events/rule_events_client';

export interface SignificantEventsPluginSetupDependencies {
  agentBuilder?: AgentBuilderPluginSetup;
  agentBuilderSml?: AgentBuilderSmlPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  alerting: AlertingServerSetup;
  /**
   * `void` is Alerting v2's actual setup contract (`alerting_v2/server/types.ts` declares
   * `export type AlertingServerSetup = void`), not a placeholder. It is spelled out here rather
   * than imported because the alerting_v2 server barrel does not re-export the alias. Depending on
   * it at setup only asserts plugin presence; the usable contract arrives at start.
   */
  alertingVTwo: void;
  fieldsMetadata: FieldsMetadataServerSetup;
  cloud?: CloudSetup;
  cps?: CPSServerSetup;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: WorkflowsServerPluginSetup;
  nightshiftSources: NightshiftSourcesServerSetup;
  nightshiftInvestigations?: NightshiftInvestigationsServerSetup;
}

export interface SignificantEventsPluginStartDependencies {
  actions: ActionsPluginStart;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  licensing: LicensingPluginStart;
  alerting: AlertingServerStart;
  alertingVTwo: AlertingV2ServerStart;
  inference: InferenceServerStart;
  fieldsMetadata: FieldsMetadataServerStart;
  agentBuilder?: AgentBuilderPluginStart;
  agentBuilderSml?: AgentBuilderSmlPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  nightshiftSources: NightshiftSourcesServerStart;
  nightshiftInvestigations?: NightshiftInvestigationsServerStart;
  agenticInvestigations?: AgenticInvestigationsPluginStart;
}

export interface SignificantEventsServer {
  core: CoreStart;
  logger: Logger;
  security: SecurityPluginStart;
  actions: ActionsPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  inference: InferenceServerStart;
  licensing: LicensingPluginStart;
  isServerless: boolean;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  workflowsManagement?: WorkflowsServerPluginSetup;
  agentBuilder?: AgentBuilderPluginStart;
  spaces?: SpacesPluginStart;
  cloud?: CloudSetup;
  /** The running Kibana's version, e.g. `9.2.0`. Used to identify the deployment to the Relay service. */
  kibanaVersion: string;
  /** Singleton client for the Relay service, owned by the Actions plugin. */
  relayClient?: RelayClientContract;
  nightshiftInvestigations?: NightshiftInvestigationsServerStart;
  /** Reads investigations (status of the ones a significant event lists). */
  agenticInvestigations?: AgenticInvestigationsPluginStart;
}

/**
 * Significant Events services scoped to one request and its space, for plugins that build on
 * the pipeline (the detection engine) without reaching into its internals.
 */
export interface SignificantEventsScopedServices {
  /** Space of the request. Knowledge, rules and events are scoped to it. */
  spaceId: string;
  /** Throws when Significant Events is not available here (flag, license, tier, plugins). */
  assertAccess(): Promise<void>;
  /**
   * Reads the customer's data as the request's user, across every CPS-linked project, the same
   * way knowledge extraction and detection read it.
   */
  dataEsClient: ElasticsearchClient;
  /** True when cross-project search is on, so rule queries must route to every project. */
  cpsEnabled: boolean;
  /** Knowledge indicators of the space; pass the source for writes that check its revision. */
  getKnowledgeIndicatorClient(source?: NightshiftSource): Promise<KnowledgeIndicatorClient>;
  /** Writes and reads significant events as Alerting v2 alerts in `.rule-events`. */
  getRuleEventsClient(): Promise<RuleEventsClient>;
}

/** Server start contract of Significant Events. */
export interface SignificantEventsServerStart {
  /** Services scoped to the request's user and space. */
  getScopedServices(params: { request: KibanaRequest }): Promise<SignificantEventsScopedServices>;
  /** Elastic Inference Service list prices, cached; null when the catalog cannot be read. */
  getPrices(): Promise<PriceResult | null>;
}
