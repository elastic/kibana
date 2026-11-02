/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_CLEAN_SCENARIOS } from './clean_scenarios';
import type { Ad2ScenarioDefinition, Ad2ScenarioOs, Ad2ScenarioStep } from './types';

/**
 * Dense profile: a realistic-volume alert population.
 *
 * The four `clean` chains stay verbatim, so a dense run is a superset of a
 * clean run and the two remain comparable. On top of them this profile adds
 * background chains across many hosts, which is what turns "correlate 4 alerts"
 * into "pick the real chains out of a crowded index".
 *
 * Every alert here is synthetic and committed. That is the point: the volume is
 * reproducible by anyone checking out this commit, unlike a live alert index
 * whose contents depend on the day it was read.
 */

const step = (
  ruleName: string,
  severity: Ad2ScenarioStep['severity'],
  riskScore: number,
  message: string,
  processName: string | null,
  commandLine: string | null,
  eventType: Ad2ScenarioStep['eventType'],
  context: string | null
): Ad2ScenarioStep => ({
  ruleName,
  severity,
  riskScore,
  message,
  processName,
  commandLine,
  eventType,
  context,
});

/** One expansion of a background template. */
interface BackgroundOccurrence {
  /** 1-based: the Nth time this template is expanded. */
  readonly occurrence: number;
  readonly host: string;
}

interface BackgroundTemplate {
  readonly key: string;
  readonly title: string;
  /** The FIRST occurrence's host; later ones increment its trailing number. */
  readonly host: string;
  readonly os: Ad2ScenarioOs;
  readonly user: string;
  /**
   * Whether this occurrence's raw process/network/file events are indexed
   * alongside its alert. Defaults to `false` (matching every OTHER background
   * template): `buildAlertDocument` always writes an ancestor event id into
   * `kibana.alert.ancestors`, but `buildScenarioDocuments` only backs it with
   * a real document when the owning scenario's `raw` is true. Every clean
   * reference chain has `raw: true`, so leaving every background occurrence
   * `raw: false` makes every target ancestor id resolve and every background
   * one dangle — an agent with ES|QL access can then tell target from noise by
   * source-event existence alone rather than reading the alert. At least one
   * template has to break that by setting this true, with a genuinely benign
   * backing event (not a bare flag flip): see `bg-endpoint-inventory` below.
   */
  readonly raw?: boolean;
  /**
   * Builds one occurrence's chain from that occurrence's own coordinates.
   *
   * The observables have to be occurrence-local. Repeating one indicator across
   * every occurrence — the same DNS zone, the same plist name, the same source
   * address — is campaign-shaped: the aggregate reads as a single actor across
   * many hosts, so a model that correlates it is reading the fixture correctly
   * and still scores as a false positive, because the dense ground truth is the
   * four clean chains alone. Chain LENGTH is occurrence-independent, which the
   * dense-profile tests pin.
   */
  readonly stepsFor: (occurrence: BackgroundOccurrence) => readonly Ad2ScenarioStep[];
}

/**
 * `wks-sales-22` -> `wks-sales-23`, `mbp-design-08` -> `mbp-design-09`, ...
 *
 * Each occurrence gets its own plausible host rather than a `-r2` suffix, which
 * would announce to anyone reading the index that the chain is a repeat of an
 * earlier one.
 */
const occurrenceHost = (base: string, occurrence: number): string => {
  const match = /^(.*?)(\d+)$/.exec(base);
  if (!match) {
    return `${base}-${occurrence}`;
  }
  const [, prefix, digits] = match;
  return `${prefix}${String(Number(digits) + occurrence - 1).padStart(digits.length, '0')}`;
};

/**
 * `alice.chen` -> `alice.chen-2`, ... — each occurrence's OWN user, the same
 * reason `occurrenceHost` is occurrence-local.
 *
 * Every clean/reference user appears on exactly one host. Copying one fixed
 * `template.user` literal into every occurrence instead put every background
 * template's user on N hosts while every target's stayed on 1 — a host/user
 * cardinality predicate (group by user, drop any user seen on >1 host) then
 * recovered the four references without reading a single alert field. The
 * first occurrence keeps the template's literal user unchanged, so no
 * existing snapshot or fixture reference shifts.
 */
const occurrenceUser = (base: string, occurrence: number): string =>
  occurrence === 1 ? base : `${base}-${occurrence}`;

/**
 * `Diagnostic Archive Written to Disk` -> `...-2`, ... — each occurrence's OWN
 * rule name, the same reason `occurrenceHost` and `occurrenceUser` are
 * occurrence-local.
 *
 * Rule-name FREQUENCY was the last field that separated the sides: every clean
 * rule name appeared exactly once (one chain each) while every background rule
 * name appeared 6-7 times (one per expanded occurrence), so `kibana.alert.rule.name`
 * could be solved by "keep the names with a population count of one" — or,
 * inverted, "drop every name seen more than once" — recovering the four
 * references without reading an alert field. Suffixing each occurrence's names
 * puts every rule name on exactly one host, so no frequency predicate can
 * separate the sides. Occurrence 1 keeps the template's literal name, so no
 * existing fixture reference shifts.
 */
const occurrenceRuleName = (base: string, occurrence: number): string =>
  occurrence === 1 ? base : `${base}-${occurrence}`;

/**
 * `inventory-agent` -> `inventory-agent-2`, ... — each occurrence's OWN process
 * name, the same reason `occurrenceHost`, `occurrenceUser` and
 * `occurrenceRuleName` are occurrence-local.
 *
 * Process-name FREQUENCY was the last field separating the sides after the
 * rule-name fix: measured on the emitted dense plan, every clean process name
 * appeared at most 4 times (one chain each; `powershell.exe` 4x, the rest 1-2x)
 * while every background name appeared at least 6 times (`svchost.exe` 12x,
 * `inventory-agent` 24x). `process.name` is exposed on the alert, so
 * `GROUP BY process.name | WHERE COUNT(*) <= 5` recovered all 16 reference
 * alerts and no background alert — the same answer key the rule-name fix
 * removed, one field over. Suffixing each occurrence's names drops every
 * background name to its own chain's step count (1-4, `inventory-agent` 4x
 * within one occurrence), which OVERLAPS the clean side's 1-4 range on both
 * ends, so no frequency threshold can separate the sides. Occurrence 1 keeps
 * the template's literal name, so no existing fixture reference shifts.
 */
const occurrenceProcessName = (base: string | null, occurrence: number): string | null =>
  base == null || occurrence === 1 ? base : `${base}-${occurrence}`;

/**
 * Background chains: plausible, non-actionable, and NOT part of the four target
 * chains. Severity and risk score do not separate them from those chains either
 * — see `bg-vendor-update` below — so the population cannot be solved by
 * filtering on a field of the alert rather than reading it.
 *
 * Exported because the dense-profile tests assert each emitted chain against its
 * TEMPLATE length — a check drawn from the emitted definition cannot detect
 * truncation, since a builder that trims `steps` shrinks both sides in lockstep.
 */
export const AD2_DENSE_BACKGROUND_TEMPLATES: readonly BackgroundTemplate[] = [
  {
    key: 'bg-rdp-bruteforce',
    title: 'Repeated RDP authentication failures',
    host: 'srv-rdp-11',
    os: 'windows',
    user: 'svc.rdp',
    stepsFor: ({ host, occurrence }) => {
      // One source address per occurrence, from the documentation range: one
      // address failing against a dozen servers is a campaign, a dozen
      // unrelated addresses each failing against one server is a Tuesday.
      const source = `198.51.100.${10 + occurrence}`;
      return [
        step(
          'Multiple Failed Logon Attempts',
          'medium',
          47,
          `Twelve failed RDP logons to ${host} from a single source in five minutes`,
          'svchost.exe',
          null,
          'network',
          source
        ),
        // The failure burst is CONTAINED by a control, not escalated into a
        // successful logon. A `Successful Logon After Repeated Failures` step
        // here reads as a brute-force compromise chain, and the dense ground
        // truth holds only the four clean chains — so the Rubric, which scores
        // alertId overlap with that reference, would penalize a model for
        // correctly surfacing it. Background activity has to be non-actionable
        // for "precision against noise" to mean anything.
        step(
          'Account Lockout Policy Triggered',
          'low',
          21,
          `The source address was locked out by policy after the failure burst on ${host}`,
          'svchost.exe',
          null,
          'network',
          source
        ),
      ];
    },
  },
  {
    key: 'bg-admin-share',
    title: 'Administrative share enumeration',
    host: 'srv-files-02',
    os: 'windows',
    user: 'helpdesk.tom',
    stepsFor: ({ host }) => [
      step(
        'Administrative Share Enumeration',
        'low',
        33,
        `Helpdesk tooling listed the shares published by ${host}`,
        'net.exe',
        `net view \\\\${host}`,
        'process',
        `net view \\\\${host}`
      ),
    ],
  },
  {
    key: 'bg-proc-tooling',
    title: 'Diagnostic archive staged but not executed',
    host: 'wks-dev-15',
    os: 'windows',
    user: 'dev.priya',
    stepsFor: ({ host }) => [
      step(
        'Diagnostic Archive Written to Disk',
        'low',
        24,
        `A support bundle was written on ${host} for an open vendor case`,
        'explorer.exe',
        null,
        'file',
        `C:\\ProgramData\\support\\${host}-diagnostic.zip`
      ),
    ],
  },
  {
    key: 'bg-linux-cron',
    title: 'Unscheduled cron modification',
    host: 'web-stage-03',
    os: 'linux',
    user: 'deploy',
    stepsFor: ({ host }) => [
      step(
        'Cron Entry Modified Outside Change Window',
        'low',
        26,
        `The deploy user added a recurring entry for the ${host} sync job`,
        'crontab',
        `crontab -l | { cat; echo "*/5 * * * * /opt/${host}/sync.sh"; } | crontab -`,
        'file',
        `/opt/${host}/sync.sh`
      ),
    ],
  },
  {
    key: 'bg-dns-telemetry',
    title: 'Per-device telemetry DNS lookups',
    host: 'wks-sales-22',
    os: 'windows',
    user: 'sales.mo',
    stepsFor: ({ host }) => [
      // Each device resolves its OWN telemetry endpoint. The previous version
      // pointed every occurrence at one zone (`a7f3k2.metrics.example-cdn.net`)
      // with a high-entropy name, which is sustained tunnelling to a single
      // zone across a dozen hosts — a legitimate campaign-level discovery that
      // the reference does not contain.
      step(
        'DNS Query to Newly Observed Domain',
        'low',
        18,
        `${host} resolved its own telemetry endpoint, an expected analytics lookup`,
        'chrome.exe',
        null,
        'network',
        `${host}.metrics.example.net`
      ),
    ],
  },
  {
    key: 'bg-macos-mdm',
    title: 'Signed vendor agent LaunchAgent plist',
    host: 'mbp-design-08',
    os: 'macos',
    user: 'design.ana',
    stepsFor: ({ host }) => [
      // A signed, vendor-owned agent writing a device-scoped plist, instead of
      // the same unsigned `com.example.updater.plist` on every machine, which
      // reads as one persistence campaign across a dozen Macs.
      step(
        'LaunchAgent Plist Written',
        'low',
        22,
        `A signed vendor agent wrote the device-scoped LaunchAgent plist on ${host}`,
        'Installer',
        'installer -pkg /Library/Application Support/contoso-mdm/agent.pkg -target /',
        'file',
        `~/Library/LaunchAgents/com.contoso.mdm.${host}.plist`
      ),
    ],
  },
  {
    key: 'bg-endpoint-inventory',
    title: 'Scheduled endpoint inventory sweep',
    host: 'wks-ops-40',
    os: 'linux',
    user: 'svc.inventory',
    // This chain jointly overlaps the target on every dimension the OTHER
    // background chains overlap it on separately: 4 steps (`bg-vendor-update`
    // stays at 2), raw-backed (every other background is `raw: false`), AND a
    // high-severity step (the only other high/critical background,
    // `bg-vendor-update`, is 2 steps with no raw backing). Splitting these
    // across disjoint chains left "group by host, keep 4-step AND raw AND
    // high/critical" as a working joint answer key even after no single
    // dimension worked alone — this chain removes that gap by being the
    // counterexample to all three predicates at once, the same way
    // `bg-vendor-update` alone is the counterexample to severity alone.
    //
    // It is also the only 4-step background chain, which makes it the only
    // background host with 4 alerts — and that host cardinality is itself an
    // observable (`GROUP BY host | WHERE COUNT(*) = 4`). Every host-aggregate
    // predicate the reference cohort satisfies therefore has to be satisfied
    // here too, or the conjunction isolates the four references without reading
    // an alert's content.
    //
    // The invariant is NOT "match the reference on the reported fields" — it is
    // that this occurrence's host-level aggregates must not sit entirely to one
    // side of the reference band, because a background profile that is CONSTANT
    // across occurrences is a single point, and any point outside the band is
    // separable by a threshold (`MIN(risk_score) <= T`, `SUM(LENGTH(message)) <= T`,
    // ...). Measured on the emitted plan, the four references span per host:
    // min risk 72-75, max risk 91-96, sum risk 324-337, min message length
    // 39-48, max 60-67, sum 205-222, 7 raw documents, no null command lines,
    // 1-2 file paths, one critical step. Earlier revisions of this chain had a
    // background minimum of 76 against a reference maximum of 75, which turned
    // `MIN(risk_score) <= 75` into a perfect key — the same leak the severity
    // predicate was, one aggregate up. So every value below is chosen to land
    // INSIDE those ranges, not merely near them, and `dense_scenarios.test.ts`
    // pins the no-separating-threshold property over the whole 4-alert cohort
    // so a future edit to any of these numbers is caught.
    //
    // The benign reading stays in every escalated step's own fields (`signed`),
    // per the rule `bg-vendor-update` documents below.
    raw: true,
    stepsFor: ({ host }) => {
      const catalogPath = `/var/lib/inventory-agent/${host}-catalog.json`;
      const reportPath = `/var/lib/inventory-agent/${host}-report.json`;
      return [
        step(
          'Inventory Agent Started With Elevated Privileges',
          'high',
          74,
          `Signed inventory agent swept ${host}`,
          'inventory-agent',
          `inventory-agent --sweep ${host}`,
          'process',
          null
        ),
        step(
          'Software Catalog Enumerated With Elevated Privileges',
          'high',
          79,
          `Signed inventory agent read the catalog on ${host}`,
          'inventory-agent',
          `inventory-agent --catalog ${catalogPath} --elevated`,
          'file',
          catalogPath
        ),
        step(
          'Inventory Report Uploaded to Fleet Server',
          'high',
          84,
          `Signed inventory agent uploaded its full report for ${host}`,
          'inventory-agent',
          `inventory-agent --upload ${host}-catalog.json`,
          'network',
          `fleet.internal.example.net/report/${host}`
        ),
        step(
          'Privileged Inventory Agent Terminated',
          'critical',
          92,
          `Privileged signed inventory agent exited cleanly on ${host}`,
          'inventory-agent',
          `inventory-agent --report ${reportPath}`,
          'file',
          reportPath
        ),
      ];
    },
  },
  {
    key: 'bg-vendor-update',
    title: 'Signed vendor agent update installed by the management agent',
    host: 'wks-finance-31',
    os: 'windows',
    user: 'finance.lee',
    stepsFor: ({ host }) => {
      // One of two background chains carrying a high/critical step (the other
      // is `bg-endpoint-inventory` above), so no severity predicate drops the
      // noise while keeping the targets.
      //
      // Escalating severity is only fair because the benign reading is in the
      // occurrence's OWN fields — `management agent` and `vendor-signed` in the
      // message, the package under the management agent's own update directory,
      // device-scoped by host — the same pattern `bg-macos-mdm` uses at low
      // severity. A high/critical background step WITHOUT such a reading is a
      // recall target the reference does not contain, so a model that reads it
      // correctly still scores as a false positive; that is why the severity is
      // raised only here and only with these observables.
      //
      // The risk scores are the RULE's own score, not a verdict on this
      // occurrence: a rule that fires on driver package installation is scored
      // at the top of the range whether or not the package is signed. That is
      // exactly why the field cannot discriminate, so this chain reaches the
      // top of the target band (96) rather than sitting below it — a background
      // maximum under the target minimum leaves `risk_score >= T` as a working
      // answer key for some T.
      const driverPackage = `C:\\ProgramData\\contoso-mdm\\updates\\${host}-driver.msi`;
      return [
        step(
          'Suspicious Driver Package Installation',
          'critical',
          96,
          `The management agent installed a vendor-signed driver update on ${host}`,
          'msiexec.exe',
          `msiexec.exe /i ${driverPackage} /qn`,
          'file',
          driverPackage
        ),
        step(
          'Suspicious Process Started by Installer',
          'high',
          79,
          `The vendor-signed installer started the managed agent service on ${host} to finish the update`,
          'contoso-agent.exe',
          `contoso-agent.exe --apply-update --device ${host}`,
          'process',
          null
        ),
      ];
    },
  },
];

/**
 * Target alert count for the dense profile.
 *
 * 95 is not arbitrary: it is the alert volume the EIS Attack Discovery trial
 * ran against, so a dense board is magnitude-comparable to that report. The
 * inputs are NOT the same alerts -- those came from a live index on one day and
 * were never captured -- so this profile reproduces the SCALE, not the data.
 * Any comparison must say so.
 */
export const AD2_DENSE_TARGET_ALERTS = 95;

/**
 * Expand background templates until the profile hits exactly
 * AD2_DENSE_TARGET_ALERTS, counting the clean chains that are already included.
 *
 * Each expansion targets a distinct host so alerts do not collapse onto one
 * entity and correlate trivially. A partial round is truncated at a template
 * boundary, never mid-chain: half a chain would be an incoherent alert set.
 */
const buildBackgroundScenarios = (): Record<string, Ad2ScenarioDefinition> => {
  const out: Record<string, Ad2ScenarioDefinition> = {};
  const cleanAlertCount = Object.values(AD2_CLEAN_SCENARIOS).reduce(
    (sum, scenario) => sum + scenario.steps.length,
    0
  );

  let budget = AD2_DENSE_TARGET_ALERTS - cleanAlertCount;
  let round = 0;

  while (budget > 0) {
    let placedThisRound = false;

    for (
      let templateIndex = 0;
      templateIndex < AD2_DENSE_BACKGROUND_TEMPLATES.length;
      templateIndex++
    ) {
      const template = AD2_DENSE_BACKGROUND_TEMPLATES[templateIndex];
      const occurrence = round + 1;
      const host = occurrenceHost(template.host, occurrence);
      const steps = template.stepsFor({ occurrence, host }).map((templateStep) => ({
        ...templateStep,
        ruleName: occurrenceRuleName(templateStep.ruleName, occurrence),
        processName: occurrenceProcessName(templateStep.processName, occurrence),
      }));

      // Truncate at a chain boundary rather than emitting a partial chain.
      if (steps.length <= budget) {
        const key = `${template.key}-${occurrence}`;
        out[key] = {
          key,
          title: template.title,
          host,
          os: template.os,
          user: occurrenceUser(template.user, occurrence),
          // Spread across the window so they do not all share one timestamp.
          startHoursAgo: 1 + ((templateIndex * 7 + round) % 20),
          raw: template.raw ?? false,
          steps,
        };

        budget -= steps.length;
        placedThisRound = true;
      }

      if (budget === 0) {
        break;
      }
    }

    if (!placedThisRound) {
      // No remaining template is small enough to fit the residual budget.
      break;
    }

    round++;
  }

  return out;
};

export const AD2_DENSE_SCENARIOS: Record<string, Ad2ScenarioDefinition> = {
  ...AD2_CLEAN_SCENARIOS,
  ...buildBackgroundScenarios(),
};

export const AD2_DENSE_SCENARIO_KEYS = Object.keys(AD2_DENSE_SCENARIOS);
