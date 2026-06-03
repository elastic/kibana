/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import type { DetectionEmulationGuardrails } from './shared_guardrails';

/**
 * Typed dependency interfaces for detection-emulation tool factories.
 *
 * Inspired by andrew-goldstein's `WorkflowFetcher` DI pattern
 * (PR #260811), where every tool factory declares its dependencies via
 * a narrow interface rather than accepting the full plugin context. This
 * gives us:
 *
 * 1. **Testability** — unit tests inject stubs/mocks for exactly the
 *    surface they need, without constructing an entire plugin context.
 * 2. **Discoverability** — the interface is the canonical list of what
 *    each tool actually touches; grep the type name to find every
 *    consumer.
 * 3. **Loose coupling** — tool factories depend on shapes, not concrete
 *    classes. A future refactor (e.g. swapping `EmulationRunner` for a
 *    remote orchestrator) only needs to satisfy the interface.
 *
 * The hierarchy is:
 *
 *   `ToolFactoryDeps`        — static deps injected at tool creation time
 *                               (plugin setup phase). Shared across all
 *                               invocations of a given tool.
 *
 *   `ToolInvocationDeps`     — per-request deps resolved at tool call time
 *                               (from the Agent Builder handler context).
 *
 *   `ScenarioGeneratorDeps`  — narrow interface for the scenario generation
 *                               subsystem (only needs a `RulesClient`).
 *
 *   `DispatchDeps`           — deps for the real_execution dispatch path
 *                               (runner construction + cases client).
 */

// ─── Static (tool creation time) ────────────────────────────────────────────

/**
 * Dependencies injected once at tool creation time. These are stable for the
 * lifetime of the Kibana process and shared across every invocation.
 */
export interface ToolFactoryDeps {
  /** Core setup services (getStartServices, etc.). */
  readonly core: SecuritySolutionPluginCoreSetupDependencies;
  /** Endpoint services (authz, response actions client factory). */
  readonly endpointService: EndpointAppContextService;
  /** Kibana.yml + feature flag config. */
  readonly config: ConfigType;
  /** Plugin-scoped logger. */
  readonly logger: Logger;
  /**
   * Shared guardrail bundle (allowlist + rate limiter + concurrency gate +
   * idempotency cache). MUST be the same instances that the REST routes use.
   */
  readonly guardrails: DetectionEmulationGuardrails;
}

// ─── Per-request (tool invocation time) ─────────────────────────────────────

/**
 * Dependencies resolved per-request from the Agent Builder handler context.
 */
export interface ToolInvocationDeps {
  readonly request: KibanaRequest;
  readonly esClient: { asCurrentUser: ElasticsearchClient };
  readonly spaceId: string;
  readonly savedObjectsClient?: SavedObjectsClientContract;
}

// ─── Subsystem-specific narrow interfaces ───────────────────────────────────

/**
 * Narrow dependency interface for the scenario generator. Only needs a
 * `RulesClient` to look up the rule and read its MITRE tags.
 */
export interface ScenarioGeneratorDeps {
  readonly rulesClient: RulesClient;
}

/**
 * Narrow dependency interface for the real_execution dispatch path.
 * Isolates the runner construction concerns from the gate logic.
 */
export interface DispatchDeps {
  readonly endpointService: EndpointAppContextService;
  readonly esClient: ElasticsearchClient;
  readonly spaceId: string;
  readonly username: string;
  readonly logger: Logger;
  readonly casesClient?: unknown;
  readonly actorContext?: import('./audit_context').ActorContext;
}
