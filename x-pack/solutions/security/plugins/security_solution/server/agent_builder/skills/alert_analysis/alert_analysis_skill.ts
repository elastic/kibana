/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_GET_ENTITY_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
} from '../../tools';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { relatedAlertsInlineToolSchema } from '../../../../common/api/alert_analysis/related_alerts';
import {
  findRelatedAlerts,
  RELATED_ALERTS_INLINE_MAX_RESULTS,
} from '../../../lib/alert_analysis/services/find_related_alerts';

export const alertAnalysisSkill = defineSkillType({
  id: 'alert-analysis',
  name: 'alert-analysis',
  basePath: 'skills/security/alerts',
  description:
    'Count, list, prioritize, and investigate Security detection alerts in the current Kibana space. ' +
    'Use for questions like "how many alerts", "high/critical alerts in last 24h", or triage of a specific alert. ' +
    'List and count questions use only security.alerts. Judgment questions about a named user or host may also ' +
    'check entity risk. Single-alert triage may correlate related alerts, enrich with Security Labs, and assess entity risk.',
  content: `# Alert Analysis Guide

## When to Use This Skill

Use this skill when:
- Counting, listing, prioritizing, or summarizing security alerts in the current space (e.g. "how many alerts in the last 24 hours")
- Triaging a specific security alert to determine if it is a true or false positive
- Investigating alerts to understand their context and impact
- Finding related alerts that share entities (hosts, users, IPs) with a known alert
- Enriching alert data with threat intelligence from Elastic Security Labs
- Assessing entity risk scores for hosts or users involved in alerts

## Choose a Path First

If the user attached alerts, or their details are already in the conversation (one alert or a set), use those and do not fetch them again. Triage or summarize attached alerts on the triage path.

Pick one path before any other tool call:

### Queue path (plain list, count, or summary of many alerts)
- Call only 'security.alerts'. For a plain list, use detail 'summary'. Keep the default detail when the question needs alert content such as command lines.
- Call 'security.alerts' once. Each call runs a query generator and costs far more than the other tools. A count or breakdown by several fields (rule, severity, status, user, host) is one call: ask for all of it in one question, or list rows with detail 'summary' and tally them yourself. Call it again only when the first result is empty or failed, or when you need a different time window.
- Answer from that result, then add one or two sentences on the pattern in the returned alerts (shared rule, host or user, severity trend, timing). Use only what the result shows. Stop.
- Do NOT call 'security.alert-analysis.get-related-alerts', 'security.security_labs_search', or 'security.get_entity' for list, count, or summary questions.
- Do NOT run the triage steps below.
- If the question asks for a judgment (which alert to handle first, is it serious, are they related, is an account compromised), use the next two sections instead of stopping here.

### Judgment questions about the queue (prioritize, serious or urgent, related, risk, compromise)
When the question asks for a judgment, call 'security.alerts' first, then make at most one call to each tool below, and only when the question asks for it. The exception is 'security.get_entity', which takes one entity per call: make one call per entity, for at most two entities:
- 'security.get_entity' for a user or host the question names or asks about (risk, "is it at risk", "rundown of this user"), for at most two entities. If it finds no entity, do not retry
- 'security.alert-analysis.get-related-alerts' only when the question asks whether alerts are related and the alerts carry host or IP values. It compares alert fields only
- 'security.security_labs_search' only when the question asks for threat intelligence or technique context
If 'security.get_entity' is not available, say that entity risk was not checked. Then answer and stop.

### Check the evidence before you answer
An alert shows that a rule matched. It does not show what happened around it, and some alerts (threshold alerts, for example) carry only the grouping field and no host or IP. When the question asks whether something is serious, urgent or "on fire", which alert to handle first, whether alerts are related or share hosts or IPs, what the alerts hide or miss, or whether an account is compromised, do not decide from alert severity, risk score or alert fields alone. After 'security.alerts', use the ES|QL tool if it is available to query the event data behind the alerts, never the alerts index, in one query (for example, whether a successful logon followed the failures, from which source and on which host). An alert's timestamp is when the rule ran, not when the events happened, so the events can be days older. Search the event data over at least the last 30 days (or from 'kibana.alert.original_time' when present), not just the alerts' time window, and filter by the users, hosts or IPs from the alerts. If the query returns no rows, widen the time range once before you answer. If you still find nothing, say that no events were found. Never answer that nothing is wrong from an empty result. For what the alerts miss, query the wider event data for activity the rule cannot see. Make at most three ES|QL calls. If a query fails, fix it once, then answer with what you have. If the ES|QL tool is not available, say that the events were not checked. Say what you checked.

### Triage path (specific alerts, attached or named by id)
- Follow the triage steps below. Skip any step that does not apply. Make at most one call to each tool. The exception is 'security.get_entity', which takes one entity per call: make one call for each involved user or host, for at most two entities.

## Triage Steps (specific alert only)

### 1. Initial Alert Assessment
- If the alert is already attached to the conversation or its details are already in context, use that data and do NOT fetch it again
- Only if the alert is not available, fetch it using 'security.alerts' with a simple query on its alert ID
- Review: severity, timestamp, rule name, description, MITRE ATT&CK technique
- Identify key entities: users (user.name), hosts (host.name), IPs (source.ip, destination.ip), file hashes
- Note the alert's workflow status and any existing assignments

### 2. Find Related Alerts
- Use 'security.alert-analysis.get-related-alerts' to find alerts sharing entities with the investigated alert
- Specify the alert ID and an appropriate time window (default 24h, extend to 168h for slow attacks)
- If you already have entity values (host.name, user.name, source.ip, destination.ip) from a previous tool call, pass them as optional parameters; any missing values are merged from the alert document
- Review the related alerts for patterns: same rule triggering, escalating severity, or multi-stage attack chains

### 3. Search Security Labs
- Query Elastic Security Labs using 'security.security_labs_search' for:
  - Known threat actor TTPs matching the alert's MITRE technique
  - Malware family information if process hashes or names are available
  - IOC context for IPs, domains, or file hashes found in the alert

### 4. Assess Entity Risk
- Use this step on the triage path. Skip it for list, count, or summarize-queue questions
- If 'security.get_entity' is available, use it to look up the involved hosts and users, including their risk scores
- If it is not available, skip this step and state that entity risk was not checked. Do not load another skill or search for another tool to replace it
- High risk scores (>80) on involved entities increase alert priority
- Compare current risk level with historical baseline

### 5. Determine Disposition
- **True Positive** → Escalate: Create a case, attach the alert, recommend containment actions
- **Benign True Positive** → Exception: The alert is technically correct but the activity is known-good (e.g., admin tooling)
- **False Positive** → Tune: The rule needs adjustment to avoid this class of alerts
- **Needs More Data** → Expand investigation: Widen time window, check additional data sources

### 6. Synthesize Findings
- Compile a comprehensive analysis with supporting evidence
- Provide clear threat assessment: severity, confidence level, affected scope
- Recommend specific next steps based on disposition
- Suggest the entity-analytics skill to the user for deeper entity profiling or asset criticality review. Do not load it unless the user asks

## Tool Selection Guardrails
- For list/prioritization/count questions about security alerts (e.g. "how many alerts", "high/critical alerts in last 24h"), use only 'security.alerts' unless explicit correlation by alertId is requested.
- For Security Labs intel questions (e.g. "Lazarus Group techniques"), use only 'security.security_labs_search'.
- For risk score questions (e.g. "risk score for host DC01"), use only 'security.get_entity'. If it is not available, say that risk scores are not available and do not load another skill or search for another tool.
- For a plain list of alerts (the user only wants to see them), call 'security.alerts' with detail 'summary' to list more alerts with their key fields. Keep the default detail when you need to analyze alert content.
- For correlation requests that include an alertId, call 'security.alert-analysis.get-related-alerts' directly.
- Do NOT use platform.core.generate_esql, platform.core.execute_esql, platform.core.search, or workflow tools for alert inventory, count, or related-alert correlation. Those platform tools can cross Kibana spaces; 'security.alerts' stays scoped to the current space. Never query the alerts index ('.alerts-security.alerts-*') with ES|QL. Use platform.core.execute_esql only on event data, as described in 'Check the evidence before you answer'.
`,
  getRegistryTools: () => [
    SECURITY_ALERTS_TOOL_ID,
    SECURITY_LABS_SEARCH_TOOL_ID,
    SECURITY_GET_ENTITY_TOOL_ID,
  ],
  getInlineTools: () => [
    {
      id: 'security.alert-analysis.get-related-alerts',
      type: ToolType.builtin,
      description:
        'Find alerts that share entities (host.name, user.name, source.ip, destination.ip) with a given alert. Returns related alerts within the specified time window. Pass entity values directly when already available; missing values are merged from the alert.',
      schema: relatedAlertsInlineToolSchema,
      handler: async (args, context) => {
        const { alertId, timeWindowHours, hostNames, userNames, sourceIps, destIps } =
          relatedAlertsInlineToolSchema.parse(args);

        const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${context.spaceId}`;

        const result = await findRelatedAlerts(context.esClient.asCurrentUser, {
          alertId,
          alertsIndex,
          timeWindowHours,
          maxResults: RELATED_ALERTS_INLINE_MAX_RESULTS,
          hostNames,
          userNames,
          sourceIps,
          destIps,
        });

        if (!result.ok) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: result.message },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: result.message,
                sourceEntities: result.sourceEntities,
                relatedAlerts: result.relatedAlerts,
              },
            },
          ],
        };
      },
    },
  ],
});
