/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import {
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import {
  SignificantEventsWorkflowStatus,
  type SignificantEventsWorkflowStatusResult,
  type KIsOnboardingResult,
  type KIsOnboardingStatusResult,
  type BaseFeature,
  type GeneratedSignificantEventQuery,
} from '@kbn/significant-events-schema';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { StatusError } from '../errors/status_error';
import { isStartedBefore, WorkflowExecutionService } from './workflow_execution_service';
import type { EbtTelemetryClient } from '../telemetry/ebt/client';

const EMPTY_TOKEN_COUNT: ChatCompletionTokenCount = { prompt: 0, completion: 0, total: 0 };

/**
 * Inputs for an onboarding run, grouped by the two pipeline steps. Required
 * fields drive the steps (features identification and queries generation);
 * optional fields override tuning knobs that default inside the YAML.
 *
 * These are flattened into {@link OnboardingWorkflowInputPayload} before being
 * handed to the workflow engine, whose manual trigger only accepts flat scalars.
 */
export interface SignificantEventsKIsOnboardingInputs {
  /** Source id; scheduling resolves its current slug and query revision from the catalog. */
  sourceId: string;
  sourceSlug?: string;
  sourceRevision?: string;
  rootTriggeredBy?: 'scheduled';
  features: {
    skip: boolean;
    start: number;
    end: number;
    connectorId?: string;
    maxIterations?: number;
    sampleSize?: number;
    ttlDays?: number;
    entityFilteredRatio?: number;
    diverseRatio?: number;
    maxExcludedInPrompt?: number;
    maxEntityFilters?: number;
    maxPreviouslyIdentified?: number;
    recencyThresholdHours?: number;
  };
  queries: {
    skip: boolean;
    connectorId?: string;
  };
}

/**
 * Flat scalar payload actually passed to the workflow engine's manual trigger,
 * matching the `inputs` keys declared in kbn-workflows/managed/definitions/significant_events/knowledge_indicators/onboarding.yaml. Nested
 * {@link SignificantEventsKIsOnboardingInputs} are flattened into this shape in `run()`.
 */
interface OnboardingWorkflowInputPayload {
  sourceId: string;
  sourceSlug: string;
  sourceRevision: string;
  rootTriggeredBy?: 'scheduled';
  skipFeatures: boolean;
  skipQueries: boolean;
  featuresStart: number;
  featuresEnd: number;
  featuresConnectorId?: string;
  queriesConnectorId?: string;
  featuresMaxIterations?: number;
  featuresSampleSize?: number;
  featuresTtlDays?: number;
  featuresEntityFilteredRatio?: number;
  featuresDiverseRatio?: number;
  featuresMaxExcludedInPrompt?: number;
  featuresMaxEntityFilters?: number;
  featuresMaxPreviouslyIdentified?: number;
  featuresRecencyThresholdHours?: number;
}

/**
 * Raw, flat `context.output` emitted by a completed onboarding workflow
 * execution (see the `output_result` step in kbn-workflows/managed/definitions/significant_events/knowledge_indicators/onboarding.yaml).
 * Mapped into the nested {@link SignificantEventsKIsOnboardingOutput} shape on read.
 */
interface OnboardingWorkflowOutputContext {
  sourceId: string;
  featuresSkipped: boolean;
  featuresConnectorUsed: string;
  discoveredFeatures: BaseFeature[];
  featuresTokensUsed: ChatCompletionTokenCount;
  queriesSkipped: boolean;
  queriesConnectorUsed: string;
  persistedQueries: GeneratedSignificantEventQuery[];
  queriesTokensUsed: ChatCompletionTokenCount;
  keepAliveRefreshed: number;
}

/**
 * Nested domain representation of a completed onboarding run, grouped by step.
 * Used to extract summary counts for the status response.
 */
export interface SignificantEventsKIsOnboardingOutput extends KIsOnboardingResult {
  sourceId: string;
}

/** Flattens nested onboarding inputs into the workflow engine's scalar payload. */
const toWorkflowInputPayload = ({
  inputs,
  sourceSlug,
  sourceRevision,
}: {
  inputs: SignificantEventsKIsOnboardingInputs;
  sourceSlug: string;
  sourceRevision: string;
}): OnboardingWorkflowInputPayload => {
  const { sourceId, features, queries } = inputs;
  return {
    sourceId,
    sourceSlug,
    sourceRevision,
    rootTriggeredBy: inputs.rootTriggeredBy,
    skipFeatures: features.skip,
    skipQueries: queries.skip,
    featuresStart: features.start,
    featuresEnd: features.end,
    ...(features.connectorId !== undefined && { featuresConnectorId: features.connectorId }),
    ...(queries.connectorId !== undefined && { queriesConnectorId: queries.connectorId }),
    ...(features.maxIterations !== undefined && { featuresMaxIterations: features.maxIterations }),
    ...(features.sampleSize !== undefined && { featuresSampleSize: features.sampleSize }),
    ...(features.ttlDays !== undefined && { featuresTtlDays: features.ttlDays }),
    ...(features.entityFilteredRatio !== undefined && {
      featuresEntityFilteredRatio: features.entityFilteredRatio,
    }),
    ...(features.diverseRatio !== undefined && { featuresDiverseRatio: features.diverseRatio }),
    ...(features.maxExcludedInPrompt !== undefined && {
      featuresMaxExcludedInPrompt: features.maxExcludedInPrompt,
    }),
    ...(features.maxEntityFilters !== undefined && {
      featuresMaxEntityFilters: features.maxEntityFilters,
    }),
    ...(features.maxPreviouslyIdentified !== undefined && {
      featuresMaxPreviouslyIdentified: features.maxPreviouslyIdentified,
    }),
    ...(features.recencyThresholdHours !== undefined && {
      featuresRecencyThresholdHours: features.recencyThresholdHours,
    }),
  };
};

/** Maps the raw flat workflow output into the nested onboarding output shape. */
const parseWorkflowOutput = (
  output: Partial<OnboardingWorkflowOutputContext>
): SignificantEventsKIsOnboardingOutput => ({
  sourceId: output.sourceId ?? '',
  features: {
    skipped: output.featuresSkipped === true,
    discovered: Array.isArray(output.discoveredFeatures) ? output.discoveredFeatures : [],
    connectorUsed: output.featuresConnectorUsed ?? '',
    tokensUsed: output.featuresTokensUsed ?? EMPTY_TOKEN_COUNT,
  },
  queries: {
    skipped: output.queriesSkipped === true,
    persisted: Array.isArray(output.persistedQueries) ? output.persistedQueries : [],
    connectorUsed: output.queriesConnectorUsed ?? '',
    tokensUsed: output.queriesTokensUsed ?? EMPTY_TOKEN_COUNT,
  },
  keepAlive: {
    refreshed: output.keepAliveRefreshed ?? 0,
  },
});

const CONCURRENCY_KEY_PREFIX = 'nightshift-source-onboarding-';

/**
 * Builds the concurrency group key used to correlate workflow executions with
 * a specific source. Must stay in sync with the `settings.concurrency.key`
 * template in the onboarding YAML definition.
 *
 * Keyed by slug rather than source id so execution lists stay readable. A slug
 * is unique among the live sources of a space (the engine scopes concurrency
 * groups by space), but deleting a source frees it: a new source created with
 * the same title reuses the slug and shows the deleted source's last run until
 * its own first run.
 */
export const buildConcurrencyKey = (sourceSlug: string) => `${CONCURRENCY_KEY_PREFIX}${sourceSlug}`;

/** Extracts the source slug from a concurrency key, or returns null if the prefix doesn't match. */
export const parseSourceSlugFromConcurrencyKey = (key: string): string | null => {
  if (!key.startsWith(CONCURRENCY_KEY_PREFIX)) {
    return null;
  }
  return key.slice(CONCURRENCY_KEY_PREFIX.length);
};

const FEATURES_IDENTIFICATION_CONCURRENCY_KEY_PREFIX = 'nightshift-source-features-identification-';
const QUERIES_GENERATION_CONCURRENCY_KEY_PREFIX = 'nightshift-source-queries-generation-';

const KI_CONCURRENCY_KEY_PREFIXES = [
  CONCURRENCY_KEY_PREFIX,
  FEATURES_IDENTIFICATION_CONCURRENCY_KEY_PREFIX,
  QUERIES_GENERATION_CONCURRENCY_KEY_PREFIX,
];

/**
 * Like {@link parseSourceSlugFromConcurrencyKey}, but also accepts the keys of the onboarding
 * sub-workflows (features identification, queries generation), which carry the same slug.
 */
export const parseSourceSlugFromKiConcurrencyKey = (key: string): string | null => {
  const prefix = KI_CONCURRENCY_KEY_PREFIXES.find((candidate) => key.startsWith(candidate));
  return prefix === undefined ? null : key.slice(prefix.length);
};

export const MAX_SOURCES_PER_QUERY = 10000;
/**
 * Client that wraps the workflows management API to provide a source-centric
 * interface for running, querying, and canceling KI onboarding workflows.
 *
 * Executions live in the space of the request. Each source's onboarding
 * execution is keyed by a concurrency group derived from its slug, so at most
 * one onboarding run is active per source in a space.
 */
export class SignificantEventsKIsOnboardingClient {
  private readonly workflowExecutionService: WorkflowExecutionService<OnboardingWorkflowInputPayload>;
  /**
   * The sub-workflows an onboarding run starts. They are keyed by the source slug with `drop`
   * concurrency and keep running for a while after their parent is cancelled, so a new run for
   * the slug is dropped at its first sub-workflow until they have stopped.
   */
  private readonly subWorkflowExecutionServices: Array<{
    service: WorkflowExecutionService;
    concurrencyKeyPrefix: string;
  }>;
  private readonly telemetry: EbtTelemetryClient;
  private readonly getSourcesClient: (request: KibanaRequest) => Promise<SourcesClient>;

  constructor({
    managementApi,
    telemetry,
    getSourcesClient,
  }: {
    managementApi: WorkflowsServerPluginSetup['management'];
    telemetry: EbtTelemetryClient;
    getSourcesClient: (request: KibanaRequest) => Promise<SourcesClient>;
  }) {
    this.workflowExecutionService = new WorkflowExecutionService({
      managementApi,
      workflowId: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      workflowSpaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    this.subWorkflowExecutionServices = [
      {
        workflowId: SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
        concurrencyKeyPrefix: FEATURES_IDENTIFICATION_CONCURRENCY_KEY_PREFIX,
      },
      {
        workflowId: SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
        concurrencyKeyPrefix: QUERIES_GENERATION_CONCURRENCY_KEY_PREFIX,
      },
    ].map(({ workflowId, concurrencyKeyPrefix }) => ({
      service: new WorkflowExecutionService({
        managementApi,
        workflowId,
        workflowSpaceId: GLOBAL_WORKFLOW_SPACE_ID,
      }),
      concurrencyKeyPrefix,
    }));
    this.telemetry = telemetry;
    this.getSourcesClient = getSourcesClient;
  }

  /**
   * Triggers a new onboarding workflow execution for a source.
   * Fetches the managed workflow definition from the global space and
   * runs it in the space of the request with the provided inputs.
   *
   * @throws If the managed onboarding workflow definition is not found.
   */
  async run({
    inputs,
    request,
  }: {
    inputs: SignificantEventsKIsOnboardingInputs;
    request: KibanaRequest;
  }): Promise<{ executionId: string }> {
    const { source } = await (await this.getSourcesClient(request)).get(inputs.sourceId);
    if (inputs.sourceRevision && inputs.sourceRevision !== source.esql_updated_at) {
      throw new StatusError('Source query changed before onboarding could be scheduled', 409);
    }
    const sourceSlug = source.slug;
    const executionId = await this.workflowExecutionService.execute({
      executionSpaceId: request.spaceId,
      inputs: toWorkflowInputPayload({
        inputs,
        sourceSlug,
        sourceRevision: source.esql_updated_at,
      }),
      request,
    });

    this.telemetry.trackOnboardingScheduled({
      source_id: inputs.sourceId,
      execution_id: executionId,
      workflow_id: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      space_id: request.spaceId,
      skip_features: inputs.features.skip,
      skip_queries: inputs.queries.skip,
    });

    return { executionId };
  }

  /**
   * Returns the onboarding status for a source by looking up its most recent
   * workflow execution via the concurrency group key.
   *
   * For completed executions a second fetch retrieves the full execution
   * context so output counts can be included in the result.
   */
  async getStatus({
    sourceId,
    sourceSlug,
    queryUpdatedAt,
    request,
  }: {
    sourceId: string;
    sourceSlug?: string;
    /**
     * The source's `esql_updated_at`, set at creation and moved on every query change. Runs that
     * started earlier ran another query, or belonged to a deleted source with the same slug.
     */
    queryUpdatedAt?: string;
    request: KibanaRequest;
  }): Promise<KIsOnboardingStatusResult> {
    const slug = await this.resolveSourceSlug({ sourceId, sourceSlug, request });
    const result = await this.workflowExecutionService.getStatus({
      request,
      spaceId: request.spaceId,
      queryParams: { concurrencyGroupKey: buildConcurrencyKey(slug) },
      ignoreStartedBefore: queryUpdatedAt,
    });

    if (result.status !== SignificantEventsWorkflowStatus.Completed) {
      return result;
    }

    const fullExecution = await this.workflowExecutionService.getExecution({
      request,
      id: result.executionId,
      spaceId: request.spaceId,
      options: { includeOutput: true },
    });
    const ctx = (fullExecution?.context ?? {}) as {
      output?: Partial<OnboardingWorkflowOutputContext>;
    };
    const { features, queries, keepAlive } = parseWorkflowOutput(ctx.output ?? {});
    return { ...result, features, queries, keepAlive };
  }

  /**
   * Returns a lightweight status summary for many sources in one query, keyed
   * by source id.
   *
   * Collapses all onboarding executions via {@link getRecentExecutions} and
   * filters to the requested slugs in memory (the management API can't filter
   * by a set of concurrency keys). Sources with no execution map to
   * `NotStarted`. Unlike {@link getStatus}, the completed output is omitted so
   * no extra per-source fetch is needed.
   */
  async getStatuses({
    sources,
    request,
  }: {
    /**
     * `esql_updated_at`, when set, drops runs that started before the current query, including
     * runs of a deleted source that had the same slug.
     */
    sources: Array<{ id: string; slug: string; esql_updated_at?: string }>;
    request: KibanaRequest;
  }): Promise<Record<string, SignificantEventsWorkflowStatusResult>> {
    if (sources.length === 0) {
      return {};
    }

    const statuses: Record<string, SignificantEventsWorkflowStatusResult> = {};
    const sourcesBySlug = new Map<string, { id: string; esql_updated_at?: string }>();

    for (const { id, slug, esql_updated_at: queryUpdatedAt } of sources) {
      sourcesBySlug.set(slug, { id, esql_updated_at: queryUpdatedAt });
      statuses[id] = {
        status: SignificantEventsWorkflowStatus.NotStarted,
        executionId: null,
      };
    }

    const executions = await this.getRecentExecutions(request);

    for (const execution of executions) {
      if (execution.concurrencyGroupKey === undefined) {
        continue;
      }
      const slug = parseSourceSlugFromConcurrencyKey(execution.concurrencyGroupKey);
      const source = slug === null ? undefined : sourcesBySlug.get(slug);
      if (
        source === undefined ||
        (source.esql_updated_at !== undefined && isStartedBefore(execution, source.esql_updated_at))
      ) {
        continue;
      }
      statuses[source.id] = WorkflowExecutionService.toStatusResult({
        execution,
        workflowId: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      });
    }

    return statuses;
  }

  /**
   * Cancels all non-terminal onboarding executions for a source.
   * Newer terminal duplicates do not hide an active execution.
   *
   * @returns The ID of the canceled execution, or `null` if nothing was running.
   */
  async cancel({
    sourceId,
    sourceSlug,
    request,
  }: {
    sourceId: string;
    sourceSlug?: string;
    request: KibanaRequest;
  }): Promise<string | null> {
    const slug = await this.resolveSourceSlug({ sourceId, sourceSlug, request });
    return this.cancelBySourceSlug({ sourceSlug: slug, request });
  }

  /**
   * Cancels all non-terminal onboarding executions for a slug, then the sub-workflow executions
   * they started. Unlike {@link cancel} it needs no catalog lookup, so it also works for sources
   * that were already deleted.
   *
   * Cancelling the parent leaves its running sub-workflow to wind down on its own, which can take
   * a while; cancelling it directly asks it to stop right away.
   */
  async cancelBySourceSlug({
    sourceSlug,
    request,
  }: {
    sourceSlug: string;
    request: KibanaRequest;
  }): Promise<string | null> {
    const executionId = await this.workflowExecutionService.cancelActive({
      spaceId: request.spaceId,
      request,
      concurrencyGroupKey: buildConcurrencyKey(sourceSlug),
    });
    await Promise.all(
      this.subWorkflowExecutionServices.map(({ service, concurrencyKeyPrefix }) =>
        service.cancelActive({
          spaceId: request.spaceId,
          request,
          concurrencyGroupKey: `${concurrencyKeyPrefix}${sourceSlug}`,
        })
      )
    );
    return executionId;
  }

  /**
   * Returns the non-terminal onboarding and sub-workflow executions of the request space. A
   * sub-workflow still running after its onboarding was cancelled counts: it holds the source's
   * concurrency slot, so a new run could not start yet.
   */
  async getNonTerminalExecutions({
    request,
  }: {
    request: KibanaRequest;
  }): Promise<WorkflowExecutionListItemDto[]> {
    const services = [
      this.workflowExecutionService,
      ...this.subWorkflowExecutionServices.map(({ service }) => service),
    ];
    const pages = await Promise.all(
      services.map((service) =>
        service.getExecutions(
          { statuses: [...NonTerminalExecutionStatuses], size: MAX_SOURCES_PER_QUERY },
          request.spaceId,
          request
        )
      )
    );
    return pages.flatMap(({ results }) => results);
  }

  /**
   * Cancels every non-terminal onboarding execution of the request space.
   * Used during teardown of the continuous KI onboarding workflow.
   *
   * @returns The number of executions that were canceled.
   */
  async cancelAllRunning({ request }: { request: KibanaRequest }): Promise<number> {
    const { results } = await this.workflowExecutionService.getExecutions(
      { statuses: [...NonTerminalExecutionStatuses], size: MAX_SOURCES_PER_QUERY },
      request.spaceId,
      request
    );

    if (results.length === 0) {
      return 0;
    }

    await Promise.all(
      results.map((result) =>
        this.workflowExecutionService.cancelExecution({
          id: result.id,
          spaceId: request.spaceId,
          request,
        })
      )
    );

    return results.length;
  }

  /**
   * Returns the latest onboarding execution per source, collapsed by
   * concurrency group key. At most {@link MAX_SOURCES_PER_QUERY} sources
   * are returned (one execution each), sorted by createdAt date descending.
   *
   * We sort by createdAt (not finishedAt) so the most recently *started*
   * execution wins per source: a currently running execution has no
   * finishedAt, and sorting by finishedAt would hide it behind an older
   * completed run, breaking the "already running" classification.
   */
  async getRecentExecutions(request: KibanaRequest): Promise<WorkflowExecutionListItemDto[]> {
    const { results } = await this.workflowExecutionService.getExecutions(
      {
        size: MAX_SOURCES_PER_QUERY,
        sortField: 'createdAt',
        sortOrder: 'desc',
        collapse: 'concurrencyGroupKey',
      },
      request.spaceId,
      request
    );

    return results;
  }

  private async resolveSourceSlug({
    sourceId,
    sourceSlug,
    request,
  }: {
    sourceId: string;
    sourceSlug?: string;
    request: KibanaRequest;
  }): Promise<string> {
    if (sourceSlug !== undefined) {
      return sourceSlug;
    }
    const sourcesClient = await this.getSourcesClient(request);
    const { source } = await sourcesClient.get(sourceId);
    return source.slug;
  }
}
