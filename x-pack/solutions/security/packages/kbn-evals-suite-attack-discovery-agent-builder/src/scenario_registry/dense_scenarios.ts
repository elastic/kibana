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
 * Background chains: plausible, lower severity, and NOT part of the four target
 * chains. Exported because the dense-profile tests assert each emitted chain
 * against its TEMPLATE length — a check drawn from the emitted definition cannot
 * detect truncation, since a builder that trims `steps` shrinks both sides in
 * lockstep.
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
      const steps = template.stepsFor({ occurrence, host });

      // Truncate at a chain boundary rather than emitting a partial chain.
      if (steps.length <= budget) {
        const key = `${template.key}-${occurrence}`;
        out[key] = {
          key,
          title: template.title,
          host,
          os: template.os,
          user: template.user,
          // Spread across the window so they do not all share one timestamp.
          startHoursAgo: 1 + ((templateIndex * 7 + round) % 20),
          raw: false,
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
