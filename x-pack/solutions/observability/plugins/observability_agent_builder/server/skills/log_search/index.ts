/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { OBSERVABILITY_GET_LOGS_TOOL_ID } from '../../tools/get_logs/constants';
import { OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID } from '../../tools/run_log_rate_analysis/tool';
import { OBSERVABILITY_GET_INDEX_INFO_TOOL_ID } from '../../tools/get_index_info/tool';
import { getKqlInstructions } from '../../agent/register_observability_agent';

const LOG_SEARCH_TOOL_IDS = [
  OBSERVABILITY_GET_LOGS_TOOL_ID,
  OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
  OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
];

export const createLogSearchSkill = () =>
  defineSkillType({
    id: 'observability.log-search',
    name: 'log-search',
    basePath: 'skills/observability',
    description:
      'Investigates log data to find root causes of incidents by iteratively searching, filtering, and analyzing logs. Use when the user asks about errors, anomalies, or issues visible in logs, or wants to understand what happened during an incident.',
    content: buildLogSearchSkillContent(),
    getRegistryTools: () => LOG_SEARCH_TOOL_IDS,
  });

function buildLogSearchSkillContent(): string {
  return dedent(`## When to Use This Skill

    Use this skill when:
    - A user asks to investigate errors, anomalies, or incidents visible in log data
    - A user wants to find the root cause of an outage, performance degradation, or failure
    - A user asks "what happened" or "why are there errors" in a service, host, or container
    - A user wants to search, filter, or analyze logs in Elasticsearch
    - You need to correlate log patterns across services to trace cascading failures

    ## Standard Operating Procedure

    You MUST follow this procedure.

    ### Phase 1: Initial Peek
    ALWAYS start here. Call \`get_logs\` with groupBy="log.level".
    If the user mentions a specific service, host, or container, scope the query with a kqlFilter (e.g. \`service.name: "cart-service"\`). Otherwise, use no kqlFilter.
    Read five things:
    - **totalCount**: How many logs match? This is an indicator of noise.
    - **histogram**: Is there a spike or dip? Note the timestamp if so. This is an indicator of a root cause.
    - **samples**: What do the logs look like? Health checks? Real errors? Cron noise?
    - **categories**: How many distinct message patterns exist? Fewer than 20 patterns means the dataset is focused enough to review directly. Check the \`type\` field — categories with type "exception" reveal OTel exception patterns (categorized by error.exception.message) that are separate from regular log messages.
    - **topValues**: Which services, log levels, hosts, namespaces, etc. exist? Use these exact values when building KQL filters — do not guess keyword field values.

    Decision:
    - categories has fewer than 20 patterns → skip to Answer (focused enough to review samples directly)
    - Spike in histogram → note the time, then Phase 2
    - totalCount > 10,000 → Phase 2
    - Otherwise → Phase 3 (moderate volume, start filtering directly)

    NOTE: OTel exception events (e.g. gRPC errors, uncaught exceptions) do NOT have \`log.level\`.
    They appear as "unknown" in the histogram breakdown. If you see a large "unknown" bucket but few or no
    error-level logs, check the categories for entries with type "exception". You can also call \`get_logs\` with
    kqlFilter="error.exception.message: *" and groupBy="service.name" to see which services produced them.

    ### Phase 2: Analyze at Scale
    Only use this phase when the histogram shows a clear spike or dip.

    Call \`run_log_rate_analysis\`:
    - baseline: a normal period BEFORE the spike
    - deviation: the period DURING the spike
    - The result shows which field values (services, error types, hosts) are correlated with the change.

    Use insights from this phase to make informed filters in Phase 3.
    If there is no spike, skip this phase — categories from Phase 1 already provide pattern analysis.

    ### Phase 3: Noise Reduction (The Funnel)
    The dataset is too large to review manually. Call \`get_logs\` repeatedly to narrow it down using two strategies:

    **Strategy A — Exclude noise** (use first): Add NOT clauses to remove obvious noise.
      Iteration 1: \`NOT message: "GET /health" AND NOT message: "heartbeat"\`
      Iteration 2: \`NOT message: "GET /health" AND NOT message: "heartbeat" AND NOT service.name: "fluent-bit"\`
      Keep accumulating NOT clauses — never drop previous ones.

    **Strategy B — Focus on signal** (use once you spot the relevant service/pattern): Switch to a positive filter to zoom in.
      Example: \`service.name: "checkout" AND log.level: "error"\`
      You may replace the entire kqlFilter when zooming into a specific service or pattern.
      IMPORTANT: Use the exact values from topValues — keyword fields like \`log.level\` are case-sensitive.
      If you're unsure of exact field values, use \`get_index_info\` with operation="get-field-values" to discover them.

    Continue until:
    - **categories** shows fewer than 20 distinct patterns (noise is sufficiently reduced), OR
    - **totalCount** < 500, OR
    - **samples** show the root cause

    RULES for this phase:
    - If you see a spike, narrow the time range (start/end) around it to isolate the incident window.
    - Use groupBy (e.g. "log.level" or "service.name") to understand the shape of the data.
    - Check **categories** after each call — when patterns drop below 20, the remaining logs are focused enough to review.
    - You MUST call get_logs at least 3 times before moving on.

    ### Answer
    Provide your findings:
    - **Root cause** (if identified) or **most likely hypothesis**
    - **Key evidence**: specific log lines, timestamps, service names, error messages
    - **Investigation trail**: briefly describe what you filtered and why
    - **Suggested next steps** if the root cause is not fully confirmed

    ## Critical Rules

    1. ALWAYS start with \`get_logs\`. Never call another tool first.
    2. When excluding noise (Strategy A), accumulate NOT clauses. When zooming into a specific service or pattern (Strategy B), you may replace the filter entirely.
    3. Call \`get_logs\` at least 3 times before providing your answer.
    4. If totalCount > 10,000 or categories shows 20+ patterns after filtering, you have too much noise. Keep filtering.
    5. Before each tool call, explain what you see and why you're taking the next action.
    6. If a tool call returns an error, try a different approach. Do not retry the same failing call more than once.
    7. If \`run_log_rate_analysis\` fails or returns no results, continue with \`get_logs\` alone.

    ${getKqlInstructions()}

    ## OTel Exception Events

    OpenTelemetry exception events are structurally different from regular logs:
    - They have \`error.exception.message\` and optionally \`error.exception.type\` — but NO \`log.level\` or \`message\`.
    - They appear as "unknown" in \`log.level\` breakdowns and are invisible to \`log.level\`-based KQL filters.
    - \`get_logs\` automatically categorizes them separately: categories with type "exception" are grouped by \`error.exception.message\`.
    - You can also filter them explicitly: \`error.exception.message: *\` finds all documents with an exception message.
    - Use groupBy="service.name" to see which services produced exceptions.

    ## Tips

    - Use \`get_index_info\` with operation="get-field-values" to discover the actual values of keyword fields.
      For example, \`log.level\` values vary across services (e.g. "INFO", "info", "Information", "Error", "WARN", null).
      Call: \`get_index_info(operation="get-field-values", index="logs-*", fields=["log.level"], start="now-1h", end="now")\`
      You can also scope it to a specific service: add kqlFilter="service.name: \\"checkout\\""
    - This is especially useful when Strategy B filters on \`log.level\` return no results — the values may be different from what you expect.
    - To deep-dive into a specific log document, use \`get_logs\` with kqlFilter="_id: \\"<doc_id>\\"" and pass
      additional field names via the \`fields\` parameter (e.g. fields=["message", "error.stack_trace", "http.response.status_code"]).
      Use \`get_index_info(operation="list-fields")\` first if you don't know which fields are available.
    - To view surrounding context for a suspicious log, note its @timestamp and entity (service.name, host.name, or container.name)
      from the sample, then call \`get_logs\` with a tight time window (e.g. ±30s around the timestamp), scoped to that
      entity via kqlFilter, with limit=50. This shows what happened immediately before and after the event — the same "surrounding
      documents" view that Discover provides.

    ## Example Investigation

    User: "Why are there errors in the checkout service?"

    **Phase 1**: get_logs(start="now-1h", end="now", groupBy="log.level")
    → totalCount: 42,000. Categories: 28 patterns (too many — noisy). topValues shows service.name: ["checkout", "payment", "load-balancer", ...], log.level: ["info", "error", "warn"]. Histogram shows spike at 14:05-14:10. Samples dominated by "GET /health" and fluent-bit noise.

    **Phase 2**: run_log_rate_analysis(start="2026-02-25T13:50:00Z", end="2026-02-25T14:15:00Z")
    → Significant items: service.name="checkout" (p=0.001), error.message="OOMKilled" (p=0.003). Checkout is correlated with the spike.

    **Phase 3**: get_logs(kqlFilter="service.name: \\"checkout\\"", start="2026-02-25T14:00:00Z", end="2026-02-25T14:15:00Z", groupBy="log.level")
    → totalCount: 320. Categories: 12 patterns (focused). Histogram shows errors concentrated at 14:07. Samples show OOMKilled events.

    **Phase 3**: get_logs(kqlFilter="service.name: (checkout OR payment) AND log.level: (error OR warn)", start="2026-02-25T14:05:00Z", end="2026-02-25T14:10:00Z", bucketSize="1m")
    → totalCount: 89. Categories: 5 patterns. OOMKilled in checkout at 14:07, followed by connection timeouts in payment-service.
    (Note: "error" and "warn" are the exact values from topValues in Phase 1.)

    **Answer**: Checkout service OOMKilled at 14:07, causing cascading timeouts in payment-service.

    ## Example Investigation (OTel Exceptions)

    User: "Something is wrong with our microservices"

    **Phase 1**: get_logs(start="now-30m", end="now", groupBy="log.level")
    → totalCount: 15,000. Histogram breakdown: info=12,000, unknown=2,800, warn=200. No clear spike. The large "unknown" bucket is suspicious. Categories include 3 entries with type "exception": "rpc error: code = Unavailable" (55), "Error: request failed" (120), "timeout exceeded" (5).

    **Phase 3**: get_logs(kqlFilter="error.exception.message: * AND service.name: \\"checkout\\"", start="now-30m", end="now")
    → totalCount: 55. All samples show gRPC "Unavailable" errors calling the payment service.

    **Phase 3**: get_logs(kqlFilter="error.exception.message: * AND service.name: \\"frontend\\"", start="now-30m", end="now")
    → totalCount: 120. Frontend errors: "Error: request to checkout failed", cascading from checkout failures.

    **Answer**: Payment service is unreachable, causing gRPC "Unavailable" errors in checkout (55 exceptions) which cascade as HTTP 500s to the frontend (120 exceptions).
  `);
}
