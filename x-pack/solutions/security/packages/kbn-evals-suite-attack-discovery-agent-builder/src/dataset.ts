/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  attackDiscoveryFixtureMarker,
  liveRetrievalFixture,
  missingAlertRetrievalFixture,
  multipleAlertSetsFixture,
  providedAlertFixture,
  statusOnlyFixture,
} from './fixtures';
import type {
  AttackDiscoveryAgentBuilderDataset,
  AttackDiscoveryAgentBuilderExample,
} from './types';

const fixtureAlertIds = [...providedAlertFixture.ids];

const expectedAttackDiscoveries = [
  {
    title: 'Defense Evasion and Credential Access on finance-ws-01',
    summaryMarkdown:
      'Encoded PowerShell execution and LSASS access on finance-ws-01 indicate a coordinated defense evasion and credential access chain.',
    detailsMarkdown:
      'Two alerts on finance-ws-01 — encoded PowerShell execution via powershell.exe and rundll32 accessing lsass.exe — suggest credential harvesting preceded by defense evasion.',
    entitySummaryMarkdown: 'Encoded PowerShell and LSASS access on finance-ws-01',
    mitreAttackTactics: ['Defense Evasion', 'Execution', 'Credential Access'],
    alertIds: fixtureAlertIds,
  },
];

const sharedCriteria = [
  'Insights mention encoded PowerShell execution or defense evasion.',
  'Insights mention LSASS, rundll32, or credential access.',
  'Insights reference the host finance-ws-01.',
  'Each insight includes non-empty title, summaryMarkdown, detailsMarkdown, and alertIds.',
  `The alertIds include both fixture IDs: ${fixtureAlertIds.join(' and ')}.`,
];

/**
 * The weekly build runs the golden path and the cap/floor checks are registered
 * for every dataset, so an example that hands the pipeline alerts has to carry
 * the annotations those checks read — otherwise all of their cells are `null`
 * with label `N/A`, adding no signal to the baseline.
 *
 * `maxDiscoveryCount` is the population the fixture hands over (`alertCount`):
 * two alerts forming ONE chain on finance-ws-01, and a discovery cannot
 * aggregate fewer than one alert, so more discoveries than the run was given is
 * excess by construction. `minValidatedDiscoveryCount: 1` is the fixtures' own
 * ground truth — their `expectedWorkflowStages` end in `validation`, their
 * `attackDiscoveries` hold one discovery, and their criteria require it.
 *
 * Both keys stay absent on the two zero-alert fixtures
 * (`missing-alert-retrieval`, `status-only`): they hand the pipeline nothing, so
 * a ceiling or floor would assert about a discovery population that does not
 * exist. Their cap/floor cells keep the `N/A` label that marks them non-scoring.
 */
export const goldenPathExamples: AttackDiscoveryAgentBuilderExample[] = [
  {
    input: {
      question: providedAlertFixture.question,
      triageType: 'provided-alerts',
      expectedSkills: ['attack-discovery-generator'],
      expectedToolPath: ['security.attack-discovery.run'],
      attachments: [{ type: 'security.alerts', data: { alertIds: fixtureAlertIds } }],
    },
    output: {
      expectedToolPath: ['security.attack-discovery.run'],
      expectedWorkflowStages: ['generation', 'validation'],
      expectedRetrievedAlertCount: null,
      expectedPassedAlertCount: providedAlertFixture.alertCount,
      attackDiscoveries: expectedAttackDiscoveries,
      criteria: sharedCriteria,
      maxDiscoveryCount: providedAlertFixture.alertCount,
      minValidatedDiscoveryCount: 1,
    },
    metadata: {
      alertCount: providedAlertFixture.alertCount,
      fixture: 'provided-alerts',
    },
  },
  {
    input: {
      question: liveRetrievalFixture.question,
      triageType: 'live-retrieval',
      expectedSkills: ['attack-discovery-generator'],
      expectedToolPath: [
        'security.attack-discovery.get_default_esql_query',
        'platform.core.execute_esql',
        'security.attack-discovery.run',
      ],
      // The question names this marker, and the assertion below is an EXACT
      // population of a SHARED index, so the retrieval is counted only when its
      // query carries the marker. Measured on the recorded reps of this example:
      // every one that ran ES|QL carried it (`tags == "x"`, `tags LIKE "*x*"`,
      // `QSTR("x")`, an OR-chain).
      retrievalScope: attackDiscoveryFixtureMarker,
    },
    output: {
      expectedToolPath: [
        'security.attack-discovery.get_default_esql_query',
        'platform.core.execute_esql',
        'security.attack-discovery.run',
      ],
      // When the agent retrieves alerts upstream and hands them to the AD
      // pipeline in `provided` mode, the audited pipeline skips its own
      // `alert_retrieval` stage and only records `generation` and `validation`.
      expectedWorkflowStages: ['generation', 'validation'],
      expectedRetrievedAlertCount: liveRetrievalFixture.alertCount,
      expectedPassedAlertCount: liveRetrievalFixture.alertCount,
      attackDiscoveries: expectedAttackDiscoveries,
      criteria: sharedCriteria,
      maxDiscoveryCount: liveRetrievalFixture.alertCount,
      minValidatedDiscoveryCount: 1,
    },
    metadata: {
      alertCount: liveRetrievalFixture.alertCount,
      fixture: 'live-retrieval',
    },
  },
  {
    input: {
      question: multipleAlertSetsFixture.question,
      triageType: 'multiple-alert-sets',
      expectedSkills: ['attack-discovery-generator'],
      expectedToolPath: ['security.attack-discovery.run'],
      attachments: [
        { type: 'security.alerts', data: { alertIds: [...multipleAlertSetsFixture.ids] } },
      ],
    },
    output: {
      expectedToolPath: ['security.attack-discovery.run'],
      expectedWorkflowStages: ['generation', 'validation'],
      expectedRetrievedAlertCount: null,
      expectedPassedAlertCount: multipleAlertSetsFixture.alertCount,
      attackDiscoveries: expectedAttackDiscoveries,
      criteria: sharedCriteria,
      maxDiscoveryCount: multipleAlertSetsFixture.alertCount,
      minValidatedDiscoveryCount: 1,
    },
    metadata: {
      alertCount: multipleAlertSetsFixture.alertCount,
      fixture: 'multiple-alert-sets',
    },
  },
  {
    input: {
      question: missingAlertRetrievalFixture.question,
      triageType: 'live-retrieval',
      expectedSkills: ['attack-discovery-generator'],
      expectedToolPath: [
        'security.attack-discovery.get_default_esql_query',
        'platform.core.execute_esql',
      ],
    },
    output: {
      expectedToolPath: [
        'security.attack-discovery.get_default_esql_query',
        'platform.core.execute_esql',
      ],
      expectedWorkflowStages: [],
      expectedRetrievedAlertCount: null,
      expectedPassedAlertCount: null,
    },
    metadata: {
      alertCount: missingAlertRetrievalFixture.alertCount,
      fixture: 'missing-alert-retrieval',
    },
  },
  {
    input: {
      question: statusOnlyFixture.question,
      triageType: 'status-only',
      expectedSkills: ['attack-discovery-generator'],
      expectedToolPath: ['security.attack-discovery.get_status'],
      executionUuid: statusOnlyFixture.executionUuid,
    },
    output: {
      expectedToolPath: ['security.attack-discovery.get_status'],
      expectedWorkflowStages: [],
      expectedRetrievedAlertCount: null,
      expectedPassedAlertCount: null,
    },
    metadata: {
      alertCount: statusOnlyFixture.alertCount,
      fixture: 'status-only',
    },
  },
];

/**
 * The dataset the weekly golden-path spec registers, shared with the unit tests
 * so its declarations cannot drift from what the spec runs.
 *
 * The fixture seeds only the two marker alerts — no noise population — so
 * `NoiseFalsePositive` has no forbidden set to answer from and returns a
 * deliberate `N/A` on every example: it is declared non-scoring here instead of
 * being registered to fill the weekly baseline with a column that can never
 * score. The evaluator itself is untouched, and the full-profile cohort, whose
 * examples do declare noise ids, still scores it.
 */
export const goldenPathDataset: AttackDiscoveryAgentBuilderDataset = {
  name: 'attack-discovery-agent-builder: golden-path',
  description:
    'Isolated default-Agent Builder Attack Discovery 2.0 golden path. This is not a legacy direct-generation cohort.',
  examples: goldenPathExamples,
  nonScoringEvaluators: ['NoiseFalsePositive'],
};
