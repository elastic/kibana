/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AD2_CLEAN_SCENARIO_KEYS,
  createAd2RunMarker,
  getAd2ScenarioAlertIds,
} from '../scenario_registry';
import { AD2_DENSE_TARGET_ALERTS } from '../scenario_registry/dense_scenarios';
import { buildAd2SeedPlan } from '../scenario_registry/registry';
import { buildDenseProfileLiveRetrievalExample } from './dense_profile_live_retrieval';

const RUN_MARKER = createAd2RunMarker('dense-dataset-test');
const example = buildDenseProfileLiveRetrievalExample(RUN_MARKER);

const referenceAlertIds = (candidate: typeof example): string[] =>
  (candidate.output?.attackDiscoveries ?? []).flatMap((discovery) => [...discovery.alertIds]);

describe('dense profile live-retrieval dataset', () => {
  // Rubric is structurally N/A without reference attackDiscoveries (it skips
  // when `expected.attackDiscoveries` is empty) — measured 7/7 N/A on golden
  // for the dense profile before the reference was wired in. Pin the reference
  // so the suite's main quality signal cannot silently drop off dense again.
  it('carries the four clean chains as reference attack discoveries', () => {
    const reference = example.output?.attackDiscoveries ?? [];
    // `?? []` keeps this non-vacuous: an absent output makes the length fail.
    expect(reference).toHaveLength(AD2_CLEAN_SCENARIO_KEYS.length);

    const expectedRealAlertIds = AD2_CLEAN_SCENARIO_KEYS.flatMap((key) => [
      ...getAd2ScenarioAlertIds(key, 'clean', RUN_MARKER),
    ]);
    expect(referenceAlertIds(example).sort()).toEqual([...expectedRealAlertIds].sort());
  });

  // The reference is a set of ids, and the seeder writes the ids of ITS run.
  // A reference resolved against another marker names documents that are not in
  // the population under test, which the Rubric evaluator scores as a miss.
  it("resolves the reference ids against the run's own marker", () => {
    const otherRunExample = buildDenseProfileLiveRetrievalExample(
      createAd2RunMarker('another-dense-run')
    );

    expect(referenceAlertIds(otherRunExample).sort()).not.toEqual(
      referenceAlertIds(example).sort()
    );
    expect(referenceAlertIds(otherRunExample)).toHaveLength(referenceAlertIds(example).length);
  });

  // The WorkflowEvidence evaluator reads `null` as "assert the run reports
  // null" (its Fix-3 contract), so a `null` here makes dense unwinnable: any
  // run that passes alerts scores 0 (measured on golden). The passed count
  // must stay UNSCORED, which the contract expresses only as an absent key.
  it('leaves the passed alert count unscored (absent, not null)', () => {
    expect(Object.prototype.hasOwnProperty.call(example.output, 'expectedPassedAlertCount')).toBe(
      false
    );
  });

  it('still expects retrieval of the whole seeded population', () => {
    expect(example.output?.expectedRetrievedAlertCount).toBe(AD2_DENSE_TARGET_ALERTS);
  });

  // The expectation above is an EXACT population asserted against
  // `.alerts-security.alerts-default`, which is a shared index: the sibling
  // golden-path spec seeds two of its own alerts into it (`fixtures.ts`), a
  // concurrent invocation of this suite seeds the clean profile's chains into
  // it, and any other alert present at retrieval time changes the observed
  // count, scoring a correct full retrieval as a failure. The retrieval
  // therefore has to be scoped to THIS run, and the scope has to name a marker
  // the seeded documents actually carry in a field a generated query can filter
  // on.
  it('scopes the retrieval to the marker the seeded population carries', () => {
    const question = example.input?.question ?? '';
    expect(question).toContain(RUN_MARKER);
    // Instructing the scope is not enough: the example DECLARES it, and the
    // extraction counts a retrieval only when its query carries the declared
    // marker. Without this the exact 95-row assertion is satisfiable by any
    // 95-row query against the shared alerts index.
    expect(example.input?.retrievalScope).toBe(RUN_MARKER);

    const plan = buildAd2SeedPlan({
      profile: 'dense',
      baseTime: new Date('2026-07-01T00:00:00.000Z'),
      runMarker: RUN_MARKER,
    });
    expect(plan.alerts).toHaveLength(AD2_DENSE_TARGET_ALERTS);

    const taggedAlerts = plan.alerts.filter((alert) =>
      ((alert.source.tags as string[] | undefined) ?? []).includes(RUN_MARKER)
    );
    expect(taggedAlerts).toHaveLength(AD2_DENSE_TARGET_ALERTS);
  });

  // `StrictTrajectory` scores `expectedPath.length / non-load-skill calls`, so
  // the path itself decides what the metric rewards. A path of `[run]` scored a
  // model that skipped retrieval and called `run` directly at 1.0, while a
  // correct scoped retrieval (`get_default_esql_query -> execute_esql -> run`)
  // scored 1/3 — the metric paid more for bypassing the retrieval this profile
  // exists to measure than for performing it.
  it('expects the retrieval tools in the trajectory, so bypassing retrieval cannot score higher', () => {
    const path = example.output?.expectedToolPath ?? [];
    expect(path).toEqual([
      'security.attack-discovery.get_default_esql_query',
      'platform.core.execute_esql',
      'security.attack-discovery.run',
    ]);
    // The input path is what the dataset asserts; keep the two from drifting.
    expect(example.input?.expectedToolPath).toEqual(path);
    expect(path).not.toEqual(['security.attack-discovery.run']);
  });

  // The Criteria evaluator hands `expected.criteria` straight to the LLM judge
  // (`attack_discovery_criteria_evaluator.ts`): an empty array returns N/A and
  // skips the check entirely, and a shortened array silently drops whatever
  // criterion was lost — which is how the 4th entry below went missing once,
  // caught only by a human reading the diff. Every other invariant of this
  // module is pinned; this one is the annotation the judge actually reads.
  it('annotates the judge with all four criteria, including the benign vendor update', () => {
    const criteria = example.output?.criteria ?? [];
    // `?? []` keeps this non-vacuous: an absent annotation fails the length
    // rather than passing an empty `.every()`.
    expect(criteria).toHaveLength(4);

    // The escalated background chain (`bg-vendor-update`) carries the same
    // severities as the four reference chains, so severity alone no longer
    // separates target from noise. Assert the distinguishing content rather
    // than the whole sentence, so a wording tweak survives and a deletion does
    // not: the class has to be named, and the severity explicitly discounted.
    const benignVendorUpdate = criteria[3];
    expect(benignVendorUpdate).toMatch(/vendor-signed|management agent/);
    expect(benignVendorUpdate).toMatch(/severity/);
  });
});
