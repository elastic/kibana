/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Evaluator } from '@kbn/evals';
import { getDiscoveryMarkdown } from '../audit_failure_classes/discovery_text';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import { notApplicable, resolveAuditInputs } from './audit_evaluator_helpers';

export const AUDIT_CONDITIONAL_REMEDIATION_EVALUATOR_NAME = 'ConditionalRemediation';

const CONTAINMENT_VERBS =
  'revoke|rotate|disable|delete|block|isolate|terminate|quarantine|suspend|deactivate';

const FILLER = '(?:(?:immediately|urgently|promptly|also|then|next|and|please|now)\\s+)*';

/** The verb opens the clause, as in "Revoke the key" or "Immediately isolate the host". */
const IMPERATIVE_AT_START = new RegExp(
  `^${FILLER}(?:(?:recommended|recommendation|action|actions|remediation|containment|response)s?\\s*:?\\s*)*${FILLER}(?:${CONTAINMENT_VERBS})\\b`,
  'i'
);

/** The verb follows a directive, as in "should rotate", "must disable", "recommend blocking". */
const DIRECTIVE_BEFORE_VERB = new RegExp(
  `\\b(?:should|must|need to|needs to|have to|ought to|recommend(?:ed|s)?(?: that)?(?: you)?(?: to)?)\\s+${FILLER}(?:the\\s+)?(?:${CONTAINMENT_VERBS})\\b`,
  'i'
);

/** Wording that makes a containment step depend on the finding being confirmed. */
const CONDITIONAL_CUES: readonly RegExp[] = [
  /\bif\b.*\b(?:confirm\w*|unauthori[sz]ed|malicious|compromis\w*|verif\w+|validat\w+|suspicious|legitimate|not expected)\b/i,
  /\b(?:after|once|when|pending|until)\s+(?:you\s+)?(?:verif\w+|validat\w+|confirm\w+|investigat\w+)/i,
  /\bconsider\b/i,
  /\bunless\b/i,
  /\bonly if\b/i,
];

const TOKEN_PATTERN = /\{\{.*?\}\}/g;

const splitSegments = (markdown: string): string[] =>
  markdown
    .replace(TOKEN_PATTERN, 'ENTITY')
    .split(/(?<=[.!?])\s+|\n+|;/)
    .map((segment) =>
      segment
        .replace(/^[\s>*#\-\d.)]+/, '')
        .replace(/\*\*|__/g, '')
        .trim()
    )
    .filter((segment) => segment.length > 0);

const isConditional = (segment: string): boolean =>
  CONDITIONAL_CUES.some((cue) => cue.test(segment));

/** Segments that give an imperative containment instruction with no conditional cue. */
export const findUnconditionalContainment = (markdown: string): string[] => {
  const segments = splitSegments(markdown);
  return segments.filter((segment, index) => {
    const isInstruction = IMPERATIVE_AT_START.test(segment) || DIRECTIVE_BEFORE_VERB.test(segment);
    if (!isInstruction || isConditional(segment)) return false;
    const previous = segments[index - 1];
    const governedByHeader =
      previous !== undefined && previous.endsWith(':') && isConditional(previous);
    return !governedByHeader;
  });
};

/**
 * Unconditional containment advice: when the alerts do not confirm malicious activity
 * (`confirmed: false`), 0 if any discovery tells the reader to revoke, rotate, disable,
 * delete, block, isolate, terminate or quarantine without a conditional.
 *
 * Heuristic, keyword based. It reads a clause as an instruction when the verb opens it or
 * follows should/must/recommend, and as conditional when the clause contains an
 * "if confirmed"-style cue, "once/after verifying", "consider", "unless" or "only if", or follows
 * a line that ends in a colon and carries one. It does not parse grammar: a conditional
 * split across sentences ("Verify first. Then revoke.") is flagged, a verb in the past or
 * passive form is never flagged, and a negated instruction ("do not block") that opens with
 * the verb's neighbour is not caught. Treat it as a screen for review, not a verdict.
 */
export const createAuditConditionalRemediationEvaluator = (): Evaluator<
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput
> => ({
  name: AUDIT_CONDITIONAL_REMEDIATION_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const resolved = resolveAuditInputs({ metadata, output });
    if ('result' in resolved) return resolved.result;

    const { gold, discoveries } = resolved;
    if (gold.confirmed) {
      return notApplicable('Scenario is confirmed malicious; containment advice is not scored.');
    }
    if (discoveries.length === 0) {
      return notApplicable('No discoveries to check for remediation advice.');
    }

    const offending = discoveries.flatMap((discovery) =>
      findUnconditionalContainment(getDiscoveryMarkdown(discovery)).map(
        (segment) => `"${discovery.title}": ${segment}`
      )
    );

    return offending.length === 0
      ? { score: 1, label: 'conditional_or_none' }
      : { score: 0, label: 'unconditional_containment', explanation: offending.join(' | ') };
  },
});
