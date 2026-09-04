/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecommendedResponseAction } from '@kbn/pnd-common';

import { RECOMMENDED_ACTIONS_LABEL, parseRecommendedActions, stripRecommendedActionsJson } from '.';

const ISOLATE_HOST: RecommendedResponseAction = {
  action_type: 'isolate_host',
  capability_ref: 'endpoint.isolate',
  execution: 'kibana_api',
  priority: 'immediate',
  rationale: 'The host is beaconing to a known C2 address.',
  targets: { alert_ids: ['alert-1'], hosts: ['WKSTN-RECV01'], ips: [], users: [] },
  title: 'Isolate WKSTN-RECV01',
};

const REVOKE_USER: RecommendedResponseAction = {
  action_type: 'revoke_user_account',
  execution: 'manual',
  priority: 'hardening',
  rationale: 'The account authenticated from the compromised host.',
  targets: { alert_ids: [], hosts: [], ips: [], users: ['cfo@corp'] },
  title: 'Revoke the cfo@corp account',
};

const PROSE_BEFORE =
  'Approval escalates "Ransomware on WKSTN-RECV01" to an incident. The forensics recommend the containment below for your review; approving escalates the incident and executes none of it.';

/**
 * The reasoning summary `watch_floor.yaml`'s `reason_promote_incident` step renders: prose, the
 * label anchor, the `| json` array, then the sentence's own closing period.
 */
const reasoningWith = (actions: RecommendedResponseAction[]): string =>
  `${PROSE_BEFORE} ${RECOMMENDED_ACTIONS_LABEL} ${JSON.stringify(actions)}.`;

describe('parseRecommendedActions', () => {
  it('reads the actions the Floor rendered behind the label', () => {
    expect(parseRecommendedActions(reasoningWith([ISOLATE_HOST, REVOKE_USER]))).toEqual([
      ISOLATE_HOST,
      REVOKE_USER,
    ]);
  });

  it('reads an empty list as "nothing recommended" rather than a failure', () => {
    expect(parseRecommendedActions(reasoningWith([]))).toEqual([]);
  });

  it('skips whitespace between the label and the array', () => {
    const reasoning = `${RECOMMENDED_ACTIONS_LABEL}\n  \t${JSON.stringify([ISOLATE_HOST])}.`;

    expect(parseRecommendedActions(reasoning)).toEqual([ISOLATE_HOST]);
  });

  it('does not let a bracket inside a rationale close the array early', () => {
    const withBracket: RecommendedResponseAction = {
      ...ISOLATE_HOST,
      rationale: 'Beaconing to 203.0.113.7 [confirmed] and still open.',
    };

    expect(parseRecommendedActions(reasoningWith([withBracket, REVOKE_USER]))).toEqual([
      withBracket,
      REVOKE_USER,
    ]);
  });

  it('reads an action whose title carries an astral character', () => {
    // The scan indexes code UNITS, so an emoji must not make it compute a short end index.
    const withEmoji: RecommendedResponseAction = {
      ...ISOLATE_HOST,
      title: 'Isolate WKSTN-RECV01 🔥',
    };

    expect(parseRecommendedActions(reasoningWith([withEmoji]))).toEqual([withEmoji]);
  });

  it('returns undefined when the reasoning is absent', () => {
    expect(parseRecommendedActions(undefined)).toBeUndefined();
  });

  it('returns undefined when the label is absent', () => {
    expect(parseRecommendedActions(PROSE_BEFORE)).toBeUndefined();
  });

  it('returns undefined when the label is followed by prose instead of an array', () => {
    expect(
      parseRecommendedActions(`${RECOMMENDED_ACTIONS_LABEL} none were recommended.`)
    ).toBeUndefined();
  });

  it('returns undefined when the array never closes', () => {
    // The summary is truncated at 8192 characters silently, so a long list can lose its tail.
    const truncated = reasoningWith([ISOLATE_HOST, REVOKE_USER]).slice(0, -20);

    expect(parseRecommendedActions(truncated)).toBeUndefined();
  });

  it('returns undefined when an element is missing a required string', () => {
    const reasoning = `${RECOMMENDED_ACTIONS_LABEL} ${JSON.stringify([
      { action_type: 'isolate_host', execution: 'kibana_api' },
    ])}.`;

    expect(parseRecommendedActions(reasoning)).toBeUndefined();
  });
});

describe('stripRecommendedActionsJson', () => {
  it('drops the label, the array, and the sentence period', () => {
    expect(stripRecommendedActionsJson(reasoningWith([ISOLATE_HOST]))).toBe(PROSE_BEFORE);
  });

  it('keeps prose that follows the array', () => {
    const reasoning = `${PROSE_BEFORE} ${RECOMMENDED_ACTIONS_LABEL} ${JSON.stringify([
      ISOLATE_HOST,
    ])}. Declining ends the run.`;

    expect(stripRecommendedActionsJson(reasoning)).toBe(`${PROSE_BEFORE} Declining ends the run.`);
  });

  it('returns the reasoning untouched when the label is absent', () => {
    expect(stripRecommendedActionsJson(PROSE_BEFORE)).toBe(PROSE_BEFORE);
  });

  it('returns the reasoning untouched when the label is followed by prose', () => {
    const reasoning = `${RECOMMENDED_ACTIONS_LABEL} none were recommended.`;

    expect(stripRecommendedActionsJson(reasoning)).toBe(reasoning);
  });

  it('drops the ragged tail when the array never closes', () => {
    const truncated = reasoningWith([ISOLATE_HOST]).slice(0, -20);

    expect(stripRecommendedActionsJson(truncated)).toBe(PROSE_BEFORE);
  });
});
