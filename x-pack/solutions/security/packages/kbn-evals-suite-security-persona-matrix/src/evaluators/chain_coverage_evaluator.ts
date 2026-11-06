/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type {
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput,
} from '@kbn/evals-suite-attack-discovery/src/types';
import { isRecord } from './task_output_helpers';

export const CHAIN_COVERAGE_EVALUATOR_NAME = 'ChainCoverage';

/** One host per kill chain in the 95-alert corpus (chain name in the trailing comment). */
export const KILL_CHAIN_HOSTS = [
  'SRVMAC08', // macos-keychain
  'SRVWIN07', // word-macro-vbs
  'SRVWIN06', // bumblebee
  'SRVWIN04', // qbot
  'SRVWIN03', // emotet
  'SRVWIN02', // sodinokibi
  'SRVWIN01', // excel-certutil
  'SRVNIX05', // bpfdoor
] as const;

const PRECISION_PASS_THRESHOLD = 0.8;

// The -PRIV twin is the same machine seen through a privileged account, so it
// belongs to the parent chain rather than counting as a separate one.
const HOST_PATTERN = /\b(SRV(?:MAC|WIN|NIX)\d\d)(?:-PRIV)?\b/g;

const TEXT_FIELDS = [
  ['title'],
  ['summaryMarkdown', 'summary_markdown'],
  ['detailsMarkdown', 'details_markdown'],
  ['entitySummaryMarkdown', 'entity_summary_markdown'],
] as const;

const getDiscoveryText = (discovery: unknown): string => {
  if (!isRecord(discovery)) return '';
  return TEXT_FIELDS.map((keys) => {
    const value = keys.map((key) => discovery[key]).find((v) => typeof v === 'string');
    return typeof value === 'string' ? value : '';
  }).join('\n');
};

const getChainsMentioned = (discovery: unknown): Set<string> => {
  const chains = new Set<string>();
  for (const match of getDiscoveryText(discovery).matchAll(HOST_PATTERN)) {
    const host = match[1];
    if ((KILL_CHAIN_HOSTS as readonly string[]).includes(host)) {
      chains.add(host);
    }
  }
  return chains;
};

/**
 * Score is recall over the 8 kill chains; the pass label also needs precision
 * >= 0.8. Precision counts a discovery only when it names exactly one chain no
 * earlier discovery claimed, so a discovery that merges several chains counts
 * AGAINST precision even though its chains still count toward recall. This
 * matches the reference benchmark, which expects one chain per discovery.
 */
export const createChainCoverageEvaluator = (): Evaluator<
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput
> => ({
  name: CHAIN_COVERAGE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const insights = Array.isArray(output?.insights) ? output.insights : [];
    const chainsPerDiscovery = insights.map(getChainsMentioned);
    const covered = new Set(chainsPerDiscovery.flatMap((chains) => [...chains]));

    // A discovery only counts toward precision when it maps to exactly one
    // chain that no earlier discovery already claimed.
    const claimed = new Set<string>();
    chainsPerDiscovery.forEach((chains) => {
      const [chain] = [...chains];
      if (chains.size === 1 && !claimed.has(chain)) {
        claimed.add(chain);
      }
    });
    const uniquelyAttributed = claimed.size;

    const recall = covered.size / KILL_CHAIN_HOSTS.length;
    const precision = insights.length > 0 ? uniquelyAttributed / insights.length : 0;
    const pass = recall === 1 && precision >= PRECISION_PASS_THRESHOLD;

    return {
      score: recall,
      label: pass ? 'pass' : 'fail',
      metadata: {
        chains: Object.fromEntries(KILL_CHAIN_HOSTS.map((host) => [host, covered.has(host)])),
        recall,
        precision,
        discoveries: insights.length,
      },
    };
  },
});
