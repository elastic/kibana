/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset } from '@kbn/evals';
import Fs from 'fs/promises';
import Path from 'path';
import type { LeadGenerationDatasetExample, LeadGenerationTaskExpectedOutput } from '../types';

const DEFAULT_DATASET_NAME = 'lead generation: local jsonl';
const DEFAULT_DATASET_DESCRIPTION =
  'Lead Generation evaluation dataset loaded from a local JSONL file';

/**
 * Resolves the JSONL path from LEAD_GENERATION_DATASET_JSONL_PATH env var,
 * falling back to the conventional location under data/.
 */
const resolveJsonlPath = (): string => {
  if (process.env.LEAD_GENERATION_DATASET_JSONL_PATH) {
    return Path.resolve(process.env.LEAD_GENERATION_DATASET_JSONL_PATH);
  }
  // __dirname is: .../src/dataset  →  walk up two levels to reach data/
  return Path.resolve(__dirname, '../../data/eval_dataset_lead_generation_all_scenarios.jsonl');
};

const parseJsonlLine = (line: string, lineNumber: number): LeadGenerationDatasetExample => {
  const parsed = JSON.parse(line) as {
    input?: Record<string, unknown>;
    output?: { leads?: unknown[] };
    metadata?: { Title?: string; description?: string };
  };

  return {
    input: (parsed.input ?? {}) as LeadGenerationDatasetExample['input'],
    output: {
      leads: (parsed.output?.leads ?? []) as LeadGenerationTaskExpectedOutput['leads'],
    },
    metadata: parsed.metadata ?? { Title: `Line ${lineNumber}` },
  };
};

/**
 * Load a Lead Generation evaluation dataset from a local JSONL file.
 *
 * Reads from LEAD_GENERATION_DATASET_JSONL_PATH if set, otherwise from
 * the bundled data/eval_dataset_lead_generation_all_scenarios.jsonl.
 *
 * Each line must be a JSON object with:
 *   { "input": { "maxLeads"?: number }, "output": { "leads": [] }, "metadata": { "Title": "..." } }
 *
 * The output.leads array is used as a structural reference only — quality is
 * judged by the rubric evaluator, not exact-match comparison.
 */
export const loadLeadGenerationJsonlDataset = async ({
  name = DEFAULT_DATASET_NAME,
  description = DEFAULT_DATASET_DESCRIPTION,
  jsonlPath = resolveJsonlPath(),
  offset,
  limit,
}: {
  name?: string;
  description?: string;
  jsonlPath?: string;
  offset?: number;
  limit?: number;
} = {}): Promise<EvaluationDataset<LeadGenerationDatasetExample>> => {
  let text: string;
  try {
    text = await Fs.readFile(jsonlPath, 'utf-8');
  } catch (err) {
    throw new Error(
      `Could not read JSONL dataset at ${jsonlPath}.\n` +
        'Options:\n' +
        '  1. Use the bundled dataset — ensure data/eval_dataset_lead_generation_all_scenarios.jsonl is present\n' +
        '  2. Set LEAD_GENERATION_DATASET_JSONL_PATH to point at a custom file\n' +
        '  3. Use the golden cluster (set LEAD_GENERATION_DATASET_NAME instead)\n' +
        'See data/README.md for the expected format.',
      { cause: err }
    );
  }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const startAt = offset != null && Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const max = limit != null && Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : undefined;
  const sliced = lines.slice(startAt, max != null ? startAt + max : undefined);
  const examples = sliced.map((line, i) => parseJsonlLine(line, startAt + i + 1));

  if (examples.length === 0) {
    throw new Error(
      `No examples parsed from ${jsonlPath}. ` +
        'The file may be empty or contain only blank lines.'
    );
  }

  return { name, description, examples };
};
