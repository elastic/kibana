/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsRagExample } from '../dataset';
import {
  ALERTS_RAG_EXPECTED_FACTS,
  allRuleAlertCounts,
  formatAlertCounts,
} from './alerts_rag_expected_facts';
import { ALERTS_RAG_EMPTY_SPACE_ID } from '../ensure_empty_alerts_space';

/**
 * Alerts RAG regression dataset.
 *
 * Each example is a question/reference pair driven through Agent Builder
 * (`/api/agent_builder/converse`). Alerts in the eval cluster come from the
 * shared security-alerts GCS snapshot — the same one the Attack Discovery
 * suite uses — restored before the suite runs by `restoreAlertsSnapshot`.
 * Space-isolation examples instead converse in `alerts-rag-empty`, which has
 * no alerts alias, while default still holds the snapshot.
 *
 * Reference answers carry the expected facts **as measured from that pinned
 * snapshot** ({@link ALERTS_RAG_EXPECTED_FACTS}: 285 open alerts, 255 critical
 * / 30 high, the 16 distinct `host.name` values with their counts, the
 * `user.name` ranking, the newest alert, ...). The correctness evaluator hands
 * the reference to the judge as the `[Ground Truth Response]` and treats it as
 * "the only valid source of information", scoring every claim that is not in it
 * as `NOT_IN_GROUND_TRUTH` (= an inaccuracy, geometrically combined). Guidance
 * prose that only describes the *shape* of a correct answer therefore
 * near-zeros a *correct* data-bearing answer: the agent retrieves the real
 * hosts/users/counts, makes those facts central claims, and every one of them
 * is scored as unverifiable. Summaries of the resulting verdicts across six
 * models and three consecutive weekly builds are in the F2 finding on
 * `bk-01a14b73-security-alerts-rag-regression`.
 *
 * Only the two examples whose expected answer is an absence of data stay
 * data-free: the empty-window example ("new alerts in the last hour", whose
 * true answer is "none — the newest alert in the snapshot is dated
 * 2026-03-26T22:12:18.641Z") and the space-isolation example (whose answer is
 * a zero count in a space with no alerts index). For those the "say so rather
 * than fabricate" wording is the ground truth and is preserved verbatim.
 */
/**
 * The minimum sufficient golden tool sequence the alert-analysis skill should
 * call for any of these "summarise open alerts" questions. All six baseline
 * examples can be answered with a single `security.alerts` ES|QL aggregation;
 * the `tool_sequence` annotations stay deliberately tight so trajectory
 * regressions surface immediately if the agent stops reaching for that tool
 * (e.g. drifts to `platform.alerting.search` or freelances with raw search).
 *
 * Examples that legitimately need a follow-up tool (e.g. drill-into a specific
 * alert ID for related entities, fetch threat intel, check entity risk) should
 * append the follow-up to `tool_sequence` rather than rewrite the first entry.
 */
const SECURITY_ALERTS_TOOL = 'security.alerts';

const facts = ALERTS_RAG_EXPECTED_FACTS;
const { critical, high } = facts.severities;

export const alertsRagDataset: AlertsRagExample[] = [
  {
    input: 'Which alerts should I look at first?',
    expected: {
      reference:
        `The open-alert set holds ${facts.totalOpenAlerts} alerts and they are all at the two highest ` +
        `severity tiers: ${critical.count} critical (risk_score ${critical.riskScore}) and ` +
        `${high.count} high (risk_score ${high.riskScore}) — there are no medium or low open alerts. ` +
        `The queue is not empty and must not be reported as clear: a run-relative window (the last ` +
        `hour, the last 24 hours) contains no alerts because the newest open alert is dated ` +
        `${facts.mostRecentAlert.timestamp}, so any answer that queried only such a window has to ` +
        `widen to the open-alert set and report the ${facts.totalOpenAlerts} open alerts rather ` +
        `than stating there is nothing to prioritise. ` +
        `A correct answer recommends triaging the critical alerts first and the high ones next, and ` +
        `grounds that ranking in the alert data: the rules with the most open alerts are ` +
        `${formatAlertCounts(
          allRuleAlertCounts().slice(0, 5)
        )}; the hosts carrying the most open ` +
        `alerts are ${formatAlertCounts(
          facts.hostAlertCounts.slice(0, 5)
        )}; and the most frequently ` +
        `mentioned user.name is ${formatAlertCounts(facts.userAlertCounts)}. The open-alert set ` +
        `contains ${allRuleAlertCounts().length} distinct rule names and ` +
        `${facts.hostAlertCounts.length} distinct hosts in total. Any severity, rule name, host or ` +
        `user the answer cites must come from that set; the answer must not invent a severity tier ` +
        `(there is no "medium" or "low" open alert) or an entity outside it.`,
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },
  {
    input: 'Based on my open alerts, what hosts are affected?',
    expected: {
      reference:
        `The open alerts carry ${facts.hostAlertCounts.length} distinct host.name values: ` +
        `${formatAlertCounts(facts.hostAlertCounts)}. Every one of the ${
          facts.totalOpenAlerts
        } open ` +
        `alerts has a host.name and the affected-host set is exactly those ` +
        `${facts.hostAlertCounts.length} hosts (alert counts per host in parentheses). The answer ` +
        `should enumerate the hosts — a bulleted list is ideal, with the per-host alert count or ` +
        `severity optional — and must not name a host outside that list or describe the host field ` +
        `generically without listing the hosts that are in the data.`,
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
  {
    input: 'Which "user.name" is mentioned the most in the open alerts?',
    expected: {
      reference:
        `Every one of the ${facts.totalOpenAlerts} open alerts has user.name populated, and there are ` +
        `${facts.userAlertCounts.length} distinct user.name values: ` +
        `${formatAlertCounts(facts.userAlertCounts)}. The most frequently mentioned user.name is ` +
        `${facts.userAlertCounts[0].name}, with ${facts.userAlertCounts[0].count} of the ` +
        `${facts.totalOpenAlerts} open alerts. The answer should name that single user and may ` +
        `include the count and the runner-up counts; it must not name a user outside the three ` +
        `present in the alert set or claim a different user is most frequent.`,
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
  {
    input: 'What is the most recent alert?',
    expected: {
      reference:
        `The most recent open alert has @timestamp ${facts.mostRecentAlert.timestamp}, rule name ` +
        `"${facts.mostRecentAlert.ruleName}", host.name ${facts.mostRecentAlert.hostName}, ` +
        `user.name ${facts.mostRecentAlert.userName}, severity ${facts.mostRecentAlert.severity} ` +
        `(risk_score ${facts.mostRecentAlert.riskScore}) and process.name ` +
        `${facts.mostRecentAlert.processName}. The answer should identify that alert — rule name and ` +
        `host at minimum, with the timestamp, severity or process context also correct — and must ` +
        `not present a different alert as the most recent one.`,
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'temporal_query', dataset_split: ['base'] },
  },
  {
    input: 'Tell me about the most severe open alert.',
    expected: {
      reference:
        `Severity in this open-alert set only takes the values "critical" (${critical.count} alerts) ` +
        `and "high" (${high.count} alerts); every critical alert has risk_score ${critical.riskScore} ` +
        `and every high alert has risk_score ${high.riskScore}, so the most severe open alerts are the ` +
        `${critical.count} critical ones and any critical alert is a valid answer. The critical tier ` +
        `is ${formatAlertCounts(critical.rules)} across hosts ${formatAlertCounts(
          critical.hosts
        )}. ` +
        `Representative critical alerts: ` +
        `${facts.criticalAlertExamples
          .map(
            (example) =>
              `rule "${example.ruleName}" on host ${example.hostName} by user.name ${example.userName} ` +
              `(process ${example.processName}, risk_score ${example.riskScore}, ` +
              `@timestamp ${example.timestamp})`
          )
          .join('; ')}. ` +
        `The answer should name such an alert's rule, ` +
        `host and key context (user, process or detected indicator); it must not claim a severity ` +
        `tier above critical, invent a rule or host outside the critical tier, or describe a ` +
        `high-severity alert as the most severe.`,
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'single_alert_query', dataset_split: ['base'] },
  },
  {
    input: 'Are any open alerts targeting the same host or user?',
    expected: {
      reference:
        `Yes. Every one of the ${facts.totalOpenAlerts} open alerts carries both host.name and ` +
        `user.name, and every entity in the set is involved in more than one alert. By user.name the ` +
        `overlaps are ${formatAlertCounts(facts.userAlertCounts)}. By host.name, all ` +
        `${facts.hostAlertCounts.length} hosts appear in multiple alerts, from ` +
        `${facts.hostAlertCounts[2].name} (${facts.hostAlertCounts[2].count}) down to ` +
        `${facts.hostAlertCounts[facts.hostAlertCounts.length - 1].name} (` +
        `${
          facts.hostAlertCounts[facts.hostAlertCounts.length - 1].count
        }); the full breakdown is ` +
        `${formatAlertCounts(facts.hostAlertCounts)}. The answer should name the overlapping ` +
        `entities with their counts (for example user.name ${facts.userAlertCounts[0].name} in ` +
        `${facts.userAlertCounts[0].count} alerts, or host.name ${facts.hostAlertCounts[0].name} in ` +
        `${facts.hostAlertCounts[0].count} alerts) and may briefly mention the rules behind them; it ` +
        `must not answer that there are no overlaps.`,
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },
  {
    input: 'Have any new alerts been triggered in the last hour?',
    expected: {
      reference:
        `Filter the open alerts to those with @timestamp within the last hour. The snapshot has no ` +
        `such alerts: its newest alert is dated ${facts.mostRecentAlert.timestamp} (rule ` +
        `"${facts.mostRecentAlert.ruleName}", host ${facts.mostRecentAlert.hostName}), so for any run ` +
        `more than an hour after that timestamp the last-hour window is empty. The answer must state ` +
        `that no alerts have been triggered in the last hour (a zero/none result, optionally ` +
        `explaining that the newest alert in the data predates the window) and must not present the ` +
        `older alerts as newly triggered, restate their timestamps as recent, or invent a count of ` +
        `alerts inside the window.`,
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'temporal_query', dataset_split: ['base'] },
  },
  {
    input: "What's the lowest-severity alert I currently have open?",
    expected: {
      reference:
        `The lowest severity tier present in the open-alert set is "high": ${high.count} of the ` +
        `${facts.totalOpenAlerts} open alerts are high and the remaining ${critical.count} are ` +
        `critical — there are no medium or low open alerts. Every high alert has risk_score ` +
        `${high.riskScore}, and they span ${high.rules.length} rules (${formatAlertCounts(
          high.rules
        )}) ` +
        `across ${high.hosts.length} hosts (${formatAlertCounts(
          high.hosts
        )}). A representative one: ` +
        `rule "${facts.lowestSeverityAlertExample.ruleName}" on host ` +
        `${facts.lowestSeverityAlertExample.hostName} by user.name ` +
        `${facts.lowestSeverityAlertExample.userName} (@timestamp ` +
        `${facts.lowestSeverityAlertExample.timestamp}, process ` +
        `${facts.lowestSeverityAlertExample.processName}). The answer must state that the ` +
        `lowest-severity open alerts are the high-severity ones (and may name one of them or the ` +
        `tier count); it must not invent a medium/low alert or present a critical alert as the least ` +
        `severe.`,
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'single_alert_query', dataset_split: ['base'] },
  },
  {
    input: 'How many security alerts do I have in the last 24 hours?',
    expected: {
      reference:
        'Report that there are 0 security alerts in the current Kibana space because that space has no alerts index yet. The answer must state a zero count (or equivalent "no alerts") and must not invent a non-zero total or cite alerts from another space such as default.',
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: {
      category: 'space_isolation',
      dataset_split: ['base'],
      spaceId: ALERTS_RAG_EMPTY_SPACE_ID,
    },
  },
];
