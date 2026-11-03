/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Evaluator } from '@kbn/evals';
import { getDiscoveryMarkdown } from '../audit_failure_classes/discovery_text';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import type { AuditReferenceResolver } from '../audit_failure_classes/registry';
import { notApplicable, resolveAuditInputs } from './audit_evaluator_helpers';

export const AUDIT_CONDITIONAL_REMEDIATION_EVALUATOR_NAME = 'ConditionalRemediation';

/** Stems of the containment verbs; each is matched as a base form and as a gerund. */
const VERB_STEMS = [
  'revok',
  'rotat',
  'disabl',
  'delet',
  'isolat',
  'terminat',
  'quarantin',
  'deactivat',
];
const BASE_VERBS = `${VERB_STEMS.map((stem) => `${stem}e`).join('|')}|block|suspend`;
const GERUNDS = `${VERB_STEMS.map((stem) => `${stem}ing`).join('|')}|blocking|suspending`;
const ANY_FORM = `${BASE_VERBS}|${GERUNDS}`;

const FILLER =
  '(?:(?:immediately|urgently|promptly|also|then|next|first|finally|and|please|now)\\s*,?\\s+)*';

/** The verb opens the clause, as in "Revoke the key" or "Immediately isolate the host". */
const IMPERATIVE_AT_START = new RegExp(
  `^${FILLER}(?:(?:recommended|recommendation|action|actions|remediation|containment|response)s?\\s*:?\\s*)*${FILLER}(?:${BASE_VERBS})\\b`,
  'i'
);

/**
 * The verb follows a directive, as in "should rotate", "must disable", "recommend blocking",
 * "prioritize revoking", "start by isolating". Gerunds count: "We recommend blocking the IP."
 */
const DIRECTIVE_BEFORE_VERB = new RegExp(
  `\\b(?:should|must|need to|needs to|have to|ought to|recommend(?:ed|s)?(?: that)?(?: you)?(?: to)?|advise[sd]?(?: that)?(?: you)?(?: to)?|prioriti[sz]e|start by|begin by|make sure to|ensure (?:that )?(?:you )?)\\s+${FILLER}(?:the\\s+)?(?:${ANY_FORM})\\b`,
  'i'
);

/** A gerund subject under a directive word: "Revoking the key should be prioritized." */
const GERUND_SUBJECT = new RegExp(
  `^${FILLER}(?:${GERUNDS})\\b.*\\b(?:should|must|needs?|require[sd]?|necessary|priorit\\w+|recommended|critical|essential|urgent\\w*|imperative|advised|vital)\\b`,
  'i'
);

/** "It is critical to revoke the key", "It is essential that you rotate the secrets." */
const IMPORTANCE_FRAME = new RegExp(
  `\\b(?:critical|essential|important|necessary|imperative|advisable|vital|urgent|recommended)\\s+(?:to\\s+|that (?:you|we|the \\w+) (?:should |must )?)${FILLER}(?:the\\s+)?(?:${ANY_FORM})\\b`,
  'i'
);

/**
 * "consider" is a hedge only before whether/if. Otherwise it is a soft directive:
 * "Consider disabling the account", "Consider the account compromised and revoke its keys."
 */
const CONSIDER_DIRECTIVE = new RegExp(
  `\\bconsider\\b(?!\\s+(?:whether|if)\\b)(?:\\s+${FILLER}(?:the\\s+)?(?:${GERUNDS})\\b|.*\\b(?:and|then)\\s+${FILLER}(?:${BASE_VERBS})\\b)`,
  'i'
);

const DIRECTIVES: readonly RegExp[] = [
  IMPERATIVE_AT_START,
  DIRECTIVE_BEFORE_VERB,
  GERUND_SUBJECT,
  IMPORTANCE_FRAME,
  CONSIDER_DIRECTIVE,
];

/**
 * Wording that makes a step depend on the finding being confirmed. A bare "if", "once", "after",
 * "unless", "when", "until" or "pending" hedges only when a confirmation word follows it in the
 * same segment; "if you have not already" does not.
 */
const CONFIRMATION_WORDS =
  '(?:confirm\\w*|verif\\w+|validat\\w+|malicious|unauthori[sz]ed|determin\\w+|investigat\\w+)';
const CONDITIONAL_CUES: readonly RegExp[] = [
  new RegExp(`\\b(?:if|once|after|unless|when|until|pending)\\b.*\\b${CONFIRMATION_WORDS}`, 'i'),
];

const TOKEN_PATTERN = /\{\{.*?\}\}/g;

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+/;

const splitSentences = (line: string): string[] =>
  line
    .replace(TOKEN_PATTERN, 'ENTITY')
    .split(/(?<=[.!?])\s+|;/)
    .map((segment) =>
      segment
        .replace(/^[\s>*#\-\d.)]+/, '')
        .replace(/\*\*|__/g, '')
        .trim()
    )
    .filter((segment) => segment.length > 0);

const isConditional = (segment: string): boolean =>
  CONDITIONAL_CUES.some((cue) => cue.test(segment));

/**
 * Segments that give an imperative containment instruction with no conditional cue. A list
 * under a colon-terminated conditional header ("If confirmed unauthorized:") is governed by it
 * until the list ends.
 */
export const findUnconditionalContainment = (markdown: string): string[] => {
  const flagged: string[] = [];
  let governedByHeader = false;
  for (const line of markdown.split('\n')) {
    const sentences = splitSentences(line);
    const isListItem = LIST_ITEM.test(line);
    if (sentences.length > 0) {
      if (!isListItem) governedByHeader = false;
      for (const sentence of sentences) {
        const isInstruction = DIRECTIVES.some((directive) => directive.test(sentence));
        if (isInstruction && !isConditional(sentence) && !governedByHeader) {
          flagged.push(sentence);
        }
      }
      const endsWithColon = line.trim().endsWith(':');
      if (!isListItem && endsWithColon && isConditional(sentences[sentences.length - 1])) {
        governedByHeader = true;
      }
    }
  }
  return flagged;
};

/**
 * Unconditional containment advice. A discovery is exempt when every alert it cites belongs to a
 * group the gold marks as confirmed malicious (`confirmedGroups`); advice on anything else, or in
 * a discovery that cites nothing, is scored. 0 if any scored discovery tells the reader to revoke,
 * rotate, disable, delete, block, isolate, terminate, quarantine, suspend or deactivate without a
 * conditional; N/A when nothing is scored.
 *
 * Heuristic, regex based; it does not parse grammar. A clause is an instruction when the verb
 * opens it, follows a directive (should, must, recommend, prioritize, "critical to"), is a gerund
 * under a directive ("Revoking the key should be prioritized"), or follows "consider" that is not
 * followed by whether/if. A clause is conditional only when if/once/after/unless/when/until/pending
 * is followed in the same clause by a confirmation word (confirm, verify, validate, malicious,
 * unauthorized, determine, investigate), or when it sits under a colon-terminated header that
 * does. Known misses: a conditional split across sentences ("Verify first. Then revoke.") is
 * flagged; past or passive forms ("the key was revoked") are never flagged; negation ("do not
 * block") is not understood; a hedge word elsewhere in the clause can excuse a real directive.
 * Treat it as a screen for review, not a verdict.
 */
export const createAuditConditionalRemediationEvaluator = (
  resolveReference?: AuditReferenceResolver
): Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput> => ({
  name: AUDIT_CONDITIONAL_REMEDIATION_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const resolved = resolveAuditInputs({ metadata, output, resolveReference });
    if ('result' in resolved) return resolved.result;

    const { gold, discoveries } = resolved;
    if (discoveries.length === 0) {
      return notApplicable('No discoveries to check for remediation advice.');
    }

    const confirmedIds = new Set(
      gold.confirmedGroups.flatMap((group) => gold.alertGroups[group] ?? [])
    );
    const scored = discoveries.filter(
      ({ alertIds }) => alertIds.length === 0 || alertIds.some((id) => !confirmedIds.has(id))
    );
    if (scored.length === 0) {
      return notApplicable('Every discovery cites only confirmed-malicious alerts.');
    }

    const offending = scored.flatMap((discovery) =>
      findUnconditionalContainment(getDiscoveryMarkdown(discovery)).map(
        (segment) => `"${discovery.title}": ${segment}`
      )
    );

    return offending.length === 0
      ? { score: 1, label: 'conditional_or_none' }
      : { score: 0, label: 'unconditional_containment', explanation: offending.join(' | ') };
  },
});
