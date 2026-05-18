/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import { buildDefinitionFromEntityKIs } from '../domain/definitions/ki_definition_builder';
import type { LogsExtractionClient } from '../domain/logs_extraction';
import { EngineLogExtractionState } from '../domain/saved_objects/engine_descriptor/constants';
import type {
  KnowledgeIndicatorsConfig,
  LogExtractionConfig,
} from '../domain/saved_objects/global_state/constants';
import {
  setKiDefinitionState,
  type KiDefinitionStateEntry,
  type KiDefinitionStates,
} from './extract_entity_task_state';

/**
 * Per-run summary of the KI extraction loop. Designed to be embedded in the
 * task's log line and (in a follow-up PR) emitted as analytics events from
 * `status_report_task`.
 */
export interface KnowledgeIndicatorsLoopMetrics {
  groupsTotal: number;
  groupsProcessed: number;
  groupsSucceeded: number;
  groupsFailed: number;
  groupsSkippedNoIndexPatterns: number;
  groupsSkippedMissingSubtype: number;
  groupsTruncated: number;
}

export interface KnowledgeIndicatorsLoopResult {
  updatedStates: KiDefinitionStates | undefined;
  metrics: KnowledgeIndicatorsLoopMetrics;
}

export interface KnowledgeIndicatorsLoopDeps {
  logger: Logger;
  reader: StreamsKnowledgeIndicatorsReader;
  logsExtractionClient: LogsExtractionClient;
  namespace: string;
  config: LogExtractionConfig;
  knowledgeIndicatorsConfig: KnowledgeIndicatorsConfig;
  abortController: AbortController;
}

export interface KnowledgeIndicatorsLoopInput {
  /**
   * Previously persisted per-group extraction states, threaded forward
   * across runs by Task Manager. `undefined` for the first run after
   * deployment or after a reset.
   */
  currentStates: KiDefinitionStates | undefined;
}

/**
 * One-pass extraction loop for stream-derived (KI) entities.
 *
 * The loop runs after the static generic-type extraction completes; it
 * exists alongside, never replaces, the static path. Behavior:
 *
 *  1. Fetch entity-typed Knowledge Indicator features above the configured
 *     confidence threshold via the streams reader.
 *  2. Bucket features by `(stream_name, subtype)`. Features lacking a
 *     subtype are dropped (counted under `groupsSkippedMissingSubtype`):
 *     the upstream LLM prompt requires a subtype on identified features,
 *     so a missing subtype is a data-quality issue and should not crash
 *     the loop.
 *  3. Sort the group keys deterministically (stream then subtype) and
 *     enforce `aggregationGroupCap`. When the cap is hit we keep the
 *     first N sorted groups and discard the rest with a warn-level log;
 *     deterministic ordering is critical so the same N groups are
 *     processed across reruns and the discarded ones do not silently
 *     starve.
 *  4. Per surviving group: resolve the index patterns for the stream via
 *     the reader, build a KI definition, and delegate the actual
 *     extraction to `LogsExtractionClient.extractLogsForDefinition`. The
 *     extraction call is wrapped in try/catch so a single failing group
 *     never aborts the loop — the failure is recorded on that group's
 *     state entry as `lastError` + `lastErrorTimestamp` and the loop
 *     proceeds.
 *  5. Successful extractions update the group's pagination cursor; failed
 *     extractions preserve the prior cursor (so the next run picks up
 *     from the same place rather than skipping ahead) and clear any
 *     transient lastError envelope on success.
 *
 * Per-iteration timeouts are intentionally not implemented. Task Manager
 * already enforces an overall task timeout and threads an `AbortController`
 * down into ES queries; the persistent `kiDefinitionStates` map ensures
 * the next run resumes cleanly from wherever the abort happened. Adding
 * a per-group timer here would only make it harder to reason about the
 * task's overall runtime budget.
 */
export const runKnowledgeIndicatorsExtraction = async (
  deps: KnowledgeIndicatorsLoopDeps,
  input: KnowledgeIndicatorsLoopInput
): Promise<KnowledgeIndicatorsLoopResult> => {
  const { logger, reader, knowledgeIndicatorsConfig } = deps;
  const features = await reader.listEntityFeatures({
    minConfidence: knowledgeIndicatorsConfig.entityMinConfidence,
  });

  const { groupedFeatures, missingSubtype } = groupFeaturesByStreamAndSubtype(features);
  const sortedKeys = sortGroupKeys(groupedFeatures);
  const cap = knowledgeIndicatorsConfig.aggregationGroupCap;
  const truncated = Math.max(0, sortedKeys.length - cap);
  if (truncated > 0) {
    logger.warn(
      `Knowledge Indicators aggregation group cap of ${cap} exceeded by ${truncated} group(s); ` +
        `processing the first ${cap} after deterministic sort by (stream, subtype). ` +
        `Discarded groups will be re-evaluated next run.`
    );
  }
  const keysToProcess = sortedKeys.slice(0, cap);

  let updatedStates: KiDefinitionStates | undefined = input.currentStates;
  let succeeded = 0;
  let failed = 0;
  let skippedNoIndexPatterns = 0;

  for (const { streamName, subtype } of keysToProcess) {
    const groupFeatures = groupedFeatures[streamName][subtype];
    const result = await processGroup({
      deps,
      streamName,
      subtype,
      features: groupFeatures,
      previousState: updatedStates?.[streamName]?.[subtype],
    });
    if (result.outcome === 'skipped-no-index-patterns') {
      skippedNoIndexPatterns += 1;
      continue;
    }
    if (result.outcome === 'success') {
      succeeded += 1;
    } else {
      failed += 1;
    }
    updatedStates = setKiDefinitionState(updatedStates, streamName, subtype, result.entry);
  }

  return {
    updatedStates,
    metrics: {
      groupsTotal: sortedKeys.length,
      groupsProcessed: succeeded + failed,
      groupsSucceeded: succeeded,
      groupsFailed: failed,
      groupsSkippedNoIndexPatterns: skippedNoIndexPatterns,
      groupsSkippedMissingSubtype: missingSubtype,
      groupsTruncated: truncated,
    },
  };
};

interface GroupedFeatures {
  groupedFeatures: Record<string, Record<string, Feature[]>>;
  missingSubtype: number;
}

const groupFeaturesByStreamAndSubtype = (features: Feature[]): GroupedFeatures => {
  const grouped: Record<string, Record<string, Feature[]>> = {};
  let missingSubtype = 0;
  for (const feature of features) {
    const subtype = feature.subtype;
    if (typeof subtype !== 'string' || subtype.length === 0) {
      missingSubtype += 1;
      continue;
    }
    grouped[feature.stream_name] ??= {};
    const byStream = grouped[feature.stream_name];
    byStream[subtype] ??= [];
    byStream[subtype].push(feature);
  }
  return { groupedFeatures: grouped, missingSubtype };
};

const localeCompare = (a: string, b: string) => a.localeCompare(b);

const sortGroupKeys = (
  grouped: Record<string, Record<string, Feature[]>>
): Array<{ streamName: string; subtype: string }> => {
  const keys: Array<{ streamName: string; subtype: string }> = [];
  for (const streamName of Object.keys(grouped).sort(localeCompare)) {
    for (const subtype of Object.keys(grouped[streamName]).sort(localeCompare)) {
      keys.push({ streamName, subtype });
    }
  }
  return keys;
};

interface ProcessGroupSuccess {
  outcome: 'success';
  entry: KiDefinitionStateEntry;
}

interface ProcessGroupFailure {
  outcome: 'failure';
  entry: KiDefinitionStateEntry;
}

interface ProcessGroupSkipped {
  outcome: 'skipped-no-index-patterns';
}

type ProcessGroupResult = ProcessGroupSuccess | ProcessGroupFailure | ProcessGroupSkipped;

const processGroup = async ({
  deps,
  streamName,
  subtype,
  features,
  previousState,
}: {
  deps: KnowledgeIndicatorsLoopDeps;
  streamName: string;
  subtype: string;
  features: Feature[];
  previousState: KiDefinitionStateEntry | undefined;
}): Promise<ProcessGroupResult> => {
  const { logger, reader, logsExtractionClient, namespace, config, abortController } = deps;
  const paginationState: KiDefinitionStateEntry =
    previousState ?? (EngineLogExtractionState.parse({}) as KiDefinitionStateEntry);

  // Single per-group try/catch covers everything (index pattern resolution,
  // definition build, extraction). Any throw here marks the group failed and
  // proceeds to the next; the loop must never abort because of one bad
  // group, regardless of which step failed.
  try {
    const indexPatterns = await reader.resolveIndexPatterns(streamName);
    if (indexPatterns.length === 0) {
      logger.debug(
        `KI loop: stream '${streamName}' resolved to zero index patterns (likely deleted ` +
          `between feature ingestion and extraction); skipping subtype '${subtype}'.`
      );
      return { outcome: 'skipped-no-index-patterns' };
    }

    const definition = buildDefinitionFromEntityKIs({
      streamName,
      subtype,
      features,
      indexPatterns,
      namespace,
    });

    const result = await logsExtractionClient.extractLogsForDefinition({
      entityDefinition: definition,
      paginationState,
      config,
      indexPatterns: { localIndexPatterns: indexPatterns, remoteIndexPatterns: [] },
      opts: { abortController },
    });
    logger.debug(
      `KI loop: extracted ${result.count} entities for ${streamName}::${subtype} ` +
        `(pages=${result.pages})`
    );
    // Strip any prior error envelope on success; the cursor itself is the
    // updated state from extractLogsForDefinition.
    return {
      outcome: 'success',
      entry: result.updatedState,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(
      `KI loop: extraction failed for ${streamName}::${subtype} (${message}); ` +
        `preserving prior cursor and continuing with remaining groups.`
    );
    // Failure path: keep the prior pagination cursor so the next run does
    // not silently skip data, and stamp the error envelope on the entry.
    return {
      outcome: 'failure',
      entry: {
        ...paginationState,
        lastError: message,
        lastErrorTimestamp: new Date().toISOString(),
      },
    };
  }
};
