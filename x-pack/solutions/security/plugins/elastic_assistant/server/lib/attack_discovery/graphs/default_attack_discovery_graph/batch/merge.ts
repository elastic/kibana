/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { Logger } from '@kbn/core/server';
import type { Document } from '@langchain/core/documents';

import type { BatchResult, MergeQualityMetrics, MergeResult } from './types';
import { extractJson } from '../../../../langchain/output_chunking/nodes/helpers/extract_json';
import { getChainWithFormatInstructions } from '../../../../langchain/output_chunking/nodes/helpers/get_chain_with_format_instructions';
import type { CombinedPrompts } from '../prompts';
import { getAttackDiscoveriesGenerationSchema } from '../schemas';

const MERGE_PROMPT_TEMPLATE = `You are a security analyst consolidating attack discovery results from multiple analysis batches.

Below are attack discoveries generated from analyzing different batches of security alerts. Some discoveries across batches may describe the SAME attack or attack chain, just observed from different alerts.

Your task:
1. Identify discoveries across batches that describe the same underlying attack or attack campaign
2. Merge related discoveries into a single comprehensive discovery that combines all relevant alert IDs and details
3. Preserve discoveries that are genuinely distinct attacks
4. Do NOT lose any alert IDs — every alert ID from the input must appear in at least one output discovery
5. Improve the merged discovery's detailsMarkdown to be comprehensive, incorporating details from all constituent discoveries
6. Keep MITRE ATT&CK tactic mappings from all merged discoveries

## Input Discoveries

{discoveries}

## Instructions

{format_instructions}

Return the consolidated list of attack discoveries. For merged discoveries, combine the alertIds arrays and create a comprehensive detailsMarkdown that covers all constituent discoveries. For distinct discoveries, return them unchanged.`;

export interface MergeDiscoveriesParams {
  batchResults: BatchResult[];
  llm: ActionsClientLlm;
  logger?: Logger;
  prompts: CombinedPrompts;
}

/**
 * Performs hierarchical merge of attack discoveries from multiple batches.
 *
 * Takes the BatchResult[] from parallel batch processing and:
 * 1. Collects all discoveries across batches
 * 2. If multiple batches produced results, runs an LLM consolidation pass
 * 3. Calculates quality metrics (alert coverage, consolidation ratio)
 * 4. Returns merged results with combined alerts and replacements
 */
export const mergeDiscoveries = async ({
  batchResults,
  llm,
  logger,
  prompts,
}: MergeDiscoveriesParams): Promise<MergeResult> => {
  const mergeStart = Date.now();

  const allAnonymizedAlerts: Document[] = [];
  const allReplacements: Replacements = {};
  const allDiscoveries: AttackDiscovery[] = [];
  let batchesFailed = 0;
  let totalDurationMs = 0;

  for (const batch of batchResults) {
    allAnonymizedAlerts.push(...batch.anonymizedAlerts);
    Object.assign(allReplacements, batch.replacements);
    allDiscoveries.push(...batch.attackDiscoveries);
    totalDurationMs += batch.durationMs;

    if (batch.errors.length > 0) {
      batchesFailed++;
    }
  }

  const uniqueAlertIdsBefore = new Set(allDiscoveries.flatMap((d) => d.alertIds));

  if (allDiscoveries.length === 0) {
    return buildMergeResult({
      allAnonymizedAlerts,
      allDiscoveries: [],
      allReplacements,
      batchesFailed,
      batchResults,
      mergeStart,
      totalDurationMs,
      uniqueAlertIdsBefore,
    });
  }

  if (batchResults.filter((b) => b.attackDiscoveries.length > 0).length <= 1) {
    logger?.debug(
      () =>
        `mergeDiscoveries: only ${batchResults.length} batch(es) with results, skipping LLM merge pass`
    );

    return buildMergeResult({
      allAnonymizedAlerts,
      allDiscoveries,
      allReplacements,
      batchesFailed,
      batchResults,
      mergeStart,
      totalDurationMs,
      uniqueAlertIdsBefore,
    });
  }

  try {
    logger?.debug(
      () =>
        `mergeDiscoveries: merging ${allDiscoveries.length} discoveries from ${batchResults.length} batches`
    );

    const mergedDiscoveries = await runMergePass({
      discoveries: allDiscoveries,
      llm,
      logger,
      prompts,
    });

    return buildMergeResult({
      allAnonymizedAlerts,
      allDiscoveries: mergedDiscoveries,
      allReplacements,
      batchesFailed,
      batchResults,
      mergeStart,
      totalDurationMs,
      uniqueAlertIdsBefore,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.warn(
      `mergeDiscoveries: LLM merge pass failed, returning unmerged results: ${errorMessage}`
    );

    return buildMergeResult({
      allAnonymizedAlerts,
      allDiscoveries,
      allReplacements,
      batchesFailed,
      batchResults,
      mergeStart,
      totalDurationMs,
      uniqueAlertIdsBefore,
    });
  }
};

const runMergePass = async ({
  discoveries,
  llm,
  logger,
  prompts,
}: {
  discoveries: AttackDiscovery[];
  llm: ActionsClientLlm;
  logger?: Logger;
  prompts: CombinedPrompts;
}): Promise<AttackDiscovery[]> => {
  const generationSchema = getAttackDiscoveriesGenerationSchema(prompts);
  const { chain, formatInstructions, llmType } = getChainWithFormatInstructions({
    llm,
    generationSchema,
  });

  const discoveriesJson = JSON.stringify(
    discoveries.map((d, i) => ({
      batchDiscoveryIndex: i,
      title: d.title,
      alertIds: d.alertIds,
      detailsMarkdown: d.detailsMarkdown,
      summaryMarkdown: d.summaryMarkdown,
      entitySummaryMarkdown: d.entitySummaryMarkdown,
      mitreAttackTactics: d.mitreAttackTactics,
    })),
    null,
    2
  );

  const query = MERGE_PROMPT_TEMPLATE.replace('{discoveries}', discoveriesJson);

  logger?.debug(() => `mergeDiscoveries: invoking LLM merge pass (${llmType})`);

  const rawResponse = (await chain.invoke({
    format_instructions: formatInstructions,
    query,
  })) as unknown as string;

  const jsonResponse = extractJson(rawResponse);
  const parsed = JSON.parse(jsonResponse);
  const result = generationSchema.parse(parsed);

  return result.insights;
};

const buildMergeResult = ({
  allAnonymizedAlerts,
  allDiscoveries,
  allReplacements,
  batchesFailed,
  batchResults,
  mergeStart,
  totalDurationMs,
  uniqueAlertIdsBefore,
}: {
  allAnonymizedAlerts: Document[];
  allDiscoveries: AttackDiscovery[];
  allReplacements: Replacements;
  batchesFailed: number;
  batchResults: BatchResult[];
  mergeStart: number;
  totalDurationMs: number;
  uniqueAlertIdsBefore: Set<string>;
}): MergeResult => {
  const mergeDurationMs = Date.now() - mergeStart;
  const uniqueAlertIdsAfter = new Set(allDiscoveries.flatMap((d) => d.alertIds));

  const totalBeforeMerge = batchResults.reduce((sum, b) => sum + b.attackDiscoveries.length, 0);

  const mergeMetrics: MergeQualityMetrics = {
    totalDiscoveriesBeforeMerge: totalBeforeMerge,
    totalDiscoveriesAfterMerge: allDiscoveries.length,
    discoveriesConsolidated: totalBeforeMerge - allDiscoveries.length,
    consolidationRatio: totalBeforeMerge > 0 ? allDiscoveries.length / totalBeforeMerge : 1,
    totalUniqueAlertIdsBeforeMerge: uniqueAlertIdsBefore.size,
    totalUniqueAlertIdsAfterMerge: uniqueAlertIdsAfter.size,
    alertCoverage:
      uniqueAlertIdsBefore.size > 0 ? uniqueAlertIdsAfter.size / uniqueAlertIdsBefore.size : 1,
    batchesProcessed: batchResults.length,
    batchesFailed,
    totalDurationMs: totalDurationMs + mergeDurationMs,
    mergeDurationMs,
  };

  return {
    attackDiscoveries: allDiscoveries,
    anonymizedAlerts: allAnonymizedAlerts,
    replacements: allReplacements,
    mergeMetrics,
  };
};
