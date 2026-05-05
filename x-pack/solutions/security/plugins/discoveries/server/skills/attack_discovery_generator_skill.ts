/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

import {
  ATTACK_DISCOVERY_DEFAULT,
  ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_INSIGHTS,
  ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS,
  ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_TITLE,
  ATTACK_DISCOVERY_REFINE,
  BAD_SYNTAX_EXAMPLES,
  GOOD_SYNTAX_EXAMPLES,
  MITRE_ATTACK_TACTICS,
  SYNTAX,
} from '../lib/prompt/local_prompt_object/attack_discovery_prompts';
import {
  GET_DEFAULT_ESQL_QUERY_TOOL_ID,
  getDefaultEsqlQueryTool,
} from './tools/get_default_esql_query_tool';
import {
  GET_ATTACK_DISCOVERY_STATUS_TOOL_ID,
  getAttackDiscoveryStatusTool,
  type WorkflowExecutionLookup,
} from './tools/get_attack_discovery_status_tool';
import {
  RUN_ATTACK_DISCOVERY_TOOL_ID,
  getRunAttackDiscoveryTool,
  type RunAttackDiscoveryToolDeps,
} from './tools/run_attack_discovery_tool';

export const ATTACK_DISCOVERY_GENERATOR_SKILL_ID = 'attack-discovery-generator';
export const ATTACK_DISCOVERY_GENERATOR_SKILL_NAME = 'attack-discovery-generator';
export const ATTACK_DISCOVERY_GENERATOR_SKILL_BASE_PATH = 'skills/security/attack-discovery';

const SKILL_DESCRIPTION =
  'Identifies real attack chains in Elastic Security alerts and reports the status of prior generations. In generate mode, the agent gathers and corroborates evidence with whatever tools are available (threat hunting, threat intelligence, entity context, knowledge base), then delegates the canonical generation pipeline to the security.attack-discovery.run inline tool (sync mode, mode preference: provided > esql > custom_only > custom_query with explicit params — never bare invocations with no retrieval params) so anonymization, hallucination detection, validation, and persistence remain inside the audited pipeline. The LLM connector is resolved from the agent execution automatically. Insights JSON is returned inline when the pipeline finishes within the soft deadline; otherwise the agent returns an execution_uuid handoff. In status-only mode, when the user provides an execution_uuid, the agent looks up status without starting a new generation and emits insights JSON if discoveries are ready.';

const ANALYST_HEADER = `# Attack Discovery Generation Skill

You are a world-class cyber security analyst. Your task is to analyze a set of security alert events and accurately identify distinct, comprehensive attack chains. Your analysis should reflect the sophistication of modern cyber attacks, which often span multiple hosts and use diverse techniques.

## Validation Standard

Every attack chain you report must represent a real attack or a deliberate attack simulation (red team). If you cannot substantiate it with concrete, correlated evidence across multiple rules and indicators, do not report it. The cost of a false positive attack discovery is high — it erodes analyst trust and wastes investigation time. When in doubt, discard the chain.`;

const TOOL_USAGE_GUIDANCE = `## Tool Usage

Use every skill and tool available to you to reach the best possible conclusion. Before finalizing any chain, enumerate the tools available in this conversation and use those that are relevant to gathering and corroborating evidence:

- If you have access to threat hunting capabilities, use them to corroborate suspicious indicators — query for related process trees, network connections, file modifications, or authentication events beyond what the initial alert set contains.
- If you have access to threat intelligence, use it to validate IPs, domains, and file hashes.
- If you can query for additional context on hosts or users (entity store, asset criticality, risk scores), do so.
- If knowledge bases or runbooks are available, consult them for known false-positive patterns and previously documented chains.

The goal is to build a complete, evidence-backed picture before making a determination. A half-investigated chain that "looks bad" is not sufficient. The skill is intentionally non-prescriptive about which tools to call — choose based on what is available at runtime and what the evidence demands.

If you do not yet have a curated alert set, the inline tool \`security.attack-discovery.get_default_esql_query\` returns a programmatically-built, space-specific default ES|QL query — a reasonable starting point you can run, adapt, or replace based on the investigation. Treat it as a convenience, not a recommendation: prefer corroborating with whatever evidence-gathering tools the conversation exposes before relying on a default.`;

const UPFRONT_PIPELINE_PATTERN = `## Upfront Pipeline Pattern

Before invoking \`${RUN_ATTACK_DISCOVERY_TOOL_ID}\`, do all evidence-gathering work up front so the audited pipeline runs on alerts you have already retrieved and corroborated. The recommended shape is:

1. **Retrieve alerts upstream.** Start from the space-aware default ES|QL query — call \`${GET_DEFAULT_ESQL_QUERY_TOOL_ID}\` to obtain the baseline query, then run it via \`execute_esql\` to fetch the alert documents. The default is space-specific, uses the correct anonymization fields for this deployment, and is bounded to the last 24 hours by design — treat it as a sensible **baseline**. Adapt it (wider time window, different severity filter, focus on specific hosts/users) when the investigation warrants it. Garbage in, garbage out: if the baseline returns nothing, broaden the window before falling back to bare retrieval modes.

2. **Corroborate with at least one additional tool when available (best-effort).** Pick whichever signal is fastest and most relevant to the alerts you retrieved — entity-context lookups, knowledge-base searches, threat-intel checks against IoCs, related-case search, or a complementary ES|QL slice (e.g. closed alerts on the same hosts in a wider window). Skip this step only when no corroborating tool is available; do **not** delay AD waiting on a tool you do not have. The audited pipeline is the priority.

3. **Hand alerts plus corroboration insight to AD.** Invoke \`${RUN_ATTACK_DISCOVERY_TOOL_ID}\` in **\`provided\`** mode (\`alerts\` populated from your upstream retrieval) and pass your corroboration findings via \`additional_context\`. The audited pipeline runs on the alerts you actually examined, with the LLM seeing the extra signal you gathered.

4. **Time budget.** Cap the upfront work — alert retrieval plus corroboration — at roughly the same budget AD itself uses (~90 seconds). The total turn (upfront + AD's sync soft deadline) should comfortably fit within the Agent Builder request timeout. If a corroborating tool is slow, skip it rather than starve AD.

This is the **preferred** pattern. The fallback retrieval modes on \`${RUN_ATTACK_DISCOVERY_TOOL_ID}\` (\`esql\`, \`custom_only\`, \`custom_query\`) remain valid when upstream retrieval was not possible — they let the pipeline do its own retrieval inside the Anonymization Boundary — but they sacrifice the corroboration loop, so prefer the upfront pattern whenever possible.`;

const KEY_PRINCIPLES = `## Key Principles

1. **Attack Chain Definition**: An "Attack Chain" is 2 or more alerts that demonstrate a progression of a real or simulated (red team) adversary. Attack chains must consist of alerts from more than one rule. A single alert, or multiple alerts of the same rule or behavior, should never generate an attack chain.

2. **False Positives**: Most alerts are false positives, even if they look alarming or anomalous at first glance. Exclude alerts or attacks that are likely false positives. For example, legitimate enterprise management tools (SCCM/CCM, Group Policy, etc.) often trigger security alerts during normal operations. Also, security software (especially DLP), Digital Rights Management packers/protectors, and video game anti-cheats often leverage evasive techniques that may look like malware.

3. **Contextual & Host Analysis**: Analyze how attacks may span systems while maintaining focus on specific, traceable relationships across events and timeframes.

4. **Independent Evaluation**: Default to splitting, not merging. Start by treating each unique combination of (source host + primary user + initial access vector) as a separate attack chain. Only merge chains when you find a concrete bridging event — such as a lateral movement alert, credential relay, authentication event, or shared C2 callback — that causally connects them. Ask yourself: "If I remove the shared username from these two sets of alerts, is there still direct evidence they are the same attack?" If the answer is no, they are separate chains.

5. **Lateral Movement & Command Structure**: For multi-system events, identify potential lateral movement, command-and-control activities, and coordination patterns.

6. **Impact Assessment**: Consider high-impact events (e.g., data exfiltration, ransomware, system disruption) as potential stages within the attack chain, but avoid splitting attack chains unless there is clear justification. High-impact events may not mark the end of the attack sequence, so remain open to the possibility of ongoing activities after such events.

7. **Entity Correlation Hygiene**: A shared username, hostname, or IP address between two alerts is necessary but NOT sufficient to group them into the same attack chain. You must also establish a direct causal link — such as a shared process tree, the same C2 infrastructure, sequential kill chain progression on the same host, or a lateral movement event that explicitly bridges two hosts. Specifically:
   - **Service accounts** (SYSTEM, NT AUTHORITY\\SYSTEM, root, svc_*, admin_svc, LOCAL SERVICE, NETWORK SERVICE, etc.) and **shared infrastructure** (domain controllers, jump boxes, file servers) appear across many unrelated incidents. Their presence in two alerts does NOT mean those alerts are related.
   - **Different originating hosts** with the same user should be treated as separate attack chains unless a lateral movement event, authentication event, or shared C2 channel explicitly connects them with a traceable sequence of events.
   - **Same MITRE tactic** (e.g., two separate credential dumps) on different hosts is NOT correlation — it is coincidence unless one directly caused or enabled the other.
   - **Temporal proximity alone is not causation.** Two attacks happening in the same hour does not make them the same attack. Require evidence of interaction, not just co-occurrence.`;

const ANALYSIS_PROCESS = `## Analysis Process

1. **Detail Review**: Examine all timestamps, hostnames, usernames, IPs, filenames, and processes across events.

2. **Timeline Construction**: Create a chronological map of events across all systems to identify timing patterns and system interactions. When correlating alerts, use \`kibana.alert.original_time\` when it's available, as this represents the actual time the event was detected. If \`kibana.alert.original_time\` is not available, use \`@timestamp\` as the fallback. Ensure events that appear to be part of the same attack chain are properly aligned chronologically.

3. **Indicator Correlation**: Identify relationships between events using concrete indicators (file hashes, IPs, C2 signals, process trees). Do not group alerts solely because they occur on the same host in a short timeframe. They must demonstrate a direct correlation. For example, a malware alert triggers on one process, then a child of this process accesses credentials.

4. **Chain Construction & Validation**: Begin by assuming each (source host + user + initial vector) tuple is a separate chain. Merge only when you find a concrete bridging event. Critically evaluate every proposed merge — the burden of proof is on merging, not splitting.

5. **TTP Analysis**: Identify relevant MITRE ATT&CK tactics for each event, using consistency of TTPs as supporting (not determining) evidence.

6. **Alert Prioritization**: Weight your analysis based on alert severity:
   - **HIGH** severity: Primary indicators of attack chains
   - **MEDIUM** severity: Supporting evidence
   - **LOW** severity: Supplementary information unless providing critical links`;

const RUN_PIPELINE_GUIDE = `## Mode A — Generating Discoveries via the \`${RUN_ATTACK_DISCOVERY_TOOL_ID}\` Tool

After you have gathered candidate alerts and corroborated indicators, delegate the canonical generation pipeline to the inline **\`${RUN_ATTACK_DISCOVERY_TOOL_ID}\`** tool. The tool runs the same audited pipeline as the \`attack-discovery.run\` workflow step (anonymization, LLM generation, hallucination detection, validation, persistence inside the Anonymization Boundary) and resolves the LLM connector from the agent execution automatically. Invoke in **sync** mode so discoveries return inline whenever the pipeline finishes within the ~90s soft deadline; the \`replacements\` map is excluded from the output by design.

### Connector handling

The tool resolves the LLM connector from the agent execution by default — you do **not** need to supply \`connector_id\`. Only set \`connector_id\` when the user explicitly asks for a different connector. Pair it with explicit retrieval parameters appropriate to the mode you choose — never rely on server-side defaults.

### Choose the retrieval mode that matches the evidence you have gathered (in order of preference)

- **\`provided\`** (**preferred** — auto-detected when \`alerts\` is non-empty): Pass the curated alert set as an array of descriptive text strings via \`alerts\`. Use this when you gathered and corroborated specific alerts via ES|QL queries, search, or threat hunting. This is the most deterministic path because you supply the exact evidence you evaluated.
- **\`esql\`**: Pass an ES|QL query via \`esql_query\`. Use this when you refined retrieval into a single ES|QL filter during corroboration but did not pre-collect the alert strings yourself. Combine with \`alert_retrieval_workflow_ids\` if the user has custom retrieval workflows to merge in parallel. The pipeline retrieves and anonymizes alerts itself.
- **\`custom_only\`**: Use only the workflows referenced in \`alert_retrieval_workflow_ids\`. Use this only when the user has explicitly asked you to invoke a custom retrieval workflow and you have neither pre-gathered alerts nor an ES|QL query.
- **\`custom_query\`** (last resort): Pass DSL overrides via \`filter\`, \`size\`, \`start\`, \`end\`. Use only when no alerts were gathered, no ES|QL query was developed, and no custom retrieval workflow was requested. **Always provide explicit values for \`size\`, \`start\`, and \`end\` — never omit them.**

### Mode selection decision tree (choose in order of preference)

1. Did you gather specific candidate alerts during corroboration (via ES|QL queries, search, or threat hunting)? → Use **\`provided\`** mode. Format each as a descriptive text string and pass the complete curated set as the \`alerts\` array.
2. Did you refine retrieval into an ES|QL query? → Use **\`esql\`** mode with \`esql_query\`. Add \`alert_retrieval_workflow_ids\` if the user has custom retrieval workflows to merge in parallel.
3. Did the user explicitly ask to invoke a custom retrieval workflow with no built-in query? → Use **\`custom_only\`** with \`alert_retrieval_workflow_ids\`.
4. No alerts gathered and no ES|QL query? → Use **\`custom_query\`** with **explicit** values: always provide \`size\`, \`start\`, and \`end\` (e.g., \`size: 100\`, \`start: "now-24h"\`, \`end: "now"\`). Add a \`filter\` to scope to relevant severity when the investigation warrants it.

⛔ **Never** invoke \`${RUN_ATTACK_DISCOVERY_TOOL_ID}\` with no retrieval parameters at all. Bare invocations fall back to server-side defaults that do not reflect the investigation context and may include irrelevant alerts.

### Anonymization note

Corroboration tools you call (threat intel, ES|QL hunting, entity context) operate on real data with the user's RBAC. In \`provided\` mode, pass the alert text strings as formatted alert descriptions exactly as your queries returned them — do not pass raw individual field values (e.g., a bare IP string) as separate array items. For \`esql\`, \`custom_query\`, and \`custom_only\` modes, the pipeline retrieves and anonymizes alerts itself before the LLM sees them.

### Two possible outcomes from \`${RUN_ATTACK_DISCOVERY_TOOL_ID}\`

The tool's sync mode races the pipeline against a ~90s soft deadline. So sync-mode invocations resolve to one of two shapes:

- **Inline discoveries (fast path):** the pipeline finished within the soft deadline. The output contains \`attack_discoveries\`, \`execution_uuid\`, \`alerts_context_count\`, and \`discovery_count\`. Proceed to the JSON output stage and emit insights inline.
- **Execution UUID only (slow path):** the pipeline exceeded the soft deadline. The output contains only \`execution_uuid\`; \`attack_discoveries\` is absent. The pipeline keeps running in the background and persists discoveries automatically when complete. Acknowledge the in-progress state to the user (include the \`execution_uuid\`), tell them discoveries will appear at \`/app/security/attack_discovery\`, and offer to check status with \`${GET_ATTACK_DISCOVERY_STATUS_TOOL_ID}\` when they want an update. **Do not auto-poll within the same turn**, and do not fabricate insights JSON in this branch.`;

const STATUS_GUIDE = `## Mode B — Status-only (resume a prior generation)

If the user mentions an Attack Discovery \`execution_uuid\` (a UUID returned by a prior \`${RUN_ATTACK_DISCOVERY_TOOL_ID}\` invocation, often a v4 UUID like \`a1b2c3d4-e5f6-7890-abcd-ef0123456789\`), or asks about the status of a previously-started generation:

- **Do NOT** invoke \`${RUN_ATTACK_DISCOVERY_TOOL_ID}\`. A new generation costs an LLM call and a fresh pipeline; that is not what the user asked for.
- Call \`${GET_ATTACK_DISCOVERY_STATUS_TOOL_ID}\` with the supplied \`execution_uuid\`.

Branch on the \`status\` field:

- **\`succeeded\`**: The tool result includes \`attack_discoveries\`. Emit the **full** per-discovery markdown report (heading, host/user, Summary, Details, Attack Chain, deep link) and the insights JSON, exactly as in the inline branch of Mode A. Do not abbreviate to a status-only acknowledgement — when the user asks for status and the pipeline succeeded, they expect the full rich discoveries, not a summary line.
- **\`running\`**: Tell the user the generation is still in progress. Include the current \`phase\` field (\`alert_retrieval\`, \`generation\`, or \`validation\`) so they understand what stage is active. Offer to check again. Do not poll repeatedly in the same turn.
- **\`failed\`**: Report the failure. Include the \`error_message\` field if present and the \`phase\` that failed, so the user can decide whether to retry. Do not fabricate insights.
- **\`not_found\`**: Tell the user no record of that \`execution_uuid\` exists in the event log (it may be invalid, from a different space, or from outside the event-log retention window).

This mode also resumes the slow-path handoff from Mode A — when the user comes back and asks "is it done?" after seeing an in-progress acknowledgement, you are now in Mode B with the previously-returned \`execution_uuid\`.`;

const OUTPUT_REQUIREMENTS = `## Output Requirements

Branch on which mode (and outcome) you are in.

### Inline-discoveries branches (Mode A fast path; Mode B with \`status: succeeded\`)

When you have \`attack_discoveries\` in hand — either because \`attack-discovery.run\` returned them inline (Mode A fast path) or because \`${GET_ATTACK_DISCOVERY_STATUS_TOOL_ID}\` returned \`status: succeeded\` (Mode B) — produce a final response that:

1. Acknowledges that discoveries were persisted (mention the \`execution_uuid\`).
2. Renders a per-discovery markdown report (see the next sub-section) so the chat reads like the Attack Discovery UI.
3. Emits the insights JSON (using the schema below) inline beneath the markdown report so the agent can keep reasoning about the structured form.
4. Reasons step-by-step before the JSON. The reasoning and the markdown report are the only output allowed outside of the JSON code block.
5. Uses the special ${SYNTAX} syntax to reference source data fields **inside the JSON only**. The surrounding markdown report must use plain English (see below).
6. **LIMIT** \`detailsMarkdown\` to 2750 characters and \`summaryMarkdown\` to 200 characters.

**Full presentation is mandatory.** When you have discoveries, render the per-discovery markdown report in full for **every** discovery — never abbreviate to title + entity badges only. Title, host/user context, **Summary** paragraph, bulleted **Details** timeline, **Attack Chain** tactics, and the deep link must all be present for each discovery. The user came here to see the chain; do not make them ask for the details. This requirement applies equally to status-resume (Mode B with \`status: succeeded\`): when the polled status returns discoveries, present them in the same rich shape — never as a one-line "succeeded" status acknowledgement.

#### Per-discovery markdown report

For each discovery in \`attack_discoveries\`, emit a markdown section that mirrors how the Attack Discovery page renders the chain. Include, in order:

- A level-3 heading with the discovery title, e.g. \`### {title}\`.
- A short context line naming the primary host and user involved on a single line, e.g. \`**Host:** SRVWIN02 — **User:** Administrator\`. Resolve real values from your investigation evidence — do **not** copy raw \`{{ field uuid }}\` tokens into the markdown prose.
- A **Summary** paragraph paraphrased from \`summaryMarkdown\`. Plain English, no double-brace tokens.
- A bulleted **Details** timeline paraphrased from \`detailsMarkdown\`. Plain English, no double-brace tokens.
- An **Attack Chain** line listing the MITRE ATT&CK tactics for the chain (the same values that appear in \`mitreAttackTactics\`), comma-separated. Example: \`**Attack Chain:** Initial Access, Execution, Defense Evasion, Impact\`.
- A deep link to the Attack Discovery page so the user can view the persisted, fully-rendered chain: \`[Open in Attack Discovery](/app/security/attack_discovery)\`.

Then, beneath the markdown sections (one per discovery), emit the insights JSON in a single fenced code block. The JSON **must** retain the \`{{ field uuid }}\` syntax — it is consumed by the Attack Discovery UI and the persistence layer. The markdown report **must not** contain those tokens — paraphrase the real values you saw during corroboration into readable prose so the chat output is human-readable. Both halves are required: the JSON preserves the audited pipeline contract, while the markdown gives the analyst an at-a-glance view that mirrors the Attack Discovery page.

If the source returned no discoveries, do not fabricate any. Report that no attack chains met the validation standard and explain what evidence was insufficient.

### In-progress branch (Mode A slow path; Mode B with \`status: running\`)

\`attack_discoveries\` are not yet available. Do **not** emit the insights JSON — there is nothing to emit. Instead, write a short status response that:

1. States the generation is in progress.
2. Includes the \`execution_uuid\`.
3. If \`phase\` is available (Mode B), names the active phase (alert_retrieval, generation, or validation).
4. Tells the user discoveries will be persisted automatically and visible at \`/app/security/attack_discovery\`.
5. Offers to check status again when they ask — you will use \`${GET_ATTACK_DISCOVERY_STATUS_TOOL_ID}\`.

### Failure branch (Mode B with \`status: failed\` or \`not_found\`)

Do **not** emit the insights JSON. Report the failure cleanly:

- For \`failed\`: include the \`error_message\` and \`phase\` if present, and suggest the user retry once the underlying issue is resolved.
- For \`not_found\`: state that no generation matching the supplied \`execution_uuid\` was found.`;

const JSON_OUTPUT_SCHEMA = `## JSON Output Schema

Your final output must include a JSON value adhering to the following schema, in a fenced code block:

\`\`\`json
{
  "type": "object",
  "properties": {
    "insights": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "alertIds": {
            "type": "array",
            "items": { "type": "string" },
            "description": "The alert IDs that the insight is based on."
          },
          "detailsMarkdown": {
            "type": "string",
            "description": "${ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN}"
          },
          "entitySummaryMarkdown": {
            "type": "string",
            "description": "${ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN}"
          },
          "mitreAttackTactics": {
            "type": "array",
            "items": { "type": "string" },
            "description": "${ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS}"
          },
          "summaryMarkdown": {
            "type": "string",
            "description": "${ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN}"
          },
          "title": {
            "type": "string",
            "description": "${ATTACK_DISCOVERY_GENERATION_TITLE}"
          }
        },
        "required": ["alertIds", "detailsMarkdown", "summaryMarkdown", "title"]
      },
      "description": "${ATTACK_DISCOVERY_GENERATION_INSIGHTS}"
    }
  },
  "required": ["insights"]
}
\`\`\``;

const FIELD_SYNTAX_BLOCK = `## Field Syntax

All markdown fields (\`detailsMarkdown\`, \`entitySummaryMarkdown\`, \`summaryMarkdown\`) must use the special double-brace syntax to reference source data:

${SYNTAX}

${GOOD_SYNTAX_EXAMPLES}

${BAD_SYNTAX_EXAMPLES}

The set of valid MITRE ATT&CK tactic values is: ${MITRE_ATTACK_TACTICS.join(', ')}.`;

const SKILL_CONTENT = [
  ANALYST_HEADER,
  TOOL_USAGE_GUIDANCE,
  UPFRONT_PIPELINE_PATTERN,
  KEY_PRINCIPLES,
  ANALYSIS_PROCESS,
  RUN_PIPELINE_GUIDE,
  STATUS_GUIDE,
  OUTPUT_REQUIREMENTS,
  JSON_OUTPUT_SCHEMA,
  FIELD_SYNTAX_BLOCK,
].join('\n\n');

const REFERENCED_DEFAULT_PROMPT = `# Reference: Attack Discovery default analyst prompt

This is the canonical analyst prompt used by the Attack Discovery generation workflow's LangGraph generate node. It is provided for cross-reference; the rules in the skill body above take precedence where the two differ (the skill body is stricter on independent evaluation, entity correlation hygiene, and the validation standard).

${ATTACK_DISCOVERY_DEFAULT}`;

const REFERENCED_REFINE_PROMPT = `# Reference: Attack Discovery refinement prompt

This is the refinement prompt used by the Attack Discovery generation workflow's LangGraph refine node. Use these rules when you re-evaluate your initial chain construction before emitting the final JSON.

${ATTACK_DISCOVERY_REFINE}`;

const REFERENCED_RUN_MODES = `# \`${RUN_ATTACK_DISCOVERY_TOOL_ID}\` mode examples (in order of preference)

The tool resolves the LLM connector from the agent execution by default, so \`connector_id\` is omitted from every example below. Set it explicitly only when the user asked for a different connector.

## 1. \`provided\` mode — preferred (pre-gathered alerts from corroboration)

Pass the alerts you gathered and corroborated as an array of descriptive text strings. The pipeline skips retrieval and uses these directly.

\`\`\`json
{
  "alerts": [
    "Alert 1: Unusual process execution on host web-prod-01. Process: cmd.exe spawned by iis.exe. Severity: high. Rule: Suspicious Windows Process.",
    "Alert 2: Lateral movement detected. User admin logged in from 10.0.0.5 to 10.0.0.23 via PsExec. Severity: critical. Rule: Remote Service Execution.",
    "Alert 3: Privilege escalation attempt. User admin added to Domain Admins group. Severity: critical. Rule: Account Privilege Escalation."
  ]
}
\`\`\`

## 2. \`esql\` mode — refined ES|QL query from corroboration

Use when you developed an ES|QL filter during the investigation but did not pre-collect alert strings.

\`\`\`json
{
  "alert_retrieval_mode": "esql",
  "esql_query": "FROM .alerts-security.alerts-default | WHERE kibana.alert.severity == \\"critical\\" | LIMIT 50"
}
\`\`\`

## 2a. \`esql\` + custom retrieval workflows (parallel merge)

Merge ES|QL results with output from one or more custom retrieval workflows.

\`\`\`json
{
  "alert_retrieval_mode": "esql",
  "esql_query": "FROM .alerts-security.alerts-default | WHERE kibana.alert.severity == \\"critical\\" | LIMIT 50",
  "alert_retrieval_workflow_ids": ["<retrieval-workflow-id>"]
}
\`\`\`

## 3. \`custom_only\` mode — user-specified custom retrieval workflows

Use only when the user explicitly asked to invoke a custom retrieval workflow and you have neither pre-gathered alerts nor an ES|QL query.

\`\`\`json
{
  "alert_retrieval_mode": "custom_only",
  "alert_retrieval_workflow_ids": ["<retrieval-workflow-id>"]
}
\`\`\`

## 4. \`custom_query\` mode — last resort (always provide explicit parameters)

Use only when no alerts were gathered, no ES|QL query was developed, and no custom retrieval workflow was requested. Always provide explicit \`size\`, \`start\`, and \`end\`.

\`\`\`json
{
  "alert_retrieval_mode": "custom_query",
  "size": 100,
  "start": "now-24h",
  "end": "now",
  "filter": { "term": { "kibana.alert.severity": "critical" } }
}
\`\`\`

⛔ Never invoke the tool with no retrieval parameters at all — bare invocations fall back to server-side defaults that do not reflect the investigation context.

Sync mode is preferred so fast generations return discoveries inline. The tool enforces a ~90s soft deadline, so longer generations naturally fall back to the slow-path handoff: only \`execution_uuid\` is returned, and the agent resumes via \`${GET_ATTACK_DISCOVERY_STATUS_TOOL_ID}\` when the user asks for status.`;

export interface AttackDiscoveryGeneratorSkillDeps {
  getEventLogIndex: () => Promise<string>;
  runAttackDiscoveryToolDeps?: RunAttackDiscoveryToolDeps;
  workflowExecutionLookup: WorkflowExecutionLookup;
}

export const createAttackDiscoveryGeneratorSkill = ({
  getEventLogIndex,
  runAttackDiscoveryToolDeps,
  workflowExecutionLookup,
}: AttackDiscoveryGeneratorSkillDeps) =>
  defineSkillType({
    basePath: ATTACK_DISCOVERY_GENERATOR_SKILL_BASE_PATH,
    content: SKILL_CONTENT,
    description: SKILL_DESCRIPTION,
    getInlineTools: () => [
      getDefaultEsqlQueryTool(),
      getAttackDiscoveryStatusTool({ getEventLogIndex, workflowExecutionLookup }),
      ...(runAttackDiscoveryToolDeps != null
        ? [getRunAttackDiscoveryTool(runAttackDiscoveryToolDeps)]
        : []),
    ],
    getRegistryTools: () => [
      platformCoreTools.executeEsql,
      platformCoreTools.generateEsql,
      platformCoreTools.getDocumentById,
      platformCoreTools.getIndexMapping,
      platformCoreTools.getWorkflowExecutionStatus,
      platformCoreTools.search,
    ],
    id: ATTACK_DISCOVERY_GENERATOR_SKILL_ID,
    name: ATTACK_DISCOVERY_GENERATOR_SKILL_NAME,
    referencedContent: [
      {
        content: REFERENCED_RUN_MODES,
        name: 'attack-discovery-run-modes',
        relativePath: '.',
      },
      {
        content: REFERENCED_DEFAULT_PROMPT,
        name: 'default-prompt-reference',
        relativePath: '.',
      },
      {
        content: REFERENCED_REFINE_PROMPT,
        name: 'refine-prompt-reference',
        relativePath: '.',
      },
    ],
  });
