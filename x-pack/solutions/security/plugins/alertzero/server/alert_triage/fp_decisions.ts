/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRIAGE_STRICT_KEY_TAG_PREFIX } from './constants';
import { hashKey } from './key_tags';
import { buildPatternKeys, describePatternKey, getField } from './pattern_key';

/**
 * Decisions: what an approved (or dismissed) closure proposal teaches Alert Triage about later
 * alerts. This module is pure: alert documents in, Knowledge Item documents out. The step does
 * the reading and the writing.
 *
 * A decision is keyed by the strict pattern key and never by the wide one, so it matches later
 * alerts exactly and not "everything in this folder".
 */

export const FP_DECISION_KI_TYPE = 'security.fp_decision';
export const FP_DECISION_ID_PREFIX = 'fp-decision-';
export const FP_DO_NOT_PROPOSE_ID_PREFIX = 'fp-dismissal-';

export const FP_DECISION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const FP_DO_NOT_PROPOSE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * An approver of a grouped proposal saw a group, not each strict condition. A condition therefore
 * becomes a decision only when it appears in at least this many of the approved alerts. A starting
 * value, to tune with shadow data.
 */
export const FP_DECISION_MIN_ALERTS = 3;

/** Most decisions one approval stores, so a very mixed proposal cannot flood the index. A starting value. */
export const FP_DECISIONS_MAX_PER_APPROVAL = 20;

/** Verdicts that stop a key from becoming a decision: the model judged an alert of this pattern differently. */
export const FP_DECISION_BLOCKING_VERDICT_TAGS = ['az:true_positive', 'az:inconclusive'] as const;

const MAX_CONDITION_VALUE_LENGTH = 1000;

export type FpDecisionKind = 'false_positive' | 'do_not_propose';

export interface StrictKeyGroup {
  /** `hashKey(space, strict key)`: the id suffix and the value of the alerts' strict key tag. */
  hash: string;
  strictKey: string;
  alertIds: string[];
  ruleName: string;
}

export interface GroupedAlerts {
  groups: StrictKeyGroup[];
  alertsWithoutStrictKey: number;
}

type AlertDocument = Record<string, unknown>;

/** The alerts that share a strict key, biggest group first. Alerts with no strict key can never be part of a decision. */
export const groupByStrictKey = ({
  alerts,
  spaceId,
}: {
  alerts: ReadonlyArray<{ id: string; doc: AlertDocument }>;
  spaceId: string;
}): GroupedAlerts => {
  const groups = new Map<string, StrictKeyGroup>();
  let alertsWithoutStrictKey = 0;
  for (const { id, doc } of alerts) {
    const { strict } = buildPatternKeys(doc);
    if (strict === undefined) {
      alertsWithoutStrictKey++;
      continue;
    }
    const hash = hashKey(spaceId, strict);
    const group = groups.get(hash) ?? {
      hash,
      strictKey: strict,
      alertIds: [],
      ruleName: String(getField(doc, 'kibana.alert.rule.name') ?? ''),
    };
    group.alertIds.push(id);
    groups.set(hash, group);
  }
  return {
    alertsWithoutStrictKey,
    groups: [...groups.values()].sort(
      (a, b) => b.alertIds.length - a.alertIds.length || a.hash.localeCompare(b.hash)
    ),
  };
};

/** The tag the batch put on every classified alert of this key. */
export const strictKeyTag = (hash: string): string => `${TRIAGE_STRICT_KEY_TAG_PREFIX}${hash}`;

export interface DecisionSelection {
  selected: StrictKeyGroup[];
  keysSeen: number;
  keysBelowMinimum: number;
  keysWithOtherVerdicts: number;
  keysOverCap: number;
}

/**
 * Which keys become decisions.
 * - An approval stores a key only when enough approved alerts have it, and no earlier alert of the
 *   key carries a verdict other than false positive (the consistency rule). `blocked` is the set
 *   of key hashes that fail the second test.
 * - A dismissal stores every key, because "do not propose again" needs no evidence.
 * Both stop at the per-approval cap, biggest keys first.
 */
export const selectDecisionKeys = ({
  kind,
  groups,
  blocked,
}: {
  kind: FpDecisionKind;
  groups: readonly StrictKeyGroup[];
  blocked: ReadonlySet<string>;
}): DecisionSelection => {
  const approval = kind === 'false_positive';
  const enough = approval
    ? groups.filter(({ alertIds }) => alertIds.length >= FP_DECISION_MIN_ALERTS)
    : [...groups];
  const consistent = approval ? enough.filter(({ hash }) => !blocked.has(hash)) : enough;
  return {
    selected: consistent.slice(0, FP_DECISIONS_MAX_PER_APPROVAL),
    keysSeen: groups.length,
    keysBelowMinimum: groups.length - enough.length,
    keysWithOtherVerdicts: enough.length - consistent.length,
    keysOverCap: Math.max(0, consistent.length - FP_DECISIONS_MAX_PER_APPROVAL),
  };
};

export const decisionId = (kind: FpDecisionKind, hash: string): string =>
  `${kind === 'false_positive' ? FP_DECISION_ID_PREFIX : FP_DO_NOT_PROPOSE_ID_PREFIX}${hash}`;

export interface DecisionProvenance {
  spaceId: string;
  proposalId: string;
  investigationId: string;
  approver?: string;
  now: Date;
}

/** The Knowledge Item document for one key. `content` is for humans: matching uses `key_hash` only. */
export const buildDecisionDocument = ({
  kind,
  group,
  provenance,
}: {
  kind: FpDecisionKind;
  group: StrictKeyGroup;
  provenance: DecisionProvenance;
}): Record<string, unknown> => {
  const { spaceId, proposalId, investigationId, approver, now } = provenance;
  const key = describePatternKey(group.strictKey);
  const condition = key.values.map(
    ([field, value]) => `${field}=${value.slice(0, MAX_CONDITION_VALUE_LENGTH)}`
  );
  const id = decisionId(kind, group.hash);
  const ttl = kind === 'false_positive' ? FP_DECISION_TTL_MS : FP_DO_NOT_PROPOSE_TTL_MS;
  const decidedAt = now.toISOString();
  const verb =
    kind === 'false_positive'
      ? 'were approved for closure as false positives'
      : 'were dismissed; do not propose them again';
  const ruleLabel = group.ruleName || key.ruleId;

  return {
    '@timestamp': decidedAt,
    id,
    updated_at: decidedAt,
    type: FP_DECISION_KI_TYPE,
    title: `${
      kind === 'false_positive' ? 'False positive decision' : 'Do not propose'
    }: ${ruleLabel}`.slice(0, 256),
    description: `Exact pattern of rule ${ruleLabel}${key.kind ? ` (${key.kind})` : ''}`.slice(
      0,
      1024
    ),
    content: [
      `${group.alertIds.length} alert${
        group.alertIds.length === 1 ? '' : 's'
      } of rule "${ruleLabel}"${
        key.detection ? ` (detection ${key.detection})` : ''
      } with this exact pattern ${verb}${approver ? ` by ${approver}` : ''} on ${decidedAt}.`,
      ...condition.map((entry) => `- ${entry}`),
    ].join('\n'),
    tags: ['watch:alert_triage', `decision:${kind}`],
    attributes: {
      decision: kind,
      key_hash: group.hash,
      space_id: spaceId,
      rule_id: key.ruleId,
      ...(key.ruleRevision === undefined ? {} : { rule_revision: key.ruleRevision }),
      ...(key.detection ? { detection: key.detection } : {}),
      rule_name: group.ruleName,
      condition_kind: key.kind,
      condition,
      alert_count: group.alertIds.length,
      ...(approver ? { approver } : {}),
      decided_at: decidedAt,
      proposal_id: proposalId,
      investigation_id: investigationId,
      // The approver saw a grouped proposal, not this condition. The matcher treats these as
      // shadow-only until a person confirms the decision.
      approved_via: 'group',
      producer: 'alertzero.triage.fpDecisions.v1',
    },
    expires_at: new Date(now.getTime() + ttl).toISOString(),
  };
};
