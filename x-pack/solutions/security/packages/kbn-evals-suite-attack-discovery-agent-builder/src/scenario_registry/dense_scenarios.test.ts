/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_CLEAN_SCENARIO_KEYS } from './clean_scenarios';
import { AD2_DENSE_BACKGROUND_TEMPLATES, AD2_DENSE_TARGET_ALERTS } from './dense_scenarios';
import {
  buildAd2SeedPlan,
  getAd2Scenario,
  getAd2ScenarioAlertIds,
  listAd2ScenarioKeys,
} from './registry';
import type { Ad2ScenarioDefinition, Ad2ScenarioStep, Ad2SeedPlan, Ad2SeedProfile } from './types';

const fixedBaseTime = new Date('2026-07-01T00:00:00.000Z');

/**
 * Ids are opaque digests of `(scenarioKey, stepNumber)`, so a test cannot read
 * the key back out of one. Grouping therefore goes through the resolver the
 * datasets use — which is the property that has to hold anyway: whatever the
 * seeder writes, the reference `alertIds` have to name.
 */
const scenarioKeyByAlertId = (profile: Ad2SeedProfile): Map<string, string> => {
  const byId = new Map<string, string>();
  for (const key of listAd2ScenarioKeys(profile)) {
    for (const id of getAd2ScenarioAlertIds(key, profile)) {
      byId.set(id, key);
    }
  }
  return byId;
};

const countAlertsPerScenario = (
  alerts: readonly { id: string }[],
  byId: Map<string, string>
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const alert of alerts) {
    const key = byId.get(alert.id);
    if (key === undefined) {
      throw new Error(`no scenario key resolves the seeded alert id ${alert.id}`);
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

const isBackgroundScenarioKey = (scenarioKey: string): boolean =>
  AD2_DENSE_BACKGROUND_TEMPLATES.some((template) => scenarioKey.startsWith(`${template.key}-`));

/**
 * The steps of one side of the dense split — background noise, or the four
 * reference chains — read through the resolver the datasets use, the same way
 * `scenarioKeyByAlertId` does: whatever the fixture emits, the discriminator
 * checks below have to see it.
 */
const denseStepsBySide = (dense: Ad2SeedPlan, background: boolean): Ad2ScenarioStep[] =>
  dense.scenarioKeys
    .filter((scenarioKey) => isBackgroundScenarioKey(scenarioKey) === background)
    .flatMap((scenarioKey) => getAd2Scenario(scenarioKey, 'dense')?.steps ?? []);

const backgroundOccurrences = (templateKey: string): Ad2ScenarioDefinition[] =>
  listAd2ScenarioKeys('dense')
    .filter((key) => key.startsWith(`${templateKey}-`))
    .map((key) => getAd2Scenario(key, 'dense'))
    .filter((scenario): scenario is Ad2ScenarioDefinition => scenario !== undefined);

describe('AD2 scenario registry (dense profile)', () => {
  it('seeds exactly the target alert volume', () => {
    const plan = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });

    // The whole point of the profile is the volume. If this drifts, a "dense"
    // board silently stops being magnitude-comparable to the reference trial.
    expect(plan.alerts).toHaveLength(AD2_DENSE_TARGET_ALERTS);
    expect(AD2_DENSE_TARGET_ALERTS).toBe(95);
  });

  it('is a strict superset of the clean profile', () => {
    const clean = buildAd2SeedPlan({ profile: 'clean', baseTime: fixedBaseTime });
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });

    const denseIds = new Set(dense.alerts.map((alert) => alert.id));
    for (const alert of clean.alerts) {
      expect(denseIds.has(alert.id)).toBe(true);
    }
    expect(dense.alerts.length).toBeGreaterThan(clean.alerts.length);
  });

  it('keeps the four target chains addressable', () => {
    const denseKeys = listAd2ScenarioKeys('dense');
    for (const key of AD2_CLEAN_SCENARIO_KEYS) {
      expect(denseKeys).toContain(key);
    }
  });

  it('spreads background alerts across distinct hosts', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const hosts = new Set(
      dense.alerts.map((alert) => {
        const source = alert.source as { host?: { name?: string } };
        return source.host?.name;
      })
    );

    // A crowded index that is really one host would correlate trivially and
    // would not test triage at volume at all.
    expect(hosts.size).toBeGreaterThan(10);
  });

  it('keeps each background chain length occurrence-independent', () => {
    for (const template of AD2_DENSE_BACKGROUND_TEMPLATES) {
      const lengths = new Set(
        [1, 2, 3, 7, 12].map(
          (occurrence) => template.stepsFor({ occurrence, host: `host-${occurrence}` }).length
        )
      );

      // The truncation test below reads its expectation from the template, so
      // that expectation is only meaningful while the template's length does
      // not depend on which occurrence it is being expanded for.
      expect(lengths.size).toBe(1);
    }
  });

  it('emits every background chain at its template length, never truncated', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const perScenario = countAlertsPerScenario(dense.alerts, scenarioKeyByAlertId('dense'));

    // The expectation is read from the TEMPLATE, never from the emitted
    // scenario: a builder that trims `steps` to fit the residual budget shrinks
    // the emitted definition in lockstep, so any comparison drawn from it stays
    // green while a partial chain is seeded. (Measured: with
    // `steps: template.steps.slice(0, budget)` in `buildBackgroundScenarios`,
    // the previous version of this test passed 6/6 and emitted a one-step
    // `bg-rdp-bruteforce` chain.)
    const emittedBackground = [...perScenario].filter(([key]) => isBackgroundScenarioKey(key));
    expect(emittedBackground.length).toBeGreaterThan(0);
    // The comparison is only meaningful while a multi-step template exists.
    expect(
      AD2_DENSE_BACKGROUND_TEMPLATES.some(
        (template) => template.stepsFor({ occurrence: 1, host: template.host }).length > 1
      )
    ).toBe(true);

    for (const [scenarioKey, alertCount] of emittedBackground) {
      const template = AD2_DENSE_BACKGROUND_TEMPLATES.find((candidate) =>
        scenarioKey.startsWith(`${candidate.key}-`)
      );
      expect(alertCount).toBe(template?.stepsFor({ occurrence: 1, host: template.host }).length);
    }
  });

  it('keeps background chains non-actionable', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const backgroundKeys = dense.scenarioKeys.filter(isBackgroundScenarioKey);
    const steps = backgroundKeys.flatMap((key) => getAd2Scenario(key, 'dense')?.steps ?? []);

    expect(backgroundKeys.length).toBeGreaterThan(0);
    expect(steps.length).toBeGreaterThan(0);

    // The dense ground truth is the four clean chains alone and the Rubric
    // scores a submission on alertId overlap with that reference, so a
    // background step reporting a successful authentication — after the failure
    // burst that precedes it — reads as a compromise chain and costs a model
    // that correctly surfaces it. Text proxy on the observable fields; the
    // point is that reintroducing a success step has to be deliberate.
    for (const backgroundStep of steps) {
      expect(`${backgroundStep.ruleName} ${backgroundStep.message}`).not.toMatch(
        /successful|succeeded|success/i
      );
    }
    // ...and the failure burst is contained by a control rather than escalating.
    expect(steps.map((backgroundStep) => backgroundStep.ruleName)).toContain(
      'Account Lockout Policy Triggered'
    );
  });

  it('does not let severity separate target from noise', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const backgroundSteps = denseStepsBySide(dense, true);
    const targetSteps = denseStepsBySide(dense, false);

    // Non-vacuity: "no separation" means nothing if either side is empty, and an
    // empty background would satisfy the overlap below.
    expect(backgroundSteps.length).toBeGreaterThan(0);
    expect(targetSteps.length).toBeGreaterThan(0);

    // THE leak this replaces: `severity IN ('high', 'critical')` returned
    // exactly the four reference chains — every target step was high|critical
    // and every background step low|medium — so a model could drop the whole
    // background on one field of the alert it reads and regroup the remainder by
    // host. A severity the targets use and the background does not is that key
    // again, so no severity may be exclusive to the targets.
    const backgroundSeverities = new Set(backgroundSteps.map((step) => step.severity));
    for (const targetSeverity of new Set(targetSteps.map((step) => step.severity))) {
      expect(backgroundSeverities).toContain(targetSeverity);
    }
  });

  it('does not let the risk score separate target from noise either', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const backgroundRiskScores = denseStepsBySide(dense, true).map((step) => step.riskScore);
    const targetRiskScores = denseStepsBySide(dense, false).map((step) => step.riskScore);

    expect(backgroundRiskScores.length).toBeGreaterThan(0);
    expect(targetRiskScores.length).toBeGreaterThan(0);

    // `kibana.alert.risk_score` is written into every seeded alert
    // (`build_documents.ts`), the evaluator's own default query SORTs on it, and
    // the two sides were disjoint there as well (targets 72-96, background
    // 18-47) — the same answer key in a second field. A background maximum
    // merely ABOVE the target minimum is not enough: `risk_score >= 90` then
    // still returned one alert per target HOST, and grouping each of those
    // hosts' alerts recovers the four chains exactly.
    //
    // So the invariant is per target value, not "some background step sits
    // inside the band": for EVERY risk score a target step carries, some
    // background step scores at least as high — which is what leaves no
    // threshold that keeps a target host's alerts and drops the noise.
    for (const targetRiskScore of targetRiskScores) {
      expect(backgroundRiskScores.some((riskScore) => riskScore >= targetRiskScore)).toBe(true);
    }
  });

  it('does not let raw-event backing separate target from noise', () => {
    // The former leak: every clean chain has `raw: true` and every background
    // template had `raw: false`, so `NOT EXISTS(ancestor raw event)` alone
    // regrouped the four target chains — an agent never had to read a single
    // alert field. At least one background template (`bg-endpoint-inventory`)
    // now also carries `raw: true`, with a genuinely benign backing event, so
    // raw-event existence is no longer exclusive to the targets.
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const backgroundKeys = dense.scenarioKeys.filter(isBackgroundScenarioKey);
    const targetKeys = dense.scenarioKeys.filter((key) => !isBackgroundScenarioKey(key));

    const rawByKey = (key: string): boolean => getAd2Scenario(key, 'dense')?.raw ?? false;

    expect(targetKeys.every(rawByKey)).toBe(true);
    expect(backgroundKeys.some(rawByKey)).toBe(true);
    // Non-vacuity for the OTHER direction too: raw is not exclusive to
    // background either, or it would just be a differently-shaped answer key.
    expect(backgroundKeys.some((key) => !rawByKey(key))).toBe(true);
  });

  it('does not let chain length separate target from noise', () => {
    // The former leak: every clean chain has 4 steps and every background
    // occurrence topped out at 2, so `stepCount >= 3` alone regrouped the four
    // target chains. `bg-endpoint-inventory` now also runs 4 steps, so chain
    // length is no longer exclusive to the targets either.
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const targetLengths = new Set(
      dense.scenarioKeys
        .filter((key) => !isBackgroundScenarioKey(key))
        .map((key) => getAd2Scenario(key, 'dense')?.steps.length)
    );
    const backgroundLengths = new Set(
      dense.scenarioKeys
        .filter(isBackgroundScenarioKey)
        .map((key) => getAd2Scenario(key, 'dense')?.steps.length)
    );

    for (const targetLength of targetLengths) {
      expect(backgroundLengths).toContain(targetLength);
    }
  });

  it('does not let raw-backed AND 4-step AND high/critical jointly separate target from noise', () => {
    // The former leak, one level up from the three single-dimension tests
    // above: fixing raw-event backing, chain length, and severity in three
    // DIFFERENT background chains left their conjunction untouched. Every
    // target chain is 4-step + raw + contains a high/critical step; grouping
    // by host and keeping only hosts whose occurrence satisfied all three
    // still recovered exactly the four references, because no single
    // background occurrence combined them. `bg-endpoint-inventory` now does,
    // so the joint predicate has to keep at least one background host too.
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const matchesJointProfile = (scenario: Ad2ScenarioDefinition): boolean =>
      scenario.raw &&
      scenario.steps.length === 4 &&
      scenario.steps.some((step) => step.severity === 'high' || step.severity === 'critical');

    const targetScenarios = dense.scenarioKeys
      .filter((key) => !isBackgroundScenarioKey(key))
      .map((key) => getAd2Scenario(key, 'dense'))
      .filter((scenario): scenario is Ad2ScenarioDefinition => scenario !== undefined);
    const backgroundScenarios = dense.scenarioKeys
      .filter(isBackgroundScenarioKey)
      .map((key) => getAd2Scenario(key, 'dense'))
      .filter((scenario): scenario is Ad2ScenarioDefinition => scenario !== undefined);

    // Non-vacuity: every target has to actually satisfy the joint profile, or
    // the predicate below isn't the one that used to separate the sides.
    expect(targetScenarios.length).toBeGreaterThan(0);
    expect(targetScenarios.every(matchesJointProfile)).toBe(true);

    expect(backgroundScenarios.some(matchesJointProfile)).toBe(true);
  });

  it('does not let host/user cardinality separate target from noise', () => {
    // The former leak: every background template copied one fixed `user`
    // literal into every expanded occurrence, so at the 95-alert budget each
    // background user sat on several hosts while every clean/reference user
    // sat on exactly one. "Group by user, keep only users seen on a single
    // host" then recovered the four references without reading an alert
    // field. Background users are now occurrence-local, so no user should be
    // shared across more than one host.
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const scenarios = dense.scenarioKeys
      .map((key) => getAd2Scenario(key, 'dense'))
      .filter((scenario): scenario is Ad2ScenarioDefinition => scenario !== undefined);
    const hostsByUser = new Map<string, Set<string>>();

    for (const scenario of scenarios) {
      const hosts = hostsByUser.get(scenario.user) ?? new Set<string>();
      hosts.add(scenario.host);
      hostsByUser.set(scenario.user, hosts);
    }

    // Non-vacuity: the dense profile actually re-uses background templates
    // across multiple occurrences, or user cardinality was never at risk of
    // colliding in the first place.
    const backgroundKeyCount = dense.scenarioKeys.filter(isBackgroundScenarioKey).length;
    expect(backgroundKeyCount).toBeGreaterThan(AD2_DENSE_BACKGROUND_TEMPLATES.length);

    for (const [, hosts] of hostsByUser) {
      expect(hosts.size).toBe(1);
    }
  });

  it('leaves no host-aggregate threshold that isolates the reference cohort', () => {
    // The reported defects (round 4): `bg-endpoint-inventory` was the only
    // 4-step background chain, so it was the only background host with 4
    // alerts, and its profile was CONSTANT across occurrences. That made
    // `GROUP BY host | WHERE COUNT(*) = 4` a candidate set of exactly ten hosts,
    // and then any aggregate threshold on those hosts separated the four
    // references from the six background ones. Two were reported — `raw document
    // count = 7` and `MIN(risk_score) >= 72` — but enumerating the space found
    // five (`MAX(risk_score)`, message length bounds, ...), and an intermediate
    // revision of the fix merely INVERTED the key (`MIN(risk_score) <= 75`).
    //
    // The real invariant is range overlap, not "match the reported fields": a
    // background profile that is constant across occurrences is a single point,
    // and a point outside the reference band is separable by a threshold. So no
    // host-level aggregate may sit entirely to one side of the reference range,
    // and — because a conjunction of two individually-overlapping aggregates can
    // still isolate — no PAIR of threshold predicates may select exactly the
    // reference cohort. That conjunction sweep is what this test encodes; it
    // catches an inverted key, a newly-constant profile, and a future edit to
    // any of these numbers.
    const plan = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const referenceHosts = new Set(
      listAd2ScenarioKeys('clean').map((key) => getAd2Scenario(key, 'clean')!.host)
    );

    const rawDocumentsByHost = new Map<string, number>();
    for (const rawEvent of plan.rawEvents as unknown as Array<{
      source?: { host?: { name?: string } };
    }>) {
      const host = rawEvent.source?.host?.name;
      if (host) rawDocumentsByHost.set(host, (rawDocumentsByHost.get(host) ?? 0) + 1);
    }

    // Only the fields this sweep reads are typed; the alert source is a loose
    // document, so the shape is declared here rather than inferred.
    interface AlertRow {
      message?: unknown;
      host?: { name?: string };
      file?: { path?: unknown };
      process?: { name?: unknown; command_line?: unknown };
      'kibana.alert.risk_score': number;
      'kibana.alert.severity': string;
      'kibana.alert.rule.name': string;
    }
    const alertsByHost = new Map<string, AlertRow[]>();
    for (const alert of plan.alerts) {
      const source = alert.source as unknown as AlertRow;
      const host = String(source.host?.name ?? '');
      alertsByHost.set(host, [...(alertsByHost.get(host) ?? []), source]);
    }

    // Entry point: the hosts a model would reach by cardinality alone.
    const cohort = [...alertsByHost.entries()].filter(([, rows]) => rows.length === 4);
    const referenceCohort = cohort.filter(([host]) => referenceHosts.has(host));
    const backgroundCohort = cohort.filter(([host]) => !referenceHosts.has(host));
    expect(referenceCohort).toHaveLength(4);
    // Non-vacuity: with no background host in the cohort the sweep proves
    // nothing, because every predicate would trivially isolate the references.
    expect(backgroundCohort.length).toBeGreaterThan(0);

    const aggregates: Record<string, (rows: AlertRow[]) => number> = {
      minRiskScore: (rows) => Math.min(...rows.map((row) => row['kibana.alert.risk_score'])),
      maxRiskScore: (rows) => Math.max(...rows.map((row) => row['kibana.alert.risk_score'])),
      sumRiskScore: (rows) => rows.reduce((sum, row) => sum + row['kibana.alert.risk_score'], 0),
      minMessageLength: (rows) => Math.min(...rows.map((row) => String(row.message ?? '').length)),
      maxMessageLength: (rows) => Math.max(...rows.map((row) => String(row.message ?? '').length)),
      sumMessageLength: (rows) =>
        rows.reduce((sum, row) => sum + String(row.message ?? '').length, 0),
      minCommandLineLength: (rows) =>
        Math.min(...rows.map((row) => String(row.process?.command_line ?? '').length)),
      maxCommandLineLength: (rows) =>
        Math.max(...rows.map((row) => String(row.process?.command_line ?? '').length)),
      // The field one of the reported defects used: `COUNT(*) = 4 AND <4 non-null
      // command lines>` recovered the references while two of the background
      // chain's steps carried nulls. Counted explicitly so the sweep pins it
      // rather than relying on a null collapsing to a zero length above.
      nullCommandLineCount: (rows) =>
        rows.filter((row) => row.process?.command_line == null).length,
      filePathCount: (rows) => rows.filter((row) => row.file?.path != null).length,
      rawDocumentCount: (rows) => rawDocumentsByHost.get(String(rows[0].host?.name ?? '')) ?? 0,
      distinctProcessNames: (rows) => new Set(rows.map((row) => row.process?.name)).size,
      distinctRuleNames: (rows) => new Set(rows.map((row) => row['kibana.alert.rule.name'])).size,
      riskScoreSpread: (rows) =>
        Math.max(...rows.map((row) => row['kibana.alert.risk_score'])) -
        Math.min(...rows.map((row) => row['kibana.alert.risk_score'])),
      // Severity composition. A count of steps at or above a level is exactly
      // the shape `WHERE severity IN ('high','critical')` takes once grouped by
      // host, so it belongs in the sweep: dropping the background chain's
      // critical step makes `criticalCount >= 1` select the four references and
      // nothing else, which is how this aggregate earned its place here.
      criticalCount: (rows) =>
        rows.filter((row) => row['kibana.alert.severity'] === 'critical').length,
      highOrAboveCount: (rows) =>
        rows.filter((row) => ['high', 'critical'].includes(String(row['kibana.alert.severity'])))
          .length,
      distinctSeverities: (rows) => new Set(rows.map((row) => row['kibana.alert.severity'])).size,
    };

    // Candidate predicates: every >= / <= at every value the cohort actually
    // takes, which is the full set a model could form from the observed data.
    const predicates: Array<{ label: string; selects: (rows: AlertRow[]) => boolean }> = [];
    for (const [name, aggregate] of Object.entries(aggregates)) {
      for (const value of new Set(cohort.map(([, rows]) => aggregate(rows)))) {
        predicates.push({
          label: `${name} >= ${value}`,
          selects: (rows) => aggregate(rows) >= value,
        });
        predicates.push({
          label: `${name} <= ${value}`,
          selects: (rows) => aggregate(rows) <= value,
        });
      }
    }

    const isolatesReferences = (selected: Array<[string, AlertRow[]]>): boolean =>
      selected.length === referenceCohort.length &&
      selected.every(([host]) => referenceHosts.has(host));

    // Singles first: a single threshold that isolates the cohort is the same
    // leak one level down, and checking only pairs would let it through.
    const isolatingSingles = predicates
      .filter((predicate) =>
        isolatesReferences(cohort.filter(([, rows]) => predicate.selects(rows)))
      )
      .map((predicate) => predicate.label);
    expect(isolatingSingles).toEqual([]);

    const isolatingPairs: string[] = [];
    for (let first = 0; first < predicates.length; first++) {
      for (let second = first + 1; second < predicates.length; second++) {
        const selected = cohort.filter(
          ([, rows]) => predicates[first].selects(rows) && predicates[second].selects(rows)
        );
        if (isolatesReferences(selected)) {
          isolatingPairs.push(`${predicates[first].label} AND ${predicates[second].label}`);
        }
      }
    }

    expect(isolatingPairs).toEqual([]);
  });

  it('does not let 4-alert host cardinality plus command-line coverage separate the sides', () => {
    // The reported defect: `bg-endpoint-inventory` was the only 4-step
    // background chain and two of its four steps had a null command line, so
    // "group by host, keep hosts with 4 alerts AND 4 non-null command lines"
    // recovered exactly the four references — every clean chain is 4 steps with
    // command lines on all of them. Measured before the fix: of the 10
    // four-alert hosts, exactly 4 had 4/4 non-null command lines and those were
    // the references. The tuple has to overlap on both counts.
    const plan = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const byHost = new Map<string, Array<{ commandLine: string | null }>>();

    for (const alert of plan.alerts as unknown as Array<{
      source: { host?: { name?: string }; process?: { command_line?: string | null } };
    }>) {
      const host = alert.source?.host?.name ?? '(none)';
      const rows = byHost.get(host) ?? [];
      rows.push({ commandLine: alert.source?.process?.command_line ?? null });
      byHost.set(host, rows);
    }

    const fourAlertHosts = [...byHost.entries()].filter(([, rows]) => rows.length === 4);
    expect(fourAlertHosts).toHaveLength(10);

    const withFullCommandLineCoverage = fourAlertHosts.filter(([, rows]) =>
      rows.every((row) => row.commandLine != null)
    );

    // Before the fix this cell held exactly the 4 references; the background
    // chain's nulls are what excluded it. Both sides must now occupy it, so the
    // tuple selects neither — the references are inside it, and so is noise.
    expect(withFullCommandLineCoverage.length).toBeGreaterThan(4);
    expect(withFullCommandLineCoverage.length).toBe(fourAlertHosts.length);
  });

  it('does not let process-name frequency separate target from noise', () => {
    // Same invariant as rule-name frequency, one field over: `process.name` is
    // exposed on the alert, and measured on the emitted dense plan every clean
    // process name appeared at most 4 times while every background name
    // appeared at least 6 (`svchost.exe` 12x, `inventory-agent` 24x) — so
    // `GROUP BY process.name | WHERE COUNT(*) <= 5` recovered all 16 reference
    // alerts and no background alert. Both sides must occupy the same frequency
    // range, or frequency alone solves the population.
    const plan = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const cleanNames = new Set<string>();
    const backgroundNames = new Set<string>();
    const frequency = new Map<string, { clean: number; background: number }>();

    const steps = listAd2ScenarioKeys('dense').flatMap((scenarioKey) => {
      const scenario = getAd2Scenario(scenarioKey, 'dense');
      if (!scenario) throw new Error(`Unknown dense scenario ${scenarioKey}`);
      return scenario.steps
        .filter((step) => step.processName != null)
        .map((step) => ({
          isBackground: scenarioKey.startsWith('bg-'),
          processName: step.processName as string,
        }));
    });

    for (const { isBackground, processName } of steps) {
      (isBackground ? backgroundNames : cleanNames).add(processName);
      const entry = frequency.get(processName) ?? { clean: 0, background: 0 };
      entry[isBackground ? 'background' : 'clean'] += 1;
      frequency.set(processName, entry);
    }

    expect(plan.alerts).toHaveLength(AD2_DENSE_TARGET_ALERTS);
    expect(cleanNames.size).toBeGreaterThan(0);
    expect(backgroundNames.size).toBeGreaterThan(0);

    // The invariant that matters: no frequency threshold can separate the
    // sides. Asserting non-overlap of the NAME sets is what fails when a
    // background name is left unsuffixed and repeats across occurrences.
    const shared = [...cleanNames].filter((name) => backgroundNames.has(name));
    expect(shared).toEqual([]);

    const cleanFrequencies = [...frequency.values()].filter((e) => e.clean > 0).map((e) => e.clean);
    const backgroundFrequencies = [...frequency.values()]
      .filter((e) => e.background > 0)
      .map((e) => e.background);
    // Both sides must reach into the same range, so no threshold on frequency
    // alone splits them.
    expect(Math.max(...cleanFrequencies)).toBeGreaterThanOrEqual(
      Math.min(...backgroundFrequencies)
    );
  });

  it('does not let rule-name frequency separate target from noise', () => {
    // The last field that separated the sides: each clean/reference rule name
    // appeared exactly once (one chain each) while each background rule name
    // appeared 6-7 times (one per expanded occurrence). `kibana.alert.rule.name`
    // could therefore be solved by keeping only the names with a population
    // count of one, recovering the four references without reading an alert
    // field. Occurrence-local rule names put every name on one host.
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const scenarios = dense.scenarioKeys
      .map((key) => ({ key, scenario: getAd2Scenario(key, 'dense') }))
      .filter(
        (entry): entry is { key: string; scenario: Ad2ScenarioDefinition } =>
          entry.scenario !== undefined
      );

    const frequencyByName = new Map<string, number>();
    for (const { scenario } of scenarios) {
      for (const scenarioStep of scenario.steps) {
        frequencyByName.set(
          scenarioStep.ruleName,
          (frequencyByName.get(scenarioStep.ruleName) ?? 0) + 1
        );
      }
    }

    const frequencies = (background: boolean): number[] => {
      const names = new Set(
        scenarios
          .filter(({ key }) => isBackgroundScenarioKey(key) === background)
          .flatMap(({ scenario }) => scenario.steps.map((scenarioStep) => scenarioStep.ruleName))
      );
      return [...names].map((name) => frequencyByName.get(name) ?? 0);
    };

    const targetFrequencies = frequencies(false);
    const backgroundFrequencies = frequencies(true);

    // Non-vacuity: both sides have to carry rule names, or "no separation"
    // holds trivially.
    expect(targetFrequencies.length).toBeGreaterThan(0);
    expect(backgroundFrequencies.length).toBeGreaterThan(0);

    for (const targetFrequency of new Set(targetFrequencies)) {
      expect(backgroundFrequencies).toContain(targetFrequency);
    }
  });

  it('keeps every escalated background step benign on its own fields', () => {
    // A background step is only allowed to be high|critical when its own fields
    // does not contain, and the Criteria evaluator then scores a model that read
    // the alert correctly as a false positive. So the escalation is not a
    // severity value to copy onto another template — the marker below is the
    // observable `bg-vendor-update`'s comment names, and escalating anything
    // else means putting the wording in that template's fields and extending
    // this table first.
    const escalatedMarkerByTemplate: Record<string, string> = {
      'bg-vendor-update': 'vendor-signed',
      'bg-endpoint-inventory': 'signed inventory agent',
    };

    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const escalatedTemplateKeys = new Set(
      dense.scenarioKeys
        .filter(isBackgroundScenarioKey)
        .filter((scenarioKey) =>
          (getAd2Scenario(scenarioKey, 'dense')?.steps ?? []).some(
            (step) => step.severity === 'high' || step.severity === 'critical'
          )
        )
        .map((scenarioKey) => scenarioKey.replace(/-\d+$/, ''))
    );

    // Non-vacuity: the escalation is what breaks the severity key, so it has to
    // exist for this test to be about anything.
    expect(escalatedTemplateKeys.size).toBeGreaterThan(0);
    expect([...escalatedTemplateKeys].sort()).toEqual(
      Object.keys(escalatedMarkerByTemplate).sort()
    );

    for (const [templateKey, marker] of Object.entries(escalatedMarkerByTemplate)) {
      const occurrences = backgroundOccurrences(templateKey);
      expect(occurrences.length).toBeGreaterThan(0);

      for (const scenario of occurrences) {
        const escalatedSteps = scenario.steps.filter(
          (step) => step.severity === 'high' || step.severity === 'critical'
        );
        expect(escalatedSteps.length).toBeGreaterThan(0);

        for (const backgroundStep of escalatedSteps) {
          // Text proxy on the alert's own observable fields (rule name, message,
          // command line, file/network context), the same shape as the
          // non-actionable check above: the reading has to be in the document
          // the model reads, not only in this file's comments.
          const observables = `${backgroundStep.ruleName} ${backgroundStep.message} ${
            backgroundStep.commandLine ?? ''
          } ${backgroundStep.context ?? ''}`;
          expect(observables.toLowerCase()).toContain(marker);
        }
      }
    }
  });

  it('keeps the two de-campaigned patterns low severity and occurrence-owned', () => {
    // The two patterns flagged as campaign-shaped stay benign the way they were
    // fixed: low severity, and an observable owned by the occurrence itself
    // rather than shared across hosts. Raising either would re-open the finding
    // that fixed them, so the escalation above happens in its own template.
    for (const templateKey of ['bg-dns-telemetry', 'bg-macos-mdm']) {
      const occurrences = backgroundOccurrences(templateKey);
      expect(occurrences.length).toBeGreaterThan(0);

      for (const scenario of occurrences) {
        expect(scenario.steps.length).toBeGreaterThan(0);
        for (const templateStep of scenario.steps) {
          expect(templateStep.severity).toBe('low');
          expect(`${templateStep.context ?? ''}${templateStep.commandLine ?? ''}`).toContain(
            scenario.host
          );
        }
      }
    }
  });

  it('never repeats a background observable across occurrences', () => {
    for (const template of AD2_DENSE_BACKGROUND_TEMPLATES) {
      const occurrences = backgroundOccurrences(template.key);
      expect(occurrences.length).toBeGreaterThan(1);

      const stepCount = occurrences[0].steps.length;
      expect(new Set(occurrences.map((scenario) => scenario.steps.length))).toEqual(
        new Set([stepCount])
      );

      for (let stepIndex = 0; stepIndex < stepCount; stepIndex++) {
        const observables = occurrences.map((scenario) => {
          const occurrenceStep = scenario.steps[stepIndex];
          return `${occurrenceStep.context}|${occurrenceStep.commandLine}`;
        });

        // One indicator repeated on every host — the same DNS zone, the same
        // plist name, the same source address — is campaign-shaped: it
        // correlates into a single actor across a dozen machines, so a model
        // that groups it is reading the fixture correctly and still scores as a
        // false positive against a four-chain reference. Each occurrence has to
        // carry its own.
        expect(new Set(observables).size).toBe(observables.length);
      }
    }
  });

  it('does not leak a scenario key into anything a seeded document returns', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });

    // Non-vacuity: an empty population would satisfy the assertions below.
    expect(dense.alerts).toHaveLength(AD2_DENSE_TARGET_ALERTS);

    // `_id` comes back in the dense ES|QL result and every background key
    // starts with `bg-`, so an identifier — or a label — that spells the key
    // out lets a model discard the noise and regroup the remainder on the
    // shared `<key>-alert-` prefix without reading a content field, which is
    // the measurement this profile exists to make. Whole-document, so a new
    // field carrying the key cannot slip in unnoticed either.
    const serialized = JSON.stringify([...dense.alerts, ...dense.rawEvents]);
    for (const key of dense.scenarioKeys) {
      expect(serialized).not.toContain(key);
    }
  });

  it('resolves alert ids for every key the dense profile lists', () => {
    const denseKeys = listAd2ScenarioKeys('dense');

    expect(denseKeys.length).toBeGreaterThan(AD2_CLEAN_SCENARIO_KEYS.length);

    for (const key of denseKeys) {
      const steps = getAd2Scenario(key, 'dense')?.steps ?? [];
      expect(steps.length).toBeGreaterThan(0);
      // Resolving ids without the profile returns [] for dense-only keys, which
      // silently drops them for any caller that enumerates the profile.
      expect(getAd2ScenarioAlertIds(key, 'dense')).toHaveLength(steps.length);
    }
  });

  it('resolves exactly the ids the seeder writes, for every dense key', () => {
    const dense = buildAd2SeedPlan({ profile: 'dense', baseTime: fixedBaseTime });
    const seededIds = dense.alerts.map((alert) => alert.id);
    const resolvedIds = dense.scenarioKeys.flatMap((key) => [
      ...getAd2ScenarioAlertIds(key, 'dense'),
    ]);

    // Same ids and same count: a digest collision between two keys would show
    // up as a shortfall, and a drifted id shape as a mismatch — either way the
    // reference discoveries would name alerts the population does not hold.
    expect(new Set(seededIds).size).toBe(seededIds.length);
    expect(resolvedIds).toHaveLength(seededIds.length);
    expect(new Set(resolvedIds)).toEqual(new Set(seededIds));
  });

  it('still returns the clean profile by default', () => {
    const plan = buildAd2SeedPlan({ baseTime: fixedBaseTime });
    expect(plan.profile).toBe('clean');
    expect(plan.alerts).toHaveLength(16);
  });
});
