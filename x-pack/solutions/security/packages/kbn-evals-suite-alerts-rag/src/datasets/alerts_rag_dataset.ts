/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsRagExample } from '../dataset';
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
 * Reference answers are phrased to be data-agnostic (they describe the
 * shape of a correct response — prioritisation guidance, host/user listing,
 * recency reasoning) so the LLM-as-judge Factuality / Relevance /
 * Groundedness evaluators score the answer semantically rather than against
 * exact counts or timestamps that depend on the snapshot's contents.
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

export const alertsRagDataset: AlertsRagExample[] = [
  {
    input: 'Which alerts should I look at first?',
    expected: {
      reference:
        'Recommend focusing on critical-severity alerts first, then high-severity. The answer should justify the prioritisation by referencing alert severity and (optionally) entity risk.',
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },
  {
    input: 'Based on my open alerts, what hosts are affected?',
    expected: {
      reference:
        'List the distinct hostnames present in the open alerts (host.name values). The answer should enumerate hosts (e.g. as a bulleted list) and not invent hosts that are not in the data.',
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
  {
    input: 'Which "user.name" is mentioned the most in the open alerts?',
    expected: {
      reference:
        'Identify the user.name that appears most frequently across the open alerts. The answer should name a single user and may optionally include the count.',
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
  {
    input: 'What is the most recent alert?',
    expected: {
      reference:
        'Identify the alert with the latest @timestamp in the open-alerts set. The answer should mention the rule name and host of the most recent alert and may include the timestamp.',
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'temporal_query', dataset_split: ['base'] },
  },
  {
    input: 'Tell me about the most severe open alert.',
    expected: {
      reference:
        "Identify the highest-severity open alert (preferring critical, then high, then medium). The answer should include the alert's rule name, host, and key context (such as user, process, or detected indicator). If no critical or high alerts are present, the answer should say so explicitly rather than fabricate one.",
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'single_alert_query', dataset_split: ['base'] },
  },
  {
    input: 'Are any open alerts targeting the same host or user?',
    expected: {
      reference:
        'Group the open alerts by host.name and by user.name, and surface any host or user that appears in more than one alert. The answer should name the entities with multiple associated alerts and may briefly mention the corresponding rule names. If no overlaps exist, the answer should say so explicitly.',
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },
  {
    input: 'Have any new alerts been triggered in the last hour?',
    expected: {
      reference:
        'Filter the open alerts to those with @timestamp within the last hour and summarise the result. The answer should either enumerate the recent alerts (rule name + host) or explicitly state that no alerts have fired in the last hour, without fabricating timestamps. If the snapshot was restored hours/days ago and contains no truly "last hour" data, the agent should say so rather than misrepresent older alerts as recent.',
      tool_sequence: [SECURITY_ALERTS_TOOL],
    },
    metadata: { category: 'temporal_query', dataset_split: ['base'] },
  },
  {
    input: "What's the lowest-severity alert I currently have open?",
    expected: {
      reference:
        'Identify the open alert with the lowest severity (preferring low, then medium, then high). The answer should name the rule and host of the lowest-severity alert and may include the severity value. If only one severity tier is present (e.g. all critical), the answer should say so explicitly rather than invent a lower-tier alert.',
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
