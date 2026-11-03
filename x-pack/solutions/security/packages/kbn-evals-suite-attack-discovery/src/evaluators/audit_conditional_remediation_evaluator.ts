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

const BASE_VERBS = [
  'revoke',
  'rotate',
  'disable',
  'delete',
  'isolate',
  'terminate',
  'quarantine',
  'deactivate',
  'block',
  'suspend',
  'reset',
  'kill',
  'remove',
  'contain',
  'lock',
  'reimage',
  'wipe',
  'shut down',
  'ban',
].join('|');
const GERUNDS = [
  'revoking',
  'rotating',
  'disabling',
  'deleting',
  'isolating',
  'terminating',
  'quarantining',
  'deactivating',
  'blocking',
  'suspending',
  'resetting',
  'killing',
  'removing',
  'containing',
  'locking',
  'reimaging',
  'wiping',
  'shutting down',
  'banning',
].join('|');
const ANY_FORM = `${BASE_VERBS}|${GERUNDS}`;

const FILLER =
  '(?:(?:immediately|urgently|promptly|also|then|next|first|finally|and|please|now|ideally|additionally|quickly|temporarily|manually|proactively|ultimately|afterwards?)\\s*,?\\s+)*';

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

/** "Next steps include revoking the key", "Recommended actions are to disable the user". */
const LIST_INTRODUCER = new RegExp(
  `\\b(?:steps?|actions?|recommendations?|measures|remediation|containment|response)\\s+(?:include|includes|including|are|is)\\s+(?:to\\s+)?${FILLER}(?:the\\s+)?(?:${ANY_FORM})\\b`,
  'i'
);

/**
 * A verb joined to an earlier instruction: "Review the logs and disable the account." Skipped
 * after a purpose or attempt phrase ("tries to disable logging and delete the trail"), which
 * describes behaviour rather than advice.
 */
const COORDINATED = new RegExp(
  `\\b(?:and|then|or)\\s+${FILLER}(?:the\\s+)?(?:${BASE_VERBS})\\b`,
  'i'
);
const NARRATIVE_BEFORE_COORDINATOR = /\b(?:to|attempt\w*|tr(?:y|ies|ied|ying))\s+(?:\w+\s+){0,5}$/i;

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

/** Negation before the verb in the same clause turns advice into a caution. */
const NEGATION = /\b(?:not|never|avoid|without|nor|no need)\b|n't\b/i;

/** Frames where the verb is not at the clause start; negation before the match cancels them. */
const MID_CLAUSE_FRAMES: readonly RegExp[] = [
  DIRECTIVE_BEFORE_VERB,
  LIST_INTRODUCER,
  IMPORTANCE_FRAME,
  CONSIDER_DIRECTIVE,
];

/**
 * The confirmation words a condition must be scoped to. "until the investigation is complete"
 * and "after the incident is investigated" wait for a process to finish, not for the finding to
 * be confirmed, so `investigat*` is deliberately absent.
 */
const CONFIRMATION_WORDS =
  '(?:confirm\\w*|verif\\w+|validat\\w+|malicious|unauthori[sz]ed|suspicious|compromis\\w*)';
const CONDITION_CUE = new RegExp(
  `\\b(?:if|once|unless|pending|after|when|until)\\b.*\\b${CONFIRMATION_WORDS}`,
  'i'
);
/** "should the activity prove malicious", "should it be confirmed". */
const SHOULD_PROVE_CUE = new RegExp(
  `\\bshould\\b.*\\b(?:prove|turn out|be (?:confirmed|verified|validated))\\b`,
  'i'
);
/** "if so", "if it is" and "if it was not" point back at the previous sentence, which must raise a confirmation. */
const ANAPHORIC_CUE =
  /\b(?:if|once)\s+(?:so|yes|not|it (?:is|was)(?: not)?|they (?:are|were)(?: not)?|that is the case)\b/i;
/** A trailing condition ("..., unless the owner confirms") also governs the clauses before it. */
const STARTS_WITH_CUE = /^(?:only\s+)?(?:if|unless|once|pending|should|after|when|until)\b/i;

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

const splitClauses = (sentence: string): string[] =>
  sentence
    .split(/\s*[,:]\s+|\s*[,:]$/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);

const isCue = (clause: string, previousSentence: string): boolean =>
  CONDITION_CUE.test(clause) ||
  SHOULD_PROVE_CUE.test(clause) ||
  (ANAPHORIC_CUE.test(clause) && new RegExp(CONFIRMATION_WORDS, 'i').test(previousSentence));

const isSentenceConditional = (sentence: string, previousSentence: string): boolean =>
  splitClauses(sentence).some((clause) => isCue(clause, previousSentence));

const isInstructionClause = (clause: string): boolean => {
  if (IMPERATIVE_AT_START.test(clause) || GERUND_SUBJECT.test(clause)) return true;
  const midClause = MID_CLAUSE_FRAMES.some((frame) => {
    const match = frame.exec(clause);
    return match !== null && !NEGATION.test(clause.slice(0, match.index));
  });
  if (midClause) return true;
  const coordinated = COORDINATED.exec(clause);
  if (coordinated === null) return false;
  const before = clause.slice(0, coordinated.index);
  return !NEGATION.test(before) && !NARRATIVE_BEFORE_COORDINATOR.test(before);
};

/**
 * Whether the sentence holds an instruction no condition governs. A condition clause governs
 * itself and the clauses after it ("If confirmed unauthorized, revoke the key"); one that opens
 * with the cue also governs the clauses before it ("Revoke the key, unless the owner confirms").
 */
const hasUnconditionalInstruction = (sentence: string, previousSentence: string): boolean => {
  const clauses = splitClauses(sentence);
  const cues = clauses.flatMap((clause, index) => (isCue(clause, previousSentence) ? [index] : []));
  return clauses.some((clause, index) => {
    if (!isInstructionClause(clause)) return false;
    return !cues.some((cueIndex) => cueIndex <= index || STARTS_WITH_CUE.test(clauses[cueIndex]));
  });
};

/**
 * Sentences that give a containment instruction with no governing condition. A list under a
 * colon-terminated conditional header ("If confirmed unauthorized:") is governed by it until the
 * list ends.
 */
export const findUnconditionalContainment = (markdown: string): string[] => {
  const flagged: string[] = [];
  let governedByHeader = false;
  let previousSentence = '';
  for (const line of markdown.split('\n')) {
    const sentences = splitSentences(line);
    const isListItem = LIST_ITEM.test(line);
    if (sentences.length > 0) {
      if (!isListItem) governedByHeader = false;
      for (const sentence of sentences) {
        if (!governedByHeader && hasUnconditionalInstruction(sentence, previousSentence)) {
          flagged.push(sentence);
        }
        previousSentence = sentence;
      }
      const endsWithColon = line.trim().endsWith(':');
      if (
        !isListItem &&
        endsWithColon &&
        isSentenceConditional(sentences[sentences.length - 1], '')
      ) {
        governedByHeader = true;
      }
    }
  }
  return flagged;
};

/**
 * Unconditional containment advice. A discovery is exempt when every alert it cites belongs to a
 * group the gold marks as confirmed malicious (`confirmedGroups`); advice on anything else, or in
 * a discovery that cites nothing, is scored. 0 if any scored discovery tells the reader to
 * revoke, rotate, disable, delete, isolate, terminate, quarantine, deactivate, block, suspend,
 * reset, kill, remove, contain, lock, reimage, wipe, shut down or ban something without a
 * governing condition; N/A when nothing is scored.
 *
 * Heuristic, regex based; it does not parse grammar. Each sentence is split into clauses at
 * commas and colons. A clause is an instruction when a containment verb opens it ("Revoke the
 * key", "Next steps: revoke the key", "To contain it, isolate the host"), follows a directive
 * (should, must, recommend, prioritize, "critical to", "steps include revoking"), is joined to
 * an earlier instruction with and/then/or, is a gerund under a directive ("Revoking the key
 * should be prioritized"), or follows "consider" that is not followed by whether/if. Negation
 * before the verb ("do not block") cancels the mid-clause frames.
 *
 * A condition is if/once/unless/pending (and after/when/until) followed in the same clause by a
 * confirmation word (confirm, verify, validate, malicious, unauthorized, suspicious,
 * compromise), "should ... prove/be confirmed", or "if so" after a sentence that raises one.
 * Waiting on the investigation itself ("until the investigation is complete", "after the
 * incident is investigated") is not a condition. A condition governs its own clause and the
 * clauses after it, and the clauses before it when it opens with the cue.
 *
 * Known misses: a conditional split across sentences ("Verify first. Then revoke.") is flagged;
 * past or passive forms ("the key was revoked") are never flagged; a verb used mid-clause with no
 * directive frame ("the team can disable it") is not flagged; a gerund after before/after
 * ("before revoking it") is never an instruction. Treat it as a screen for review, not a verdict.
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
