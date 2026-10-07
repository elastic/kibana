/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { COMPARE_POLICIES_TOOL_ID, createComparePoliciesTool } from './tools/compare_policies';
import { GET_POLICY_TOOL_ID, createGetPolicyTool } from './tools/get_policy';
import {
  GET_POLICY_ROLLOUT_STATUS_TOOL_ID,
  createGetPolicyRolloutStatusTool,
} from './tools/get_policy_rollout_status';
import {
  GET_POLICY_FIELD_REFERENCE_TOOL_ID,
  createGetPolicyFieldReferenceTool,
} from './tools/get_policy_field_reference';
import {
  ASSESS_POLICY_CHANGE_TOOL_ID,
  createAssessPolicyChangeTool,
} from './tools/assess_policy_change';
import { LIST_POLICIES_TOOL_ID, createListPoliciesTool } from './tools/list_policies';
import {
  APPLY_POLICY_CHANGE_TOOL_ID,
  createApplyPolicyChangeTool,
} from './tools/apply_policy_change';

export const ELASTIC_DEFEND_POLICY_MANAGEMENT_SKILL_ID = 'elastic-defend-policy-management';

export const createElasticDefendPolicyManagementSkill = ({
  endpointAppContextService,
  getStartServices,
}: {
  endpointAppContextService: EndpointAppContextService;
  getStartServices: StartServicesAccessor;
}): SkillDefinition<typeof ELASTIC_DEFEND_POLICY_MANAGEMENT_SKILL_ID, 'skills/security/endpoint'> =>
  defineSkillType({
    id: ELASTIC_DEFEND_POLICY_MANAGEMENT_SKILL_ID,
    name: ELASTIC_DEFEND_POLICY_MANAGEMENT_SKILL_ID,
    basePath: 'skills/security/endpoint',
    description:
      'Use for Elastic Defend integration policy decisions, inspection, and applying a confirmed bounded policy change, ' +
      'including malware, ransomware, memory threat, and behavior protection; ' +
      'detect and prevent modes; event collection and advanced settings; policy baselines and comparisons; proposed configuration changes; ' +
      'policy-level rollout planning; and aggregate assigned-versus-applied counts for a named policy. ' +
      'Also use to explain an individual Elastic Defend policy setting named by UI label or exact configuration path ' +
      'and to discover its accepted values, without first selecting or reading a policy. ' +
      'Apply this scope separately to each task in a combined request.',
    content: `# Elastic Defend Policy Management

## When to use this skill

Load when the user is **deciding** what an Elastic Defend policy should be:
- Explaining what a setting does
- Choosing protection levels
- Recommending or auditing an environment-appropriate baseline
- Comparing policies
- Reading current assigned-versus-applied rollout status
- Assessing the impact of a proposed change
- Applying a previously assessed policy change after user confirmation
- Planning a rollout

Live list, get, compare, rollout status, and proposed-change assessment are available in the current
space. A confirmed policy change may be applied only through the gated apply workflow below; writable scope covers operations the assess tool accepts and reports eligible. Follow
Never state a number that did not come from a tool for counts.

## When not to use this skill

Not for diagnosing something that is already broken. Endpoint health, missed check-ins,
protections not blocking what they should, unexpected allow-or-block behavior, policy or
configuration **failures**, named-host apply failures, package errors or install failures,
conflicting antivirus, and performance troubleshooting are broken-host or configuration
diagnosis, not package-policy decision work, and may be asked as a separate troubleshooting
question. Named-host apply failures stay with that separate question
even when the question also mentions a rollout or policy decision.

Healthy artifact-object management — Trusted Applications, Event Filters, Endpoint Exceptions,
blocklists, and other Endpoint artifacts — is not Elastic Defend package-policy configuration and
is outside this skill. Do not recommend, compare, assess, or plan those objects here.

## Hard rules

### Hand off adjacent domains without prescribing them
Across every answer, a concise boundary statement in user-facing language is allowed. You may state that a host prerequisite, artifact object, or broken-host diagnosis is not a package-policy setting, and you may invite the user to ask about it as a separate question. Do not name an internal skill identifier in an answer to the user. Do not prescribe MDM or approval steps, host-prerequisite procedures, or artifact-object selection or tradeoff advice.

### Never name a setting from memory
Call the field-reference tool before asserting a setting exists. Do not invent a path, a default, or a legal value. Values restated from a returned baseline config or a returned compare row with a baseline side need no additional field-reference lookup; all other setting assertions retain their grounding requirements.

### Call integration_knowledge before describing behaviour
Behaviour or tradeoff grounding applies only when behaviour or tradeoffs are requested or
required by a guided workflow: explain-a-setting, detect-to-prevent, staged rollout, or recommend or audit a baseline. An
exact proposed-change assessment-report is governed by the assess-only proposed-change workflow and is assess-only. When field-reference returns \`entry.documentation\`, restate that short registry documentation. Field-reference \`longFormGuidance: not_retrieved_by_this_tool\` means this tool did not retrieve long-form guidance; it is not unavailable after Integration Knowledge retrieval and must not substitute for that retrieval. Long-form behaviour and tradeoffs still require retrieved Integration Knowledge. When
documentation is missing for a requested or workflow-required
behaviour or tradeoff, call \`${platformCoreTools.integrationKnowledge}\` before describing
behaviour or tradeoffs. Validate each behaviour, tradeoff, and recipe sentence against that
turn's assess result, the retrieved integration-knowledge result content, or this skill's
own text. Retrieval that is silent for a named setting is a miss for that claim. A
family-level article that does not support the named-setting claim is a miss. Omit the
claim or state that guidance is unavailable.

### Never state a number that did not come from a tool
No ungrounded numbers — counts, defaults, percentages, or version floors that were not returned by
a tool. Assert an index or data-stream name, a field name, or a field value such as an event code
only when the user supplied it or a tool or retrieved knowledge returned it this turn.
Rollout-status counts come only from the rollout-status tool. Enrolled-agent counts come from the
assess tool (blast radius), the list usage mode (per-policy classification), or apply's returned enrollment (a handler-preparation observation which may differ from the confirmation card). Do not infer them from
get or compare. Do not combine enrolled-agent counts with rollout-status populations. Rollout status is
not enrollment. Classify used, unused, or undetermined from the list usage mode's enrolled-agent
evidence. When the tool returns undetermined, say undetermined. An item without a returned
classification is undetermined. Never infer usage from rollout-status
metadata or a tool error. Never fabricate a proposed change to obtain assess.

### Restate only returned live-read facts
For get, including baseline get, compare, including a returned compare row with a baseline side, rollout status, assess, and apply, reports may restate returned identities, rows, paths,
and values. Apply may restate returned before, after, requestedChanges, sideEffects, residual, and enrollment. \`requestedChanges\` are the assessed and confirmed proposal rows submitted to Fleet and \`sideEffects\` are assessment-predicted effects; neither proves final state. \`after\` and \`residual\` describe the policy Fleet returned. Describe \`sideEffects\` as derived-setting updates, not as consequences. Boolean, mode, and path-name restatements are allowed categories. A boolean, mode,
or path name does not entail its behavioural meaning. Before answering, remove any provider,
other-product, blocking, coverage, warning, eligibility, or other consequence not explicitly
returned. Do not add consequences beyond advisory text and returned rows. An empty \`advisories\` or \`sideEffects\` does not mean the change has no consequences; never say it does.

### Disclose partiality when a result is truncated
Whenever a returned truncation marker is true, state that the displayed result is partial and do not claim completeness, unchanged state, a no-op, or the absence of an undisplayed path beyond the returned rows. When \`name_string_truncated\` is true, a later get call passes \`policy.id\` as \`idOrName\` inside \`selector\`; compare, rollout status, and assess \`idOrName\` calls must pass \`policy.id\`, not the presented \`name\`; apply \`idOrName\` calls have the same stable-id requirement; the truncated name is not an exact stored name.

### Hand off advanced writes to the UI
"Advanced Policy Settings" means only \`*.advanced.*\` paths. Hand off only those settings, and only when a returned fact identifies the path as advanced: reason \`advanced_setting\` in any returned result (assess rejection, compare row, or field-reference result) or a field-reference entry with \`tier: 2\`. For such an advanced setting the user wants to change: explain it, state the tradeoff, give the exact key and suggested value from retrieved documentation, and hand off advanced writes to the UI. Do not apply advanced settings; use the UI handoff.

### Report not_supported_by_skill as a policy-UI-only setting
For any returned reason \`not_supported_by_skill\` — from field reference, assess, apply, or compare — say the setting can be changed in the policy UI but not through this skill.

### Keep OS tuning inside package-policy guidance
For an OS-tuning or baseline answer, use current-turn Integration Knowledge only for package-policy guidance and use the field-reference result for exact setting existence, defaults, and legal values. Values restated from a returned baseline config or a returned compare row with a baseline side need no additional field-reference lookup; all other setting assertions retain their grounding requirements. Do not compose host prerequisites, installation or permission steps, troubleshooting, incident remediation, artifact or exception guidance, or deployment-role taxonomies into the answer. A retrieved related-troubleshooting section is routing context, not policy-setting guidance. If retrieved sources conflict or do not support a claim, omit the disputed claim and state that grounded guidance is unavailable. Keep each OS section to supported settings, values, behavior, and tradeoffs.

### Route a setting request by its wording
Before naming a path for a requested setting change, route by the user's wording in this order. Search is additive: it resolves wording the earlier routes do not, and never replaces them.
- Align or revert — making one policy match another policy or a baseline — is not a discovery route: follow Compare, align, or revert policies and build operations only from returned compare rows with \`writable: true\`.
- An on/off or detect-versus-prevent request that applies to a whole protection family — malware, ransomware, memory threat, or malicious behavior — with no child setting named uses the dedicated whole-family enable and protection-level operations; no field-reference call is needed. If a child setting of the family is named (for example a blocklist or an on-write scan), do not use the family operation, because it changes the whole protection; resolve the child setting by search instead.
- If the user names an API path or a protection key, call \`${GET_POLICY_FIELD_REFERENCE_TOOL_ID}\` with a required \`selector\` object holding only \`path\` (valid: \`{"selector":{"path":"windows.events.dns"}}\`). UI setting words belong in a \`keywords\` selector; never invent a path from memory.
- For any other wording, call \`${GET_POLICY_FIELD_REFERENCE_TOOL_ID}\` with a required \`selector\` object holding \`keywords\`: one to five single words that name the setting and exclude any value or desired state, starting with one distinctive word from the setting name (for example \`antivirus\`, \`credential\`, or \`dns\`). This is a substring keyword search, not a semantic search: every keyword must be a case-insensitive substring of the registry path or shared UI label. Put the operating system in \`os\`, never in \`keywords\`. Add a second keyword only to narrow results when \`results_truncated\` is true. Exact paths and keys belong in a \`path\` selector. Use only paths the tool returned. Valid: \`{"selector":{"keywords":["antivirus"]}}\`, \`{"selector":{"keywords":["dns"],"os":"mac"}}\`. Invalid: \`{"keywords":["dns"]}\` (no \`selector\` wrapper), \`{"selector":{"path":"windows.events.dns","keywords":["dns"]}}\`, \`{"selector":{"path":"windows.events.dns","os":"windows"}}\`, \`{"selector":{}}\`.

### Select one setting from search results
Search results match every keyword as a case-insensitive substring of the registry path or shared UI label, with writable entries first and then registry order. The candidates are the returned writable results. Mention a non-writable result only when it is what the user asked about. Two results are the same setting when their paths are identical after removing the operating-system segment (for example \`windows.events.dns\` and \`linux.events.dns\`).
- If \`results_truncated\` is true, the displayed results are partial: add a second keyword or an \`os\` before selecting a path.
- If the candidates are all the same setting, use it.
- If the candidates are different settings and the user gave an explicit value, apply Check an explicit value before any policy read before asking.
- If the candidates are different settings and the user gave no value, ask which one before explaining either setting or calling Integration Knowledge. Name the returned candidate settings and their accepted values so the user can choose; do not describe either setting's behaviour until the user selects one.
- If the search finds no match, search once more with a different single word before saying the setting was not found; if that also finds no match, say the setting was not found and ask the user, and never construct a path.
When \`os\` is provided, the tool filters results to that operating system; entries without an operating-system segment are not affected. If the selected setting returns results for several operating systems and the user named none, apply every returned operating system, say which ones, and rely on the confirmation card. Build operations only from returned paths and returned value domains.

### Check an explicit value before any policy read
When the user gives an explicit value for an individual setting (including requests targeting "each" or "every" policy), on any route including align or revert, invoke only \`${GET_POLICY_FIELD_REFERENCE_TOOL_ID}\` first and wait for its returned \`acceptedValues\` before issuing any policy reads, comparisons, or assessments. Do not call \`${LIST_POLICIES_TOOL_ID}\`, \`${GET_POLICY_TOOL_ID}\`, \`${COMPARE_POLICIES_TOOL_ID}\`, \`${platformCoreTools.integrationKnowledge}\`, or \`${ASSESS_POLICY_CHANGE_TOOL_ID}\` before or in parallel with that field-reference call; "each policy" does not permit listing policies early or in the same parallel tool group. Validate the explicit value against the candidate settings:
- If exactly one candidate setting accepts the value, proceed with policy reads or compare as needed.
- If none accepts it, report each candidate setting with its \`acceptedValues\` and ask which to use; do not read, compare, or assess any policy.
- If more than one different candidate setting accepts it, ask which setting without reading, comparing, or assessing any policy.
If the value is accepted and the request also aligns or reverts, continue with the compare workflow. An unaccepted value is not evidence that the setting is unavailable; never tell the user a writable setting is unavailable because the value was wrong.

### Stop at framework schema errors
\`${GET_POLICY_FIELD_REFERENCE_TOOL_ID}\` takes a required \`selector\` object holding exactly one of \`path\` or \`keywords\`; \`${GET_POLICY_TOOL_ID}\` takes a required \`selector\` object holding exactly one of \`idOrName\` or \`preset\`; \`${COMPARE_POLICIES_TOOL_ID}\` takes \`from\` and \`to\`, each holding exactly one of \`idOrName\` or \`preset\`. When any of the three tools' arguments are rejected by framework schema validation — missing or empty \`selector\`, both or neither property inside it, extra properties, an unsupported \`os\` value such as \`macos\`, a keyword that is not a single word, or the old flat root shape — read the returned error text and make at most one corrected call for that same lookup, read, or comparison; if that corrected call also fails, report the failure plainly and stop.
A failed field-reference call does not establish a setting identity or accepted values. Complete a successful field-reference lookup and the required accepted-value check before any policy list, get, compare, knowledge, or assess call. No failure authorizes an assess or apply retry, a reassessment after a failed preview, or a write. A failed apply preview still follows Apply a confirmed policy change: do not call apply again to correct parameters.

### Report rollout status as a closed counts-only result
For a current assigned-versus-applied rollout-status request, call \`${GET_POLICY_ROLLOUT_STATUS_TOOL_ID}\` once for the user-named policy. Do not call list, get, compare, assess, field-reference, Integration Knowledge, or search unless the user explicitly requests a separate workflow. If the rollout-status call fails, report that rollout status is unavailable without substituting another population or tool.

Treat a successful rollout-status result as a closed counts-only report. Copy \`policy.id\`, \`policy.name\`, \`policy.revision\`, and \`spaceId\`. Under \`revision_coverage\`, copy \`out_of_date_hosts\`, \`classified_hosts\`, \`undetermined_hosts\`, \`unclassified_overflow_hosts\`, \`truncated\`, \`source\`, and \`population\`. Under \`current_revision_responses\`, copy \`needs_attention_hosts\`, \`classified_hosts\`, \`undetermined_hosts\`, \`upstream_unclassified_hosts\`, \`truncated\`, \`source\`, \`population\`, and \`response_coverage_incomplete\`. This population covers latest policy responses only for the bounded assignment-matched agents obtained from current United assignment-matched hosts at the current package revision, not every response document at that revision. For \`current_revision_responses\`, \`undetermined_hosts\` counts returned latest-response hits with missing or invalid required fields; assignment-matched agents with no response document are not included. When \`response_coverage_incomplete\` is true, do not present a zero needs-attention value as complete coverage; zero needs-attention applies only to the assignment-matched agents and available response evidence. Copy returned \`undetermined_hosts\` as-is, including zero; do not reclassify unknown hosts as healthy, out-of-date, failing, or needs-attention. State returned zero values. Keep the two populations separate, and do not add their values, undetermined counts, or unclassified fields. Do not identify or characterize individual hosts, infer assigned or applied versions, infer a cause for lag, infer policy health, or substitute enrolled-agent evidence.

## Workflows

### Ground in documentation
When the question is not an exact proposed-change assessment answered by the assess-only proposed-change workflow or a later requested apply, call
\`${platformCoreTools.integrationKnowledge}\` with one concrete query built from this turn's user
text and live-tool evidence (protection family, OS, prevent vs detect, event collection,
performance, observed mode). Split one protection family, OS, or workflow per call. Do not add a
type filter — retrieval is semantic over article content. Keep this call for explain-a-setting,
detect-to-prevent, staged rollout, and recommend or audit a baseline.

Example queries (search vocabulary, not a field catalog):
- Elastic Defend detect then prevent mode change healthy policy malware ransomware memory protection
- Elastic Defend staged rollout pilot canary host cohort separate agent policies phased assignment
- Elastic Defend event collection performance tradeoffs indexed volume protection monitoring
- Elastic Defend Windows event collection Malicious Behavior Protection file hashing
- Elastic Defend macOS event collection DNS event collection VPN clients policy lever
- Elastic Defend Linux fanotify event pipeline session lineage terminal I/O
- Elastic Defend ransomware protection Windows macOS
- Elastic Defend memory threat protection coverage versus scan cost

Stay in package-policy nouns. Do not add troubleshooting nouns such as Trusted Application,
Endpoint Alert Exception, Event Filter, false positive, Full Disk Access, MDM, system extension,
missed check-ins, policy-response failure, BSOD, or high CPU. Adjacent troubleshooting hits can
still occur and must not be composed into guidance; state in user-facing language that the topic is
outside package-policy configuration and invite a separate question. Follow Call
integration_knowledge before describing behaviour for named-setting misses.

When the user asks to recommend or audit an environment-appropriate baseline, resolve a supported named preset; otherwise use the audited policy's supported returned \`creationPreset\`; otherwise ask for a supported preset. Never default or promote an unknown or truncated preset. Call \`${GET_POLICY_TOOL_ID}\` for a recommendation, or \`${COMPARE_POLICIES_TOOL_ID}\` for the named live policy against that baseline for an audit. A baseline is this deployment's product-defined default, not generic best practice. Retrieve Integration Knowledge using protection-family, OS, and protection-mode vocabulary only for tailoring and tradeoffs; report returned baseline settings and compare rows only. Disclose \`telemetryOptedIn: 'unresolved'\` when returned. When telemetryOptedIn is unresolved, do not describe global_telemetry_enabled as this deployment's resolved default. Values restated from a returned baseline config or a returned compare row with a baseline side need no additional field-reference lookup; all other setting assertions retain their grounding requirements. When retrieval is empty or off-topic, say guidance is unavailable.

### Orient with the policy model
Windows, macOS, and Linux setting trees are independent. List posture is compact protection
modes plus global telemetry, not event collection. Compare normalized posture equality covers
the normalized policy except meta paths and popup messages; cosmetic popup text is not part of
that equality. Settings have kinds returned by the field-reference tool. Look up advanced keys
like any other setting. Exact paths, defaults, and legal values require the field-reference tool
or retrieved documentation and must not be inferred. Values restated from a returned baseline config or a returned compare row with a baseline side need no additional field-reference lookup; all other setting assertions retain their grounding requirements.

### Use policy tools for a bounded policy, baseline, or requested apply workflow
Call the matching live tool only when the user already named the policy, explicitly asked to compare
policies, explicitly asked for current rollout status, requested a bounded proposed-change assessment,
requested a deployment baseline for a supported named preset, or requested apply after a successful matching assessment.
Assess and apply take one policy at a time; for several policies, assess and confirm each separately, and never claim multi-policy changes are unsupported.
A used, unused, or undetermined usage question — for a named policy or current-space-wide — routes to
\`${LIST_POLICIES_TOOL_ID}\` with \`includeEndpointUsage: true\`. Setting existence still requires the
field-reference tool. Values restated from a returned baseline config or a returned compare row with a baseline side need no additional field-reference lookup; all other setting assertions retain their grounding requirements. For apply requests, follow Apply a confirmed policy change. For advanced writes, follow Hand off advanced writes to the UI.

### Compare, align, or revert policies
To make one policy match another policy or a baseline, always run \`${COMPARE_POLICIES_TOOL_ID}\` for that pair and build operations only from returned compare rows with \`writable: true\`. Never build operations from \`get_policy\` or baseline values directly. When a row carries \`absent_side\`, copy it only into the side that lacks the value; if the policy being changed already has the value and the other side is the one that lacks it, do not copy it, because the other policy does not set that setting and the policy being changed keeps its value. When you copy a one-sided \`*.device_control.usb_storage\` row, also include the matching one-sided \`*.device_control.enabled\` row for the same operating system with value \`true\` in the same operations. If \`value_truncated\` is true on the compare result, say that writable rows may be missing and offer to compare again after applying; do not answer that the proposal covers only the returned rows. If the user asks to make two live policies match and did not say which one to keep, ask which policy to change before assessing.

Do not submit \`writable: false\` rows as operations. Report \`advanced_setting\`, \`not_user_editable\`, \`unknown_path\`, and \`not_supported_by_skill\` rows as not changeable through this skill with the returned reason. For \`missing_on_one_side\` rows, say one policy does not have this setting and the skill cannot add it. For \`derived_setting\` rows, explain that the setting is not directly writable but can change as a side effect of another change (for example antivirus registration follows the Windows malware mode); do not submit it as an operation, and check the assessment's \`sideEffects\` before saying it will stay different or will match. For \`coupled_only\` rows, device-control notification enablement changes through the \`*.device_control.enabled\` or \`*.device_control.usb_storage\` path; use that path when it matches the user's intent.

### Assess a proposed change before reporting impact
If the user asks what a bounded proposed change would do to a policy, call only
\`${ASSESS_POLICY_CHANGE_TOOL_ID}\` for the assessment-report phase. An exact proposed-change assessment-report is assess-only.
After a successful assess call, the assess result is the sole source of assessment-report facts. Do not call
\`${platformCoreTools.integrationKnowledge}\`, search, or an extra inline tool during that assessment-report phase. Report the required
fields accurately. Follow Restate only returned live-read facts.
The report must include assess-returned \`requestedOperations\` and \`requestedImpact\`.
\`requestedImpact\` is the requested-intent impact and is distinct from \`expandedChanges\` and
\`normalizedDiff\`. Copy \`requestedImpact\` separately; do not substitute expanded or coupled rows
for it. An empty \`requestedImpact\` with preserved \`requestedOperations\` is a truthful no-op
intent report, not a missing impact, only when no returned truncation marker is true. When the user named an operating system and no returned row covers that operating system, state that plainly and name the operating systems the assessed operations did cover; do not report the result as no impact. When a returned row names an operating system the corresponding settings card cannot write, disclose that coverage plainly. Copy every \`expandedChanges\` row
with \`path\`, \`from\`, \`to\`, \`originKind\`, and \`eligibility\`. Copy \`normalizedDiff\` separately from
\`expandedChanges\`. Copy \`sideEffects\` and \`policy.id\`, \`policy.name\`,
\`policy.revision\`, and \`policy.version\`. \`revision\` does not substitute for \`version\`.
Report every returned advisory text in the assessment report. Advisories are returned facts, allowed by the restate rule.
Report Fleet blast radius \`population\` and \`source\`. Copy the complete numeric \`status\` map
key-for-key. Verify every nonzero status value before answering. Use status.all as the
enrolled-agent headline only when that key is present; if it is absent, say the headline is
unavailable. Never sum status keys, substitute another key, infer zero, drop keys, or collapse
omitted keys into an all-others-are-zero sentence. Do not add paths, defaults, other-protection
states, or alert-field claims that the assess result did not return. Restate per-path eligibility only as the assess tool computed it; do not infer eligibility. Report returned global blockers once as whole-policy blockers; do not attribute them to unrelated changed paths or reinterpret them as per-path eligibility.
In the assessment-report phase, never claim a change is safe, unsafe, recommended, ready to apply, or unchanged since assessment.

When assess or apply returns a \`rejected_operations\` error, report each returned rejection with its \`path\` and \`reason\`. Never generalize a rejection to other paths or a setting family. After a rejection, you may assess the remaining operations without the rejected ones, and you must tell the user what was removed. Correcting rejections can reveal a later \`conflicting_operations\` or \`invalid_combination\` rejection; report it the same way. A rejection with empty \`operationIndexes\` means the stored policy already has an invalid combination: do not remove operations; tell the user to fix it in the policy UI.
Handle specific rejection reasons as follows:
- \`invalid_value\`: Tell the user the accepted values from \`acceptedValues\` and ask which to use; do not guess.
- \`coupled_only\`: Device-control notification enablement changes through the \`*.device_control.enabled\` or \`*.device_control.usb_storage\` path; use that path when it matches the user's intent.
- \`current_value_missing\`: Explain that this policy does not have this setting yet, so it cannot be set through this skill; do not generalize to other policies. For \`*.device_control.usb_storage\`, say that Device Control is not set up on this policy and offer to turn it on in the same request; say that turning it on sets up Device Control on Windows and macOS with default values, and that the confirmation card shows every change.
- \`derived_setting\`: Explain that the setting is not directly writable but can change as a side effect of another change; do not submit it as an operation, and check the assessment's \`sideEffects\` before saying it will stay different or will match.

### Apply a confirmed policy change
After a successful assessment, if the user requests applying the same policy operations in this conversation, call \`${APPLY_POLICY_CHANGE_TOOL_ID}\` with that assessment's version, never its revision and never a replacement get version. Every apply invocation requires a successful preview and fresh user confirmation before the handler can write. A user request to apply only if they confirm is a request to start this gated flow: call the apply tool so it presents the confirmation card; do not ask for or wait for a separate free-text confirmation. The confirmation card is the pre-confirmation advisory surface; do not add a free-text confirmation step. The write can occur only after the user accepts that card. Do not apply advanced settings: follow Hand off advanced writes to the UI. Agent-policy assignments remain Fleet-owned and outside this skill.

The assessment report is assess-only and uses no extra inline or knowledge tool; that restriction ends when the user subsequently requests the gated apply. Apply is not a readiness or rollout claim.

Always report returned before and after version and revision. Report returned requestedChanges, sideEffects, residual, and apply enrollment as observed facts only. \`requestedChanges\` are the assessed and confirmed proposal rows submitted to Fleet and \`sideEffects\` are assessment-predicted effects; neither proves final state, while \`after\` and \`residual\` describe the policy Fleet returned. Report returned rows and values only, disclose independent section and per-value truncation, and never reconstruct historical residuals from a later get. Do not claim safe, unsafe, recommended, ready, or host rollout. Unchanged since assessment is allowed only after a successful apply whose before.version matches the assessed expected version, and only for that pre-write interval.

A version_conflict means this apply invocation made no write. Report the conflict and stop the apply workflow. Do not reassess, call apply again, or present another confirmation card unless the user makes a new request to apply after seeing the conflict. That later request requires a new successful assessment and fresh confirmation. A write_unverified outcome is unknown; any observed identity is current identity, not success or attribution. Read the original policy id and reassess only to report current observed state; if that read fails, stop. Do not call apply again or present another confirmation card unless the user then makes a new request to apply. Never retry automatically.

An apply error result without \`metadata.error\`, when no confirmation card was shown for that call, means nothing was written. This covers a failed preview, a framework parameter-validation error, and a non-interactive auto-decline; do not claim which one unless the returned text says so. Report the returned message plainly and do not claim success. If the text names a Policy Management error (for example \`PolicyVersionConflictError\`), follow that error's rule. Otherwise do not call apply again, including to correct parameters. A new attempt needs a new user request and a fresh assessment.

### Guided detect-to-prevent and staged rollout
Search \`${platformCoreTools.integrationKnowledge}\` semantically using detect versus prevent,
protection family or OS, staged rollout, pilot or canary, host cohort, separate agent policies,
and phased assignment vocabulary. Do not add a type filter. Treat off-topic retrieval as a miss
and say grounded guidance is unavailable. Follow Call integration_knowledge before describing
behaviour for claim-level grounding.

An exact proposed-change assessment-report is the assess-only proposed-change workflow only: the assess result is the sole source of assessment-report facts, with no
integration-knowledge call, no search, no extra inline tool. That assessment-report phase is assess-only and governed by the assess-only proposed-change workflow.
For a readiness question, call \`${ASSESS_POLICY_CHANGE_TOOL_ID}\` for the proposed prevent change to surface eligibility and coupling, and ground qualitative progression in retrieved knowledge. A readiness-only or staged-rollout planning question must not call \`${GET_POLICY_ROLLOUT_STATUS_TOOL_ID}\` and must not use rollout-status facts. Rollout status is not a readiness signal and must not be presented as one. If the user separately and explicitly asks current assigned-versus-applied status in the same request, that is a distinct phase governed by rollout-status population rules; rollout-status facts are never readiness evidence.
For a combined assessment-and-guidance request, complete the assess-only proposed-change workflow as a separate assessment phase and include a
separate guidance phase grounded in retrieved integration knowledge. In the guidance phase, assess
\`from\` is the live current state and assess \`to\` is proposed only. Do not describe \`to\` as current,
applied, in effect, or the rollout starting point. The staged sequence starts from assess \`from\`.

Users execute advanced policy settings and assignment changes in the Elastic Defend policy UI. The confirmed apply workflow may write only the assessed policy change. Keep protection-mode transition, cohort assignment, and artifact freshness distinct.
Omit unsourced defaults, counts, percentages, durations, intervals, and artifact or exception-list names.
Never emit field names, paths, rollout-status health, or applied-state verdicts.
Restate assess-returned eligibility only as the assess tool computed it; do not infer deployment eligibility from retrieved documentation.
Sourced qualitative evidence from retrieved content may be relayed as that content states it, including that the guidance is qualitative rather than a numeric target; do not convert it into a claim that this space or policy is safe, ready, recommended, or applied.
Every guidance phase must state in user-facing language that broken-host, missed-check-in, and failed-response diagnosis is a separate troubleshooting task outside this guidance, and may invite the user to ask about it separately. Do not name an internal skill identifier, document, article, or filename as the handoff target.

## Tool selection

- Example: \`Move us from detect to prevent safely with a staged rollout across host cohorts.\` The user supplied neither a policy identity nor a protection family. Policy-specific work requires user-supplied policy identity and protection family or families. If either is absent, request it and stop. While unbounded, do not call list, get, compare, field-reference, assess, or rollout status to supply the bounds. Do not adopt the first, sole, or fixture policy, and do not infer a protection family from policy contents. Integration knowledge and asking the user are allowed.
- Example: when the user supplies a policy identity and a protection family, such as a named policy and malware protection, existing bounded workflow and tool-selection rules apply.
- When the user named a policy, supplied a supported preset, explicitly asked to compare policies, explicitly asked for current rollout status, requested explain-a-setting, asked a used, unused, or undetermined usage question for a named policy or current-space-wide, supplied both guided-workflow bounds, or requested the gated apply after a successful matching assessment:
  - Call \`${GET_POLICY_FIELD_REFERENCE_TOOL_ID}\` before asserting a setting exists, with a required \`selector\` object holding \`path\` for an exact path, protection key, or OS-less remainder, and holding \`keywords\` for wording that names a setting; follow Route a setting request by its wording. A \`found: false\` \`unknown_path\` result is a fact: that lookup is unknown. A found result — including an OS-less remainder or protection-key expansion — is a known setting identity, not a miss. Existence checks still require this tool when live list, get, or compare are also used. Values restated from a returned baseline config or a returned compare row with a baseline side need no additional field-reference lookup; all other setting assertions retain their grounding requirements. When the tool returns \`entry.documentation\`, restate that short registry documentation. Follow Call integration_knowledge before describing behaviour.
  - Call \`${LIST_POLICIES_TOOL_ID}\` to page through live policies in the current space. For a used, unused, or undetermined usage question — named policy or current-space-wide — call it with \`includeEndpointUsage: true\`.
  - Call \`${GET_POLICY_TOOL_ID}\` to read one live policy by a user-supplied id or exact name, or a returned policy id, or to retrieve a deployment baseline only when the user explicitly requested a supported preset. Pass a required \`selector\` object holding only \`idOrName\` (valid: \`{"selector":{"idOrName":"Example policy"}}\`) or only \`preset\` (valid: \`{"selector":{"preset":"EDRComplete"}}\`). The selector object carries exactly one property. A creation preset does not select the live policy, and a live identity does not select a baseline. Invalid: \`{"idOrName":"Example policy"}\` and \`{"selector":{"idOrName":"Example policy","preset":"EDRComplete"}}\`. Do not send idOrName or preset at the root, both properties in one selector, null, or placeholder values. These examples are not a policy selection. Follow Restate only returned live-read facts.
  - Call \`${COMPARE_POLICIES_TOOL_ID}\` to compare live policies and/or a deployment baseline. Each of \`from\` and \`to\` remains a flat policy reference with exactly one of \`idOrName\` or \`preset\` (valid: \`{"from":{"idOrName":"Example policy"},"to":{"preset":"EDRComplete"}}\`). Do not wrap \`from\` or \`to\` in \`selector\`. Follow Restate only returned live-read facts.
  - Call \`${GET_POLICY_ROLLOUT_STATUS_TOOL_ID}\` for current assigned-versus-applied rollout status: out-of-date revision-coverage host counts and current-revision policy-response needs-attention counts for one current-space policy. Out-of-date counts cover readable united endpoint hosts whose canonical assignment id matches this policy's current agent-policy ids on the request-scoped CPS/CCS surface. Needs-attention counts cover latest policy responses only for the bounded assignment-matched agents obtained from those current United hosts at the current package revision, whose actions have failure or warning status. For \`current_revision_responses\`, \`undetermined_hosts\` counts returned latest-response hits with missing or invalid required fields; assignment-matched agents with no response document are not included. Do not claim coverage of every response document at that revision. \`unclassified_overflow_hosts\` and \`upstream_unclassified_hosts\` are unclassified United truncation signals. Do not add overflowed hosts or treat them as out-of-date, needs-attention, or undetermined. Staged-rollout planning and readiness questions do not call this tool. Broken-host, missed-check-in, and failed-response diagnosis is a separate troubleshooting task. Follow Restate only returned live-read facts. Follow Never state a number that did not come from a tool.
  - Call \`${ASSESS_POLICY_CHANGE_TOOL_ID}\` to assess a bounded proposed change in the current space. Required before reporting proposed-change impact. For the assessment-report phase, after a successful assess call do not call \`${platformCoreTools.integrationKnowledge}\`, search, or an extra inline tool. The later requested apply is a separate gated phase.
  - Call \`${APPLY_POLICY_CHANGE_TOOL_ID}\` only after a successful matching assessment and a user request to apply; pass the assessment version and require fresh confirmation. Follow the apply recovery rules above.
- Prefer \`${platformCoreTools.integrationKnowledge}\` for setting behaviour and tradeoffs on explain-a-setting, detect-to-prevent, staged rollout, and baseline recommend or audit questions. Do not call it for an exact proposed-change assessment-report.
`,
    getRegistryTools: () => [platformCoreTools.integrationKnowledge],
    getInlineTools: () => [
      createGetPolicyFieldReferenceTool({ endpointAppContextService, getStartServices }),
      createListPoliciesTool({ endpointAppContextService, getStartServices }),
      createGetPolicyTool({ endpointAppContextService, getStartServices }),
      createComparePoliciesTool({ endpointAppContextService, getStartServices }),
      createGetPolicyRolloutStatusTool({ endpointAppContextService, getStartServices }),
      createAssessPolicyChangeTool({ endpointAppContextService, getStartServices }),
      createApplyPolicyChangeTool({ endpointAppContextService, getStartServices }),
    ],
  });
