/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

/**
 * Corpus of record: the ad2-v1 manifest plus its 32 sample files, vendored
 * read-only under src/fixtures. The corpus is deterministic (alertzero-qa-env
 * @ ea8ba99c6c594b936ea5414880765afb817cfe26); labels are derived from these
 * files, never written by hand.
 */
export interface SampleDoc {
  stream: string;
  at: number;
  doc: Record<string, unknown>;
}

export interface CorpusSample {
  rule?: { source?: string; rule_id?: string };
  chain: string;
  step: string;
  positive?: { docs: SampleDoc[] };
  negative?: { docs: SampleDoc[] };
  fixtures?: Array<{ stream: string; at?: number; doc?: Record<string, unknown> }>;
  twins?: Array<{ removed?: string; retained?: string; step?: string }>;
  [key: string]: unknown;
}

export interface ManifestChainStep {
  sample?: string;
  techniques?: string[];
  [key: string]: unknown;
}

export interface ManifestChain {
  key: string;
  kind?: string;
  hosts?: string[];
  steps: ManifestChainStep[];
  [key: string]: unknown;
}

export interface Ad2Manifest {
  version: string;
  sinkhole_zones: string[];
  chains: ManifestChain[];
  twins?: unknown;
  [key: string]: unknown;
}

const FIXTURES_DIR = __dirname;
const SAMPLES_DIR = join(FIXTURES_DIR, 'samples');

export const loadManifest = (): Ad2Manifest =>
  parse(readFileSync(join(FIXTURES_DIR, 'ad2-v1.yaml'), 'utf8')) as Ad2Manifest;

export const loadSamples = (): Record<string, CorpusSample> => {
  const out: Record<string, CorpusSample> = {};
  for (const name of readdirSync(SAMPLES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    out[name] = JSON.parse(readFileSync(join(SAMPLES_DIR, name), 'utf8')) as CorpusSample;
  }
  return out;
};
