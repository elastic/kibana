/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

const AGENT_ROLE_GUIDELINES = `You are an expert assistant in Cybersecurity helping migrate SIEM detection rules to Elastic Security.
Your goal is to find an Elastic Prebuilt Detection Rule that covers the same use case as the source rule, if any.
You have no built-in knowledge of the current Elastic pre-built rule catalog — always use the searchPrebuiltRules tool to retrieve candidates before deciding.`;

export const MATCH_PREBUILT_RULE_SYSTEM_PROMPT_V2 = ChatPromptTemplate.fromMessages([
  ['system', AGENT_ROLE_GUIDELINES],
]);

// Mirrors CREATE_SEMANTIC_QUERY_PROMPT's system message (../../nodes/create_semantic_query/prompts.ts)
// — same keyword-extraction task and category breakdown, just retargeted at the tool's "query"
// argument (a pre-built *rule* match) instead of a standalone semantic_query JSON completion (an
// *integration* match).
const PREBUILT_RULES_SEMANTIC_QUERY_GUIDELINES = `<query_guidelines>
You are extracting keywords from the source SIEM detection rule to build the "query" argument for searchPrebuiltRules — a semantic search over Elastic pre-built detection rule names and descriptions.

Produce a short, keyword-rich query that captures:
- The vendor, product, or technology involved (e.g. AWS, Azure, Windows, Okta, CrowdStrike, Palo Alto, Linux, Fortinet)
- The data source type (e.g. endpoint, network, cloud, authentication, audit logs)
- The type of activity being detected (e.g. process creation, sign-in failure, lateral movement, persistence, exfiltration)

Guidelines:
- The query should be short and concise (one line of space-separated keywords).
- Include keywords that are relevant to the data source and detection use case.
- Add related vendor, product, cloud provider, OS platform keywords you can identify.
- Prefer keywords that appear in Elastic pre-built rule names and descriptions.

Example: the source rule context above may be a raw title/description/query (e.g. for Splunk) or an
already-translated natural language description (e.g. for QRadar/Sentinel) — either way, for a rule
about netsh.exe being abused to persist a malicious proxy via Windows firewall/network configuration
changes, a good query is:
"windows host endpoint netsh.exe process creation command-line utility network configuration persistence proxy dll execution sysmon event id 1"
</query_guidelines>`;

const MATCH_CORE_GUIDELINE_BULLETS = [
  '- Only select an exact, high-confidence match where the use case is almost identical.',
  '- If the source rule is a much more complex or custom use case not covered by prebuilt rules, do not match.',
  '- If there are multiple candidates, pick the most specific one (e.g. "Linux User Account Creation" over "User Account Creation").',
];

const MATCH_SCOPE_GUIDELINE_BULLET =
  '- Consider the scope of both rules: if the source rule is broader in scope or covers additional use cases compared to a candidate, it is not a match.';

const buildMatchGuidelines = (bullets: string[]) => `<matching_guidelines>
Evaluate the candidates returned by your last searchPrebuiltRules call:
${bullets.join('\n')}

If one of them is a confident match, or you have exhausted your search attempts (3 tries total, including your first search), stop calling the tool and reply with the final JSON described below.
If none of them is a confident match and you still have attempts left, call searchPrebuiltRules again — the message that follows restates the source rule, the query guidelines, and every query you have already tried.
</matching_guidelines>`;

const MATCH_GUIDELINES_SPLUNK = buildMatchGuidelines(MATCH_CORE_GUIDELINE_BULLETS);
const MATCH_GUIDELINES_GENERIC = buildMatchGuidelines([
  ...MATCH_CORE_GUIDELINE_BULLETS,
  MATCH_SCOPE_GUIDELINE_BULLET,
]);

const OUTPUT_FORMAT_GUIDELINES = `<expected_output>
When you're done searching, reply with a JSON object inside three backticks with:
- "match": the exact Elastic prebuilt rule name, or "" if none. Do not reply with anything else.
- "summary": a "summary" in markdown format with the reasoning behind the decision, starting with "## Prebuilt Rule Matching Summary" followed by a newline.
Make sure the JSON object is formatted correctly and the values properly escaped.
Do not call the tool and return this JSON object in the same turn — call the tool, wait for its result, then reply with JSON once you're done searching.
</expected_output>

<example_response>
A: Please find the resulting JSON response below:
\`\`\`json
{{
  "match": "Linux User Account Creation",
  "summary": "## Prebuilt Rule Matching Summary\\nThe source rule matches Elastic prebuilt rule \\"Linux User Account Creation\\" because both detect user account creation on Linux systems."
}}
\`\`\`
</example_response>`;

/**
 * Owns query generation for *every* search: the first one and each retry. `previousSearchAttempts`
 * lists the queries already tried and what they returned, so the step that has to invent the next
 * query is the step that knows which queries already failed (it is empty on the first search).
 */
export const CREATE_PREBUILT_RULE_SEMANTIC_QUERY_PROMPT_V2 = ChatPromptTemplate.fromMessages<{
  ruleContext: string;
  vendor: string;
  mitreAttackIds: string;
  previousSearchAttempts: string;
}>([
  [
    'human',
    `Source rule context:
{ruleContext}
- vendor: {vendor}
- mitre_attack_technique_ids: {mitreAttackIds}

${PREBUILT_RULES_SEMANTIC_QUERY_GUIDELINES}

<previous_search_attempts>
{previousSearchAttempts}
</previous_search_attempts>

The block above lists the queries already tried for this source rule and the candidates each one returned; none of them produced a confident match. It is empty on your first search.
Do not repeat a query listed there — craft a meaningfully different one (not a light rewording) that addresses why those attempts fell short.

Call the searchPrebuiltRules tool with your best query to find candidate Elastic pre-built detection rules for this source rule.`,
  ],
]);

export const MATCH_PREBUILT_RULE_PROMPT_SPLUNK_V2 = ChatPromptTemplate.fromMessages([
  [
    'human',
    `${MATCH_GUIDELINES_SPLUNK}

${OUTPUT_FORMAT_GUIDELINES}`,
  ],
]);

export const MATCH_PREBUILT_RULE_PROMPT_GENERIC_V2 = ChatPromptTemplate.fromMessages([
  [
    'human',
    `${MATCH_GUIDELINES_GENERIC}

${OUTPUT_FORMAT_GUIDELINES}`,
  ],
]);
