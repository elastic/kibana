/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryRecommendedAction } from '@kbn/pnd-common';

import { parseRecommendedActions, RECOMMENDED_ACTIONS_LABEL } from '.';

const ISOLATE_HOST: AttackDiscoveryRecommendedAction = {
  action_type: 'isolate_host',
  capability_ref: 'endpoint.isolate',
  execution: 'kibana_api',
  priority: 'immediate',
  rationale: 'The host is beaconing to a known C2 address.',
  targets: { alert_ids: ['alert-1'], hosts: ['host-1'], ips: [], users: [] },
  title: 'Isolate host-1',
};

const KILL_PROCESS: AttackDiscoveryRecommendedAction = {
  action_type: 'kill_process',
  capability_ref: 'endpoint.kill_process',
  execution: 'kibana_api',
  execution_params: { pid: 4242, process_name: 'mimikatz.exe' },
  priority: 'immediate',
  rationale: 'The process is dumping credentials.',
  targets: { alert_ids: ['alert-1', 'alert-2'], hosts: ['host-1'], ips: [], users: [] },
  title: 'Kill process [mimikatz.exe] on "host-1"',
};

const REVOKE_USER: AttackDiscoveryRecommendedAction = {
  action_type: 'revoke_user_account',
  execution: 'manual',
  priority: 'hardening',
  rationale: 'The account authenticated from the compromised host.',
  targets: { alert_ids: [], hosts: [], ips: [], users: ['cfo@corp'] },
  title: 'Revoke the cfo@corp account',
};

const STAGED_ACTIONS = [ISOLATE_HOST, KILL_PROCESS, REVOKE_USER];

/**
 * The reasoning summary `watch_floor.yaml`'s `reason_incident_contained` step renders: prose, the
 * label anchor, the `| json` array, a period, then more prose. Mirrored here with literals because
 * `@kbn/workflows` is `group: platform` and cannot import this plugin — the format is pinned on
 * both sides, and a drift on either side is a failure here or there, never a silent fall back.
 */
const stagedReasoning = (actionsJson: string): string =>
  `Approving executes ONLY the Kibana-executable actions you toggle on — an action left toggled off is never executed — then closes out the incident and emits pnd.incidentClosed, which wakes the Detection Watch to draft a rule tuning. Manual actions are listed for the analyst to perform outside Kibana; the workflow never executes them. ${RECOMMENDED_ACTIONS_LABEL}\n${actionsJson}.\nThe incident responder's own closing statement follows. The blast radius is contained to host-1.`;

describe('parseRecommendedActions', () => {
  // Deliberately pinned as a literal: the label is the contract with
  // watch_floor.yaml's reason_incident_contained step.
  it('pins the label the Watch Floor writes before the staged actions', () => {
    expect(RECOMMENDED_ACTIONS_LABEL).toBe('Staged containment actions JSON:');
  });

  it('round-trips the staged actions, full objects included', () => {
    expect(parseRecommendedActions(stagedReasoning(JSON.stringify(STAGED_ACTIONS)))).toEqual(
      STAGED_ACTIONS
    );
  });

  it('survives a title containing a closing bracket and quotes, which a naive scan closes on', () => {
    const parsed = parseRecommendedActions(stagedReasoning(JSON.stringify([KILL_PROCESS])));

    expect(parsed?.[0].title).toBe('Kill process [mimikatz.exe] on "host-1"');
  });

  it('survives an escaped quote before a bracket inside a rationale', () => {
    const action = {
      ...ISOLATE_HOST,
      rationale: 'The note reads \\"contain] first\\", per the runbook.',
    };

    expect(parseRecommendedActions(stagedReasoning(JSON.stringify([action])))).toEqual([action]);
  });

  it('parses an empty array as staged-nothing rather than as a failure', () => {
    expect(parseRecommendedActions(stagedReasoning('[]'))).toEqual([]);
  });

  it('skips the whitespace liquid leaves between the label and the array', () => {
    expect(
      parseRecommendedActions(
        `${RECOMMENDED_ACTIONS_LABEL} \n\t [${JSON.stringify(ISOLATE_HOST)}].`
      )
    ).toEqual([ISOLATE_HOST]);
  });

  it('stops at the closing bracket, so the trailing period and prose never reach JSON.parse', () => {
    expect(
      parseRecommendedActions(stagedReasoning(JSON.stringify([REVOKE_USER])))?.[0].action_type
    ).toBe('revoke_user_account');
  });

  it('returns undefined for an undefined reasoning', () => {
    expect(parseRecommendedActions(undefined)).toBeUndefined();
  });

  it('returns undefined when the label is absent', () => {
    expect(
      parseRecommendedActions(`Staged actions: ${JSON.stringify(STAGED_ACTIONS)}.`)
    ).toBeUndefined();
  });

  it('returns undefined when the label is followed by prose rather than an array', () => {
    expect(
      parseRecommendedActions(`${RECOMMENDED_ACTIONS_LABEL} nothing was staged.`)
    ).toBeUndefined();
  });

  it('returns undefined when the array never closes, as a truncated summary leaves it', () => {
    const truncated = stagedReasoning(JSON.stringify(STAGED_ACTIONS)).slice(0, 400);

    expect(parseRecommendedActions(truncated)).toBeUndefined();
  });

  it('returns undefined when the delimited value does not parse', () => {
    expect(parseRecommendedActions(`${RECOMMENDED_ACTIONS_LABEL} [{"title": }].`)).toBeUndefined();
  });

  it('returns undefined when the value is a JSON object rather than an array', () => {
    expect(
      parseRecommendedActions(`${RECOMMENDED_ACTIONS_LABEL} {"recommended_actions": []}.`)
    ).toBeUndefined();
  });

  it('returns undefined when an element is not an object', () => {
    expect(parseRecommendedActions(stagedReasoning('["isolate_host"]'))).toBeUndefined();
  });

  it('returns undefined when an element is missing its title', () => {
    const { title, ...untitled } = ISOLATE_HOST;

    expect(parseRecommendedActions(stagedReasoning(JSON.stringify([untitled])))).toBeUndefined();
  });

  it('returns undefined when an element is missing its execution', () => {
    const { execution, ...unexecutable } = ISOLATE_HOST;

    expect(
      parseRecommendedActions(stagedReasoning(JSON.stringify([unexecutable])))
    ).toBeUndefined();
  });

  it('returns undefined when an element is missing its action_type', () => {
    const { action_type: actionType, ...untyped } = ISOLATE_HOST;

    expect(parseRecommendedActions(stagedReasoning(JSON.stringify([untyped])))).toBeUndefined();
  });
});
