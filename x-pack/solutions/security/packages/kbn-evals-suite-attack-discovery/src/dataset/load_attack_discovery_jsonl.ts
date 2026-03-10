/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { EvaluationDataset } from '@kbn/evals';
import Fs from 'fs/promises';
import Path from 'path';
import type { AttackDiscoveryDatasetExample, AnonymizedAlert } from '../types';

const DEFAULT_DATASET_NAME = 'attack_discovery: bundled alerts (jsonl)';
const DEFAULT_DATASET_DESCRIPTION =
  'Attack Discovery evaluation dataset loaded from eval_dataset_attack_discovery_all_scenarios.jsonl';

const resolveJsonlPath = (): string => {
  // This suite lives at:
  //   x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery
  //
  // Dataset is checked in under the package itself:
  //   x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/data/...
  //
  // __dirname is: .../src/dataset
  return Path.resolve(__dirname, '../../data/eval_dataset_attack_discovery_all_scenarios.jsonl');
};

const parseJsonlLine = (line: string, lineNumber: number): AttackDiscoveryDatasetExample => {
  const parsed = JSON.parse(line) as {
    inputs?: { anonymizedAlerts?: AnonymizedAlert[] };
    outputs?: { attackDiscoveries?: unknown };
    metadata?: { Title?: string; dataset_split?: unknown };
  };

  const anonymizedAlerts = parsed.inputs?.anonymizedAlerts ?? [];
  const attackDiscoveries = (parsed.outputs?.attackDiscoveries ?? []) as AttackDiscovery[];

  return {
    input: {
      mode: 'bundledAlerts',
      anonymizedAlerts,
    },
    output: {
      attackDiscoveries,
    },
    metadata: parsed.metadata ?? { Title: `Line ${lineNumber}` },
  };
};

export const loadAttackDiscoveryBundledAlertsJsonlDataset = async ({
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
} = {}): Promise<EvaluationDataset<AttackDiscoveryDatasetExample>> => {
  const text = await Fs.readFile(jsonlPath, 'utf-8');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const startAt = offset != null && Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const max = limit != null && Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : undefined;
  const offsetLines = lines.slice(startAt);
  const limitedLines = max != null ? offsetLines.slice(0, max) : offsetLines;
  const examples = limitedLines.map((line, i) => parseJsonlLine(line, startAt + i + 1));

  return {
    name,
    description,
    examples,
  };
};
