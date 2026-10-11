/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Example brief for FIXTURE_SNAPSHOT. Valid against the validator rules: every claim cites
 * existing evidence, relations use the allowed edge verbs, numbers come from the snapshot.
 * Test/dev only. INVALID_BRIEF_CASES covers the validator's rejection paths.
 */

import type { ExecutiveBrief, ExecutiveBriefJob } from '../types';
import { FIXTURE_NOW, FIXTURE_SNAPSHOT } from './snapshot';

export const FIXTURE_BRIEF: ExecutiveBrief = {
  glance: {
    headline: 'A privileged identity is moving toward production, and nobody is working it yet',
    threatNarrative:
      'Three connected storylines are active this week. The most serious involves a privileged identity whose activity spans a finance laptop, a jump box and an extreme-impact production host, with no case open. A second storyline is already being handled, and a third shows credential spraying and possible exfiltration on a build server.',
    evidence: ['STORY-1', 'STORY-2', 'STORY-3'],
  },
  storylines: [
    {
      storylineId: 'STORY-1',
      title: 'Stolen privileged credentials → jump box → production host',
      narrative:
        'a.rodriguez appeared together in alerts on LAPTOP-FIN03, starting with LSASS memory access. The same identity then logged on to (rarely) jump-box-01 for the first time and later logged on to (rarely) docker-host-prod-01, where an untrusted container image was deployed. All of it is part of the same discovered attack.',
      whyItMatters:
        'a.rodriguez is on the Privileged Users watchlist and docker-host-prod-01 is extreme impact with 2 critical vulnerabilities.',
      confidence: 'high',
      evidence: [
        'ENT-1',
        'ENT-2',
        'ENT-3',
        'ENT-4',
        'RULE-1',
        'RULE-4',
        'EVT-1-3',
        'EVT-1-5',
        'AD-1',
      ],
    },
    {
      storylineId: 'STORY-2',
      title: 'MFA bombing on a marketing user (being handled)',
      narrative:
        'j.chen was targeted by MFA bombing, followed by a suspicious Office child process on LAPTOP-MKT07, which j.chen owns. Both are part of the same discovered attack.',
      whyItMatters: 'A case is in progress and the alerts are acknowledged.',
      confidence: 'high',
      evidence: ['ENT-5', 'ENT-6', 'RULE-6', 'RULE-7', 'AD-2', 'CASE-1'],
    },
    {
      storylineId: 'STORY-3',
      title: 'SSH password spraying → possible exfiltration from a build server',
      narrative:
        'svc-build appeared together in alerts on build-runner-02 for password spraying and, later, curl-based exfiltration. build-runner-02 regularly logs on to fileserver-03.',
      whyItMatters: 'No case is open; the build server can reach a file server.',
      confidence: 'medium',
      evidence: ['ENT-7', 'ENT-8', 'ENT-9', 'RULE-8', 'RULE-9'],
    },
  ],
  crossStorylineConclusion: {
    statement:
      'The most serious storyline is moving through Lateral Movement, the stage with limited detection coverage.',
    confidence: 'medium',
    evidence: ['STORY-1', 'TAC-TA0008'],
  },
  blindSpots: {
    summary:
      'Lateral Movement has activity but only 1 of 2 enabled rules is working. 18% of alerts have no MITRE ATT&CK mapping, and no security ML jobs are running.',
    evidence: ['TAC-TA0008', 'GAP-B16', 'GAP-B12'],
  },
  decisions: [
    {
      action: 'Contain docker-host-prod-01 and reset a.rodriguez credentials',
      rationale: 'An unaddressed storyline reaches an extreme-impact production host.',
      urgency: 'now',
      owner: 'soc',
      relatesTo: 'STORY-1',
      targets: ['ENT-4', 'ENT-1'],
      evidence: ['AD-1', 'RULE-4', 'EVT-1-5'],
      agentPrompt:
        'Investigate a.rodriguez activity on jump-box-01 and docker-host-prod-01 over the last 7 days and propose containment steps.',
    },
    {
      action: 'Review detection coverage for Lateral Movement',
      rationale: 'Activity was seen in a stage where only 1 of 2 enabled rules is working.',
      urgency: 'this_week',
      owner: 'detection_engineering',
      relatesTo: 'TAC-TA0008',
      targets: ['TAC-TA0008'],
      evidence: ['TAC-TA0008', 'RULE-2'],
      agentPrompt:
        'Which Lateral Movement detection rules are enabled but missing data, and which available prebuilt rules would close the gap?',
    },
    {
      action: 'Open a case for the build server storyline',
      rationale: 'Possible exfiltration with no case open.',
      urgency: 'this_week',
      owner: 'soc',
      relatesTo: 'STORY-3',
      targets: ['ENT-8'],
      evidence: ['RULE-9'],
      agentPrompt:
        'Summarise svc-build and build-runner-02 activity and assess whether data left the network.',
    },
  ],
};

export const FIXTURE_JOB_SUCCEEDED: ExecutiveBriefJob = {
  id: 'fixture-job-1',
  spaceId: 'default',
  status: 'succeeded',
  stage: 'persist',
  createdAt: FIXTURE_NOW,
  updatedAt: FIXTURE_NOW,
  startedAt: FIXTURE_NOW,
  completedAt: FIXTURE_NOW,
  createdBy: { username: 'elastic' },
  params: {
    timeRange: FIXTURE_SNAPSHOT.timeRange,
    generator: 'template',
    mode: 'names',
  },
  snapshot: FIXTURE_SNAPSHOT,
  brief: FIXTURE_BRIEF,
  validation: {
    totalClaims: 13,
    droppedClaims: 0,
    invalidEvidenceIds: [],
    unbackedRelations: [],
    inventedNumbers: [],
  },
  timings: {
    snapshot: 980,
    storylines: 1310,
    blind_spots: 820,
    generate: 12,
    validate: 4,
    persist: 30,
  },
};

/** Each case must be rejected (or have the claim dropped) by the validator. */
export const INVALID_BRIEF_CASES: Array<{ name: string; brief: ExecutiveBrief; expect: string }> = [
  {
    name: 'cites a non-existent evidence id',
    brief: {
      ...FIXTURE_BRIEF,
      storylines: [{ ...FIXTURE_BRIEF.storylines[0], evidence: ['ENT-1', 'RULE-99'] }],
    },
    expect: 'invalidEvidenceIds contains RULE-99',
  },
  {
    name: 'claims lateral movement between entities linked only by regular logons',
    brief: {
      ...FIXTURE_BRIEF,
      storylines: [
        {
          ...FIXTURE_BRIEF.storylines[2],
          narrative: 'build-runner-02 moved laterally to fileserver-03.',
        },
      ],
    },
    expect: 'unbackedRelations contains build-runner-02 → fileserver-03',
  },
  {
    name: 'links two entities with no computed edge',
    brief: {
      ...FIXTURE_BRIEF,
      storylines: [
        {
          ...FIXTURE_BRIEF.storylines[0],
          narrative: 'a.rodriguez appeared together in alerts with j.chen.',
        },
      ],
    },
    expect: 'unbackedRelations contains a.rodriguez → j.chen',
  },
  {
    name: 'invents a number',
    brief: {
      ...FIXTURE_BRIEF,
      glance: { ...FIXTURE_BRIEF.glance, threatNarrative: '57 entities are compromised.' },
    },
    expect: 'inventedNumbers contains 57',
  },
  {
    name: 'uncited decision',
    brief: {
      ...FIXTURE_BRIEF,
      decisions: [{ ...FIXTURE_BRIEF.decisions[0], evidence: [], targets: [] }],
    },
    expect: 'droppedClaims >= 1',
  },
];
