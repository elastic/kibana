/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';
import { BRIEF_OUTPUT_SCHEMA, BRIEF_SYSTEM_PROMPT, buildBriefPayload } from './brief_prompt';
import { parseBriefOutput } from './parse_brief_output';
import type { BriefGenerationInput, BriefGenerationResult, BriefGenerator } from './types';

export const EXECUTIVE_BRIEF_INFERENCE_ID = 'ea-executive-brief-poc';

export interface BriefOutputRequest {
  id: string;
  system: string;
  input: string;
  schema: ToolSchema;
  abortSignal?: AbortSignal;
  retry: { onValidationError: number };
}

/** The slice of a connector-bound inference client the generator needs (`BoundInferenceClient`). */
export interface BriefOutputClient {
  output: (request: BriefOutputRequest) => Promise<{ output: object | undefined }>;
}

/**
 * Generates the brief with one structured `inference.output` call. The payload carries ENT ids
 * only (plus names in `names` mode), the system prompt is the hard-coded PoC prompt, and the
 * result is shape-checked here and then citation/relation-validated by the job.
 */
export class InferenceBriefGenerator implements BriefGenerator {
  public readonly kind = 'inference' as const;

  /** `model` is the connector's display name, recorded on the job. */
  constructor(private readonly client: BriefOutputClient, private readonly model?: string) {}

  public async generate({
    snapshot,
    mode,
    abortSignal,
  }: BriefGenerationInput): Promise<BriefGenerationResult> {
    const response = await this.client.output({
      id: EXECUTIVE_BRIEF_INFERENCE_ID,
      system: BRIEF_SYSTEM_PROMPT,
      input: `Snapshot (JSON). Narrate it in ${
        mode === 'names' ? 'entity display names' : 'ENT ids (no names are available)'
      }:\n${buildBriefPayload(snapshot, mode)}`,
      schema: BRIEF_OUTPUT_SCHEMA,
      abortSignal,
      retry: { onValidationError: 1 },
    });
    return { brief: parseBriefOutput(response.output), model: this.model };
  }
}
