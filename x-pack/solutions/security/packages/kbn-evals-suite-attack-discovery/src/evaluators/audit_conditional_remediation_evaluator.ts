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
  '(?:(?:immediately|urgently|promptly|also|then|next|first|finally|and|please|now|ideally|additionally|quickly|temporarily|manually|proactively|ultimately|afterwards?|so|therefore|thus|hence)\\s*,?\\s+)*';

/** The verb opens the clause, as in "Revoke the key" or "Immediately isolate the host". */
const IMPERATIVE_AT_START = new RegExp(
  `^${FILLER}(?:(?:recommended|recommendation|action|actions|remediation|containment|response)s?\\s*:?\\s*)*${FILLER}(?:${BASE_VERBS})\\b`,
  'i'
);

/**
 * The verb follows a directive, as in "should rotate", "must disable", "recommend blocking",
 * "prioritize revoking", "start by isolating". Gerunds count: "We recommend blocking the IP." So does
 * "should include <gerund>": "Containment should include isolating the host."
 */
const DIRECTIVE_BEFORE_VERB = new RegExp(
  `\\b(?:should|must|need to|needs to|have to|ought to|recommend(?:ed|s)?(?: that)?(?: you)?(?: to)?|advise[sd]?(?: that)?(?: you)?(?: to)?|prioriti[sz]e|start by|begin by|make sure to|ensure (?:that )?(?:you )?)\\s+${FILLER}(?:include\\s+)?(?:the\\s+)?(?:${ANY_FORM})\\b`,
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
/**
 * Narrative, not advice: the clause before the coordinator either opens with a past-tense verb
 * ("deleted the trail and shut down the agent") or has an actor subject and a past-tense verb within
 * two words ("The attacker signed in and reset the MFA device"). A past-tense word elsewhere does not
 * count, so "Review the affected hosts and isolate them" and "Review the logs created by the user and
 * reset the password" stay flagged. Advice participles ("is recommended") are not past tense here.
 * Cost: a narrative clause with no actor subject and no leading verb ("Then logged in and reset the
 * device") is still flagged.
 */
const PAST_VERB =
  '(?!(?:recommended|advised|required|suggested|requested|encouraged|urged|needed|expected|supposed|instructed|asked|ordered)\\b)(?:\\w{2,}ed|ran|made|took|got|gave|sent|began|went|stole|wrote|did|was|were)';
const ACTOR =
  '(?:(?:the|this|that)\\s+(?:threat\\s+)?(?:attacker|adversary|actor|intruder|user|account|process|malware|script|binary|session)|they|he|she|it)';
const PAST_TENSE_BEFORE_COORDINATOR = new RegExp(
  `^\\W*${PAST_VERB}\\b|\\b${ACTOR}\\s+(?:\\w+\\s+){0,2}?${PAST_VERB}\\b`,
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

const PAST_PARTICIPLES = [
  'revoked',
  'rotated',
  'disabled',
  'deleted',
  'isolated',
  'terminated',
  'quarantined',
  'deactivated',
  'blocked',
  'suspended',
  'reset',
  'killed',
  'removed',
  'contained',
  'locked',
  'reimaged',
  'wiped',
  'shut down',
  'banned',
].join('|');

/** "The key should be revoked immediately", "must be rotated". */
const PASSIVE_DIRECTIVE = new RegExp(
  `\\b(?:should|must|needs? to|has to|ought to)\\s+${FILLER}be\\s+${FILLER}(?:${PAST_PARTICIPLES})\\b`,
  'i'
);

/** "Revocation of the access key is recommended." */
const NOMINAL_DIRECTIVE =
  /\b(?:revocation|rotation|isolation|termination|quarantine|suspension|deactivation|disabling|blocking|removal|deletion|reset|reimaging|containment|lockout|wiping)\s+of\b[^.]*?\b(?:is|are)\s+(?:strongly\s+)?(?:recommended|advised|required)\b/i;

/** Negation before the verb in the same clause turns advice into a caution. */
const NEGATION = /\b(?:not|never|avoid|without|nor|no need)\b|n't\b/i;

/** Frames where the verb is not at the clause start; negation before the match cancels them. */
const MID_CLAUSE_FRAMES: readonly RegExp[] = [
  DIRECTIVE_BEFORE_VERB,
  LIST_INTRODUCER,
  IMPORTANCE_FRAME,
  CONSIDER_DIRECTIVE,
  PASSIVE_DIRECTIVE,
  NOMINAL_DIRECTIVE,
];

/**
 * Before a mid-clause frame, negation or whether/if turns advice into a caution or a question:
 * "The key should not be revoked", "Verify whether the key should be revoked."
 */
const MID_CLAUSE_CANCEL = new RegExp(`${NEGATION.source}|\\b(?:whether|if)\\b`, 'i');

const VERIFY_VERB = '(?:confirm\\w*|verif\\w+|validat\\w+)';
const SUSPECT_ADJECTIVE = '(?:malicious|unauthori[sz]ed|suspicious|compromised)';
/**
 * A condition word counts only with a finding it waits on. Only if/once/unless/pending open a
 * condition (and "should" in SHOULD_PROVE_CUE, "only after/when" as an explicit gate); bare
 * when/after/until never do, because they usually sit in a noun phrase or a timing ("keys created
 * after the compromise", "used when the account was compromised"). The finding is either a verification verb within about four words of the
 * condition word ("once you have verified", "pending validation"), or a judgement stated with a
 * copula after it ("if it is confirmed malicious", "if deemed suspicious", "if the activity is
 * unauthorized"), or the adjective right after it ("if malicious activity continues").
 * Waiting on the investigation itself ("until the investigation is complete") is not a condition.
 */
const VERIFICATION_CUE = new RegExp(
  `\\b(?:if|once|unless|pending|only (?:after|when))\\b(?:\\s+\\S+){0,4}?\\s+${VERIFY_VERB}`,
  'i'
);
const JUDGEMENT_CUE = new RegExp(
  `\\b(?:if|once|unless|pending|only (?:after|when))\\b.*\\b(?:is|are|was|were|be|been|proves?|turns? out|deemed|found|determined)\\s+(?:to be\\s+)?(?:\\w+\\s+)?${SUSPECT_ADJECTIVE}`,
  'i'
);
const ADJECTIVE_CUE = new RegExp(`\\b(?:if|once|unless)\\s+(?:\\w+\\s+)?${SUSPECT_ADJECTIVE}`, 'i');
/** "should the activity prove malicious", "should it be confirmed". */
const SHOULD_PROVE_CUE = new RegExp(
  `\\bshould\\b(?:\\s+\\S+){0,4}?\\s+(?:prove|turn out|be (?:confirmed|verified|validated|deemed|found|determined))\\b`,
  'i'
);
/**
 * A follow-up cue is elliptical: the whole clause is "if so", "if not", "if it was", "if they do",
 * or "if they did not <verb> it". Anything with a fresh subject or predicate ("if the owner has
 * left", "if the host is still online") is a new claim, not a pointer back, and never counts.
 * "If it is not already disabled" is elliptical but asks about the action itself, so "already" or
 * "yet" anywhere in the clause disqualifies it.
 */
const ELLIPTICAL_CUE =
  /^(?:if|once)\s+(?:so|not|yes|that is the case|(?:it|they|he|she|this|that)\s+(?:is|are|was|were|did|does|do|has|have|had|can(?:not|'t)?)(?:\s+not|n't)?|(?:they|he|she)\s+did(?:\s+not|n't)\s+\w+\s+(?:it|them|this))\s*$/i;
const NOT_YET_DONE = /\b(?:already|yet)\b/i;
/**
 * The previous sentence must raise a question the cue answers: a verification verb followed by
 * whether/if/that ("Ask the owner whether they created it", "Verify that the login was expected").
 */
const VERIFICATION_QUESTION =
  /\b(?:verify|confirm|check|determine|validate|ask|contact|investigate|assess)\b[^.]*\b(?:whether|if|that)\b/i;
/**
 * "if they did not create it" restates the event the previous clause told the reader to verify, so
 * "verify the key creation" is enough there. A bare "if they do" or "if it was" has nothing to
 * restate and still needs the whether/if/that question. "Contact the owner. If they did not create
 * it, revoke it." has no verify verb and is flagged.
 */
const VERIFIED_EVENT = /\b(?:verify|confirm|validate)\b/i;
const RESTATES_EVENT = /\bdid(?:\s+not|n't)\s+\w+\s+(?:it|them|this)$/i;
/** A trailing condition ("..., unless the owner confirms") also governs the clauses before it. */
const STARTS_WITH_CUE = /^(?:only\s+)?(?:if|unless|once|pending|should)\b/i;

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

const isAnaphoricCue = (clause: string, previousSentence: string): boolean =>
  ELLIPTICAL_CUE.test(clause) &&
  !NOT_YET_DONE.test(clause) &&
  (VERIFICATION_QUESTION.test(previousSentence) ||
    (RESTATES_EVENT.test(clause) && VERIFIED_EVENT.test(previousSentence)));

const isCue = (clause: string, previousSentence: string): boolean =>
  VERIFICATION_CUE.test(clause) ||
  JUDGEMENT_CUE.test(clause) ||
  ADJECTIVE_CUE.test(clause) ||
  SHOULD_PROVE_CUE.test(clause) ||
  isAnaphoricCue(clause, previousSentence);

const isSentenceConditional = (sentence: string, previousSentence: string): boolean =>
  splitClauses(sentence).some((clause) => isCue(clause, previousSentence));

const isInstructionClause = (clause: string): boolean => {
  if (IMPERATIVE_AT_START.test(clause) || GERUND_SUBJECT.test(clause)) return true;
  const midClause = MID_CLAUSE_FRAMES.some((frame) => {
    const match = frame.exec(clause);
    return match !== null && !MID_CLAUSE_CANCEL.test(clause.slice(0, match.index));
  });
  if (midClause) return true;
  const coordinated = COORDINATED.exec(clause);
  if (coordinated === null) return false;
  const before = clause.slice(0, coordinated.index);
  return (
    !NEGATION.test(before) &&
    !NARRATIVE_BEFORE_COORDINATOR.test(before) &&
    !PAST_TENSE_BEFORE_COORDINATOR.test(before)
  );
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
        if (!ELLIPTICAL_CUE.test(splitClauses(sentence)[0] ?? '')) previousSentence = sentence;
      }
      const endsWithColon = line
        .replace(/\*\*|__/g, '')
        .trim()
        .endsWith(':');
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
 * (should, must, recommend, prioritize, "critical to", "steps include revoking", "should include
 * isolating"), is joined to an earlier instruction with and/then/or, is a gerund under a
 * directive ("Revoking the key should be prioritized"), follows "consider" that is not followed
 * by whether/if, or is a passive or nominal directive ("the key should be revoked", "Revocation
 * of the key is recommended"). Negation, whether and if before a mid-clause frame cancel it.
 *
 * A condition is if/once/unless/pending (or "only after/when") followed within about four words
 * by confirm*, verif* or validat*, or followed by a judgement ("if it is confirmed malicious",
 * "if deemed suspicious"), "should ... prove/be confirmed", or "if so" / "if it was not" / "if
 * they did not" after a sentence that tells the reader to verify something and with no
 * "already"/"yet" after the cue. Bare when/after/until are never conditions, and neither is a
 * descriptive adjective ("the suspicious key creation"). Waiting on the investigation itself
 * ("until the investigation is complete") is not a condition. A condition governs its own clause
 * and the clauses after it, and the clauses before it when it opens with the cue.
 *
 * Known misses: a conditional split across sentences ("Verify first. Then revoke.") is flagged;
 * past forms ("the key was revoked") are never flagged; a verb used mid-clause with no
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
