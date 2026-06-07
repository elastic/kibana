/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import { logStageUsage, extractUsageFromMetadata } from '../routes/lib/cost_tracker';

/**
 * Character limit applied to report text before the LLM call. Matches the
 * 30 000-char ceiling other `nl_extraction_behavioral` steps use (extract_behaviors,
 * enrich_taxonomy) and keeps connector latency predictable on large syndicated
 * feeds. The per-vertex fallback (hard req) handles the rare case (~1% of
 * ingests) where even this truncated text exceeds the connector's context window.
 */
export const DIAMOND_BODY_CHAR_LIMIT = 30_000;

const VERTICES = ['adversary', 'capability', 'infrastructure', 'victim'] as const;
type DiamondVertex = (typeof VERTICES)[number];

const VERTEX_DESCRIPTIONS: Record<DiamondVertex, string> = {
  adversary:
    'The threat actor — who conducted the activity? Consider: named APT group, ' +
    'nation-state attribution, criminal organization, insider threat.',
  capability:
    'Tools, malware, and techniques used. Consider: malware family names, exploit CVEs, ' +
    'ATT&CK technique IDs, custom tooling and adversary procedures.',
  infrastructure:
    'Attacker-controlled resources. Consider: C2 domains and IPs, delivery vectors, ' +
    'staging infrastructure, hosting providers.',
  victim:
    'Who or what was targeted. Consider: industry sector, organization name, ' +
    'geographic region, targeted role or department.',
};

const SIGNAL_GUIDE =
  '  signal: HIGH | PARTIAL | NONE\n' +
  '    HIGH:    Specific, attributable information named in the report.\n' +
  '    PARTIAL: Vague, inferred, or unattributed information.\n' +
  '    NONE:    No information for this vertex.\n' +
  '  summary: 1-3 sentence factual summary drawn directly from the text. ' +
  'Empty string ("") when signal is NONE.';

const buildSingleCallPrompt = (text: string): string =>
  `You are a threat intelligence analyst applying the Diamond Model of Intrusion Analysis.
Analyze the following threat report and classify each of the four Diamond Model vertices.

For each vertex provide:
${SIGNAL_GUIDE}

Vertices:
  adversary:      ${VERTEX_DESCRIPTIONS.adversary}
  capability:     ${VERTEX_DESCRIPTIONS.capability}
  infrastructure: ${VERTEX_DESCRIPTIONS.infrastructure}
  victim:         ${VERTEX_DESCRIPTIONS.victim}

Report text:
${text}`;

const buildVertexPrompt = (vertex: DiamondVertex, text: string): string =>
  `You are a threat intelligence analyst applying the Diamond Model of Intrusion Analysis.
Analyze the following threat report for the "${vertex}" vertex only.

${vertex.toUpperCase()}: ${VERTEX_DESCRIPTIONS[vertex]}

Provide:
${SIGNAL_GUIDE}

Report text:
${text}`;

const diamondVertexSchema = z.object({
  signal: z.enum(['HIGH', 'PARTIAL', 'NONE']),
  summary: z.string(),
});

export const extractDiamondLlmOutputSchema = z.object({
  adversary: diamondVertexSchema,
  capability: diamondVertexSchema,
  infrastructure: diamondVertexSchema,
  victim: diamondVertexSchema,
});

type DiamondVertexResult = z.infer<typeof diamondVertexSchema>;
type DiamondLlmOutput = z.infer<typeof extractDiamondLlmOutputSchema>;

export type DiamondExtractionMode = 'single_call' | 'per_vertex_fallback';

export type DiamondSignal = 'HIGH' | 'PARTIAL' | 'NONE';

export interface ExtractDiamondParams {
  text: string;
  report_id?: string;
}

export interface ExtractDiamondResult {
  adversary: DiamondVertexResult;
  capability: DiamondVertexResult;
  infrastructure: DiamondVertexResult;
  victim: DiamondVertexResult;
  signal_count: number;
  model_id: string;
  extracted_at: string;
  extraction_mode: DiamondExtractionMode;
  report_id?: string;
}

const countNonNone = (output: DiamondLlmOutput): number =>
  VERTICES.filter((v) => output[v].signal !== 'NONE').length;

const NONE_VERTEX: DiamondVertexResult = { signal: 'NONE', summary: '' };

/**
 * Extract Diamond Model fields from a threat report using a single heavy LLM
 * call. On context-overflow or parse failure, falls back to four individual
 * per-vertex calls on the same model (`per_vertex_fallback`). Per-vertex
 * failures default to NONE rather than aborting the whole extraction.
 *
 * Takes a `ScopedModel` from `resolveScopedModel()` — does not construct its
 * own inference client.
 */
export const extractDiamond = async (
  model: ScopedModel,
  logger: Logger,
  params: ExtractDiamondParams
): Promise<ExtractDiamondResult> => {
  const { text, report_id: reportId } = params;
  const truncated = text.slice(0, DIAMOND_BODY_CHAR_LIMIT);
  const modelId = model.connector.connectorId;
  const extractedAt = new Date().toISOString();

  interface RawResult<T> {
    raw: { response_metadata: Record<string, unknown> };
    parsed: T;
  }

  // Single heavy call — the normal path.
  try {
    const structured = model.chatModel.withStructuredOutput(extractDiamondLlmOutputSchema, {
      includeRaw: true,
    });
    const result = (await structured.invoke(
      buildSingleCallPrompt(truncated)
    )) as RawResult<DiamondLlmOutput>;
    const output = result.parsed;

    logStageUsage(
      logger,
      'extract_diamond/single_call',
      modelId,
      result.raw.response_metadata ?? {}
    );
    logger.debug(
      `extract_diamond single_call ok signal_count=${countNonNone(output)} report_id=${reportId}`
    );

    return {
      adversary: output.adversary,
      capability: output.capability,
      infrastructure: output.infrastructure,
      victim: output.victim,
      signal_count: countNonNone(output),
      model_id: modelId,
      extracted_at: extractedAt,
      extraction_mode: 'single_call',
      ...(reportId ? { report_id: reportId } : {}),
    };
  } catch (singleCallErr) {
    logger.debug(
      `extract_diamond single call failed, falling back to per-vertex: ` +
        `${(singleCallErr as Error).message} report_id=${reportId}`
    );
  }

  // Per-vertex fallback on the same model — handles context overflow and
  // parse errors on the structured schema. Each vertex is attempted
  // independently; a per-vertex failure defaults to NONE rather than
  // aborting the whole extraction.
  const vertexStructured = model.chatModel.withStructuredOutput(diamondVertexSchema, {
    includeRaw: true,
  });
  const vertices: Record<DiamondVertex, DiamondVertexResult> = {
    adversary: NONE_VERTEX,
    capability: NONE_VERTEX,
    infrastructure: NONE_VERTEX,
    victim: NONE_VERTEX,
  };

  let fallbackInputTokens = 0;
  let fallbackOutputTokens = 0;
  for (const vertex of VERTICES) {
    try {
      const vertexResult = (await vertexStructured.invoke(
        buildVertexPrompt(vertex, truncated)
      )) as RawResult<DiamondVertexResult>;
      vertices[vertex] = vertexResult.parsed;
      const usage = extractUsageFromMetadata(vertexResult.raw.response_metadata ?? {});
      fallbackInputTokens += usage.inputTokens;
      fallbackOutputTokens += usage.outputTokens;
    } catch (vertexErr) {
      logger.debug(
        `extract_diamond per-vertex ${vertex} failed: ` +
          `${(vertexErr as Error).message} report_id=${reportId}`
      );
    }
  }

  logStageUsage(logger, 'extract_diamond/per_vertex_fallback', modelId, {
    usage: { input_tokens: fallbackInputTokens, output_tokens: fallbackOutputTokens },
  });

  const fallbackOutput: DiamondLlmOutput = vertices;
  logger.debug(
    `extract_diamond per_vertex_fallback signal_count=${countNonNone(
      fallbackOutput
    )} report_id=${reportId}`
  );

  return {
    ...vertices,
    signal_count: countNonNone(fallbackOutput),
    model_id: modelId,
    extracted_at: extractedAt,
    extraction_mode: 'per_vertex_fallback',
    ...(reportId ? { report_id: reportId } : {}),
  };
};
