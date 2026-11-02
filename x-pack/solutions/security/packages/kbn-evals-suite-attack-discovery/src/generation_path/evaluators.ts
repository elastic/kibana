/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AttackDiscoveryDatasetExample } from '../types';
import { idsForChain } from './fixture';
import type { GenerationPathTaskOutput } from './workflow_task';

type GenerationPathEvaluator = Evaluator<AttackDiscoveryDatasetExample, GenerationPathTaskOutput>;

/** Share of a chain's alerts a discovery must cite, and share of its ids that must be the chain's. */
const CHAIN_RECALL_MIN = 0.75;
const CHAIN_PRECISION_MIN = 0.75;

const cited = (output: GenerationPathTaskOutput | undefined): string[][] =>
  (output?.insights ?? []).map(({ alertIds }) => alertIds);

/** The model's, not infra's: a refusal, an empty completion, failed batches or an overrun. */
export const createModelFailureEvaluator = (): GenerationPathEvaluator => ({
  name: 'GenerationPathModelFailure',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) =>
    output?.modelFailure
      ? { score: 0, label: 'model_failure', explanation: output.modelFailure }
      : { score: 1, label: 'ok' },
});

/** A hallucinated alert id is a hard failure: any id that is not a real alert scores 0. */
export const createAlertIdFidelityEvaluator = (): GenerationPathEvaluator => ({
  name: 'AlertIdFidelity',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const insights = output?.insights;
    if (!insights || insights.length === 0) {
      return { score: null, label: 'N/A', explanation: 'No discoveries to check.' };
    }
    if (output.unknownAlertIds.length > 0) {
      return {
        score: 0,
        label: 'hallucinated_alert_ids',
        explanation: `Cited ${
          output.unknownAlertIds.length
        } alert ids that do not exist: ${output.unknownAlertIds.slice(0, 5).join(', ')}`,
      };
    }
    if (output.foreignAlertIds.length > 0) {
      return {
        score: 0,
        label: 'foreign_alert_ids',
        explanation: `Cited ${
          output.foreignAlertIds.length
        } real alerts the fixture did not seed: ${output.foreignAlertIds.slice(0, 5).join(', ')}`,
      };
    }
    return { score: 1, label: 'ok' };
  },
});

/** Fraction of the true attack chains that one discovery covers cleanly. */
export const createChainCoverageEvaluator = (): GenerationPathEvaluator => ({
  name: 'AttackChainCoverage',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const discoveries = cited(output);
    const chains = [idsForChain('exfil_windows'), idsForChain('exfil_linux')];
    const covered = chains.filter((chain) =>
      discoveries.some((ids) => {
        const hits = ids.filter((id) => chain.includes(id)).length;
        return (
          hits / chain.length >= CHAIN_RECALL_MIN &&
          ids.length > 0 &&
          hits / ids.length >= CHAIN_PRECISION_MIN
        );
      })
    ).length;
    return {
      score: covered / chains.length,
      label: `${covered}/${chains.length}`,
      explanation: `A chain counts when one discovery cites >=${
        CHAIN_RECALL_MIN * 100
      }% of its alerts and >=${CHAIN_PRECISION_MIN * 100}% of that discovery's ids belong to it.`,
    };
  },
});

/** The approved-backup chain reuses the attack's rule names; citing its alerts is a false positive. */
export const createFpChainSuppressionEvaluator = (): GenerationPathEvaluator => ({
  name: 'FpChainSuppression',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const decoy = idsForChain('backup_decoy');
    const citedDecoy = new Set(
      cited(output)
        .flat()
        .filter((id) => decoy.includes(id))
    );
    return {
      score: 1 - citedDecoy.size / decoy.length,
      label: citedDecoy.size === 0 ? 'suppressed' : 'false_positive',
      explanation: `${citedDecoy.size} of ${decoy.length} decoy-chain alerts were cited.`,
    };
  },
});

/** Every non-judge model call in the run window must carry the subject's `model.model_id`. */
export const createRoutingEvaluator = (): GenerationPathEvaluator => ({
  name: 'SubjectModelRouting',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const routing = output?.routing;
    if (!routing) {
      return { score: 0, label: 'no_token_docs', explanation: 'Token usage was not read.' };
    }
    if (routing.subjectCalls === 0) {
      return {
        score: 0,
        label: 'no_token_docs',
        explanation: `No non-judge model calls were logged (${routing.total} total, ${routing.judgeCalls} judge).`,
      };
    }
    if (routing.misrouted.length > 0) {
      return {
        score: 0,
        label: 'misrouted',
        explanation: `${routing.misrouted.length}/${
          routing.subjectCalls
        } calls ran on other models: ${routing.modelIds.join(', ')}`,
      };
    }
    return {
      score: 1,
      label: 'ok',
      explanation: `${routing.subjectCalls} calls, models ${routing.modelIds.join(
        ', '
      )}, features ${routing.featureIds.join(', ')}, connectors ${routing.connectorIds.join(', ')}`,
    };
  },
});
