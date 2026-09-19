/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_CLEAN_SCENARIO_KEYS } from '../scenario_registry';
import { AD2_DENSE_TARGET_ALERTS } from '../scenario_registry/dense_scenarios';
import type { AttackDiscoveryAgentBuilderExample } from '../types';
import { buildCleanProfileReferenceDiscoveries } from './clean_profile_provided_alerts';

/**
 * Dense-profile live retrieval.
 *
 * The clean-profile datasets hand the model four alert IDs and ask it to
 * triage them. That measures write-up quality, not detection: the correlation
 * work is already done by the fixture.
 *
 * Here the model retrieves from an index holding AD2_DENSE_TARGET_ALERTS
 * alerts, of which only the four clean chains are real. Finding them is the
 * task. This is the volume-sensitive measurement the clean profile cannot make.
 *
 * The retrieval is scoped to THIS run's marker, the same way the golden-path
 * live-retrieval example scopes its own. That scope is load-bearing rather than
 * cosmetic: the expectation below is an EXACT population, and
 * `.alerts-security.alerts-default` is a shared index — the sibling
 * golden-path spec seeds its own alerts into it, a concurrent invocation of
 * this suite seeds the clean profile's chains into it, and anything else
 * present at retrieval time changes the observed count, scoring a correct full
 * retrieval as a failure. The run marker is the only bound that separates this
 * run's population from every other one; the 24h window only bounds it in time
 * (the background chains are spread up to 20 hours back — see `startHoursAgo`
 * in `dense_scenarios.ts`).
 */
export const buildDenseProfileLiveRetrievalExample = (
  runMarker: string
): AttackDiscoveryAgentBuilderExample => ({
  input: {
    question: `Run Attack Discovery by retrieving alerts with the marker ${runMarker} from the last 24 hours and return the validated discoveries.`,
    triageType: 'live-retrieval',
    expectedSkills: ['attack-discovery-generator'],
    // The retrieval tools are IN the path because this profile's whole point is
    // the retrieval: `StrictTrajectory` scores
    // `expectedPath.length / non-load-skill tool calls`, so a path holding only
    // `run` scored a model that skipped retrieval and called `run` directly at
    // 1.0 while scoring a correct scoped retrieval
    // (`get_default_esql_query -> execute_esql -> run`) at 1/3 — the metric
    // rewarded bypassing the behaviour under test. The golden live-retrieval
    // example names the same three tools for the same reason.
    expectedToolPath: [
      'security.attack-discovery.get_default_esql_query',
      'platform.core.execute_esql',
      'security.attack-discovery.run',
    ],
    // The scope the retrieval is counted under, not just the scope the question
    // asks for: a retrieval that does not carry the marker observes whatever the
    // shared index held, so its row count is not this fixture's population.
    retrievalScope: runMarker,
  },
  output: {
    expectedToolPath: [
      'security.attack-discovery.get_default_esql_query',
      'platform.core.execute_esql',
      'security.attack-discovery.run',
    ],
    expectedWorkflowStages: ['generation', 'validation'],
    // The model retrieves the whole seeded population (scoped by the marker in
    // `input.question`).
    expectedRetrievedAlertCount: AD2_DENSE_TARGET_ALERTS,
    // Deliberately ABSENT (not `null`): how many alerts SHOULD survive triage
    // is a judgement, and pinning a number here would score correlation
    // behaviour against an assumption rather than against evidence. Under the
    // evaluator's contract `null` asserts the run reports `null` — a
    // guaranteed 0 on any run that passes alerts (measured on golden: the one
    // dense run with complete evidence scored 0 for exactly this reason).
    // Omitting the key leaves the passed count unscored.
    //
    // The reference discoveries make the Rubric evaluator fire on this
    // profile; without them it is structurally N/A (7/7 N/A on golden). They
    // are resolved from the same marker the seeder writes ids with, so the
    // reference names this run's documents and not a previous run's.
    attackDiscoveries: buildCleanProfileReferenceDiscoveries(runMarker).map((discovery) => ({
      ...discovery,
      alertIds: [...discovery.alertIds],
    })),
    criteria: [
      'The response identifies attack chains rather than restating individual alerts.',
      'Discoveries are grounded in alerts that exist in the retrieved set.',
      'Background noise (logon failure bursts contained by the lockout policy, share enumeration, cron edits) is not promoted into a discovery on its own.',
      // The ground-truth half of the fixture's escalated noise: one background
      // chain carries the severities the four reference chains use (see
      // `bg-vendor-update`), so severity alone no longer separates target from
      // noise. A high/critical background step that the reference does not
      // contain would score a model that surfaces it as a false positive, so the
      // benign reading has to be checkable HERE, in the annotation the judge
      // reads: this names the class and says the severity does not make it an
      // attack. A model that reads the vendor-signed update as benign is
      // therefore not penalised for leaving it out, and one that promotes it on
      // severity loses exactly this criterion — which is the precision the
      // profile exists to measure.
      'A vendor-signed agent or driver update installed by the management agent is background activity rather than an attack chain, even where the detecting rule reports high or critical severity.',
    ],
  },
  metadata: {
    alertCount: AD2_DENSE_TARGET_ALERTS,
    fixture: 'live-retrieval',
    scenarioKey: 'dense-profile-live-retrieval',
    seedProfile: 'dense',
  },
});

export const buildDenseProfileLiveRetrievalDataset = (runMarker: string) => ({
  name: 'attack-discovery-agent-builder: scenario-registry (dense profile)',
  description: `Live-retrieval Attack Discovery over a ${AD2_DENSE_TARGET_ALERTS}-alert seeded population containing ${AD2_CLEAN_SCENARIO_KEYS.length} real attack chains and synthetic background noise.`,
  examples: [buildDenseProfileLiveRetrievalExample(runMarker)],
});
