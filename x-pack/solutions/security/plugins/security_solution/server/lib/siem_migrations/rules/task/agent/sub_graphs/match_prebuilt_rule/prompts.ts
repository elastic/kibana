/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { MAX_TOOL_CALL_ATTEMPTS, type PreviousSearchAttempt } from './state';

const AGENT_ROLE_GUIDELINES = `You are an expert assistant in Cybersecurity helping migrate SIEM detection rules to Elastic Security.
Your goal is to find an Elastic Prebuilt Detection Rule that covers the same use case as the source rule, if any.
You have no built-in knowledge of the current Elastic pre-built rule catalog — always use the searchPrebuiltRules tool to retrieve candidates before deciding.`;

export const MATCH_PREBUILT_RULE_SYSTEM_PROMPT_V2 = ChatPromptTemplate.fromMessages([
  ['system', AGENT_ROLE_GUIDELINES],
]);

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
  '- Carefully analyze the source detection rule provided by the user.',
  '- Match it to a candidate from the list above only if the use case is almost identical, as defined in <match_criteria>.',
  '- If no candidate meets those criteria, ensure the value of "match" in the response is an empty string.',
  '- Provide a concise reasoning summary for your decision, naming the criterion that decided it.',
];

const MATCH_CRITERIA = `<match_criteria>
A candidate covers almost the same use case when all of these hold:
- Same security objective: it detects the same threat behaviour, not merely a related one.
- Similar grouping and direction: it aggregates over the similar entity( broadly representing same concept) in the same direction (e.g. many failures against one account, not one account against many hosts) and preserves any required sequence.
- Compatible platform and technology: the candidate targets the same OS platform, product, or vendor as the source rule, or a subset of it. A candidate scoped to a different platform or product is never a match, even when the attack technique is identical.

These may differ and do not disqualify a candidate:
- Technique of the detection. For example, a threshold rule can match a Machine learning rule if security objective is broadly same.
- Threshold values and time windows.
- The specific integration or telemetry source, as long as it stays within the platform the source rule targets.
- How narrowly the candidate is scoped, as long as it stays inside the source rule's scope.

These disqualify a candidate even when the topic looks similar:
- It reverses the grouping direction.
- It replaces the measured quantity with a different kind/concept which changes the objective of the rule.
  - e.g. counting distinct destination ports instead of counting bytes or packets transferred
- It restricts the trigger to a different condition that changes the security objective.
</match_criteria>`;

const MATCH_GUIDELINES = `${MATCH_CRITERIA}

<matching_guidelines>
Evaluate the candidates returned by your last searchPrebuiltRules call:
${MATCH_CORE_GUIDELINE_BULLETS.join('\n')}

If one of them is a match, reply with the final JSON described below — do not search again hoping for a better candidate.
searchPrebuiltRules is a semantic similarity search over the whole catalog, so it already returns the rules closest to your query and a reworded query samples almost the same set. When none of the candidates matches, it is far more likely that no Elastic pre-built rule covers this source rule than that a better query exists: reply with the final JSON and an empty "match".
Search again only if you can name a specific defect in the query you just issued. Only these count as defects:
- it used the wrong product vocabulary for this vendor;
- it named the wrong data source or event type;
- it missed the attack technique the source rule detects;
- all returned candidates are completely unrelated to the source rule (different technology, different attack domain, different use case) — this signals the query keywords were wrong, not that no rule exists.
A scope difference alone is not a query defect: if a candidate is merely narrower than the source rule but meets <match_criteria>, do not search again — select it.
You may call searchPrebuiltRules at most ${MAX_TOOL_CALL_ATTEMPTS} times in total. Once that many queries are listed below, you cannot search again — decide from the candidates you already have and reply with the final JSON.
</matching_guidelines>`;

const OUTPUT_FORMAT_GUIDELINES = `<expected_output>
- Always reply with a JSON object with the field "match" and the value being the most relevant matched elastic detection rule name if any, else the value should be an emptry string, and a "summary" entry with the reasons behind the match. Do not reply with anything else.
- Only reply with a match that meets <match_criteria>. If you are unsure, always reply with an empty string value in the match field, do not guess or reply with anything else.
- If the source rule is a much more complex usecase with custom logic not covered by the prebuilt rules, reply with an empty string in the match field.
- If there is only one match, answer with the name of the rule in the "match" key. Do not reply with anything else.
- If there are multiple matches, answer with the most specific of them, for example: "Linux User Account Creation" is more specific than "User Account Creation".
- Finally, write a "summary" in markdown format with the reasoning behind the decision. Starting with "## Prebuilt Rule Matching Summary" followed by a newline. Make sure the content is valid JSON by escaping any necessary special characters.
- Make sure the JSON object is formatted correctly and the values properly escaped.
</expected_output>

<example_response_match>
A: Please find the resulting JSON response below:
\`\`\`json
{{
  "match": "Linux User Account Creation",
  "summary": "## Prebuilt Rule Matching Summary\\nThe source rule matches Elastic prebuilt rule \`<Rule Name>\`: same security objective, same defining trigger, and the same Linux platform. The prebuilt rule is narrower, relying on Elastic Defend process events rather than the source rule's syslog data, which the criteria permit. \n\n ### Candidates Considered : \n - \`<Rule Name>\`: <Rule one line Description> "
}}
\`\`\`
</example_response_match>

<example_response_no_match>
A: Please find the resulting JSON response below:
\`\`\`json
{{
  "match": "",
  "summary": "## Prebuilt Rule Matching Summary\\nThe closest candidate, \`<Rule Name>\`, measures aggregate traffic volume, while the source rule counts distinct destination ports per host. The measured quantity is replaced rather than narrowed, so no Elastic pre-built rule covers this source rule.\n\n ### Canidates Considered: \n - \`<Rule Name>\`: <Rule one line Description> "
}}
\`\`\`
</example_response_no_match>`;

/**
 * Injected on the first turn, and again whenever a search comes back empty.
 */
export const CREATE_PREBUILT_RULE_SEMANTIC_QUERY_PROMPT_V2 = ChatPromptTemplate.fromMessages<{
  ruleContext: string;
  vendor: string;
  mitreAttackIds: string;
  searchInstructions: string;
}>([
  [
    'human',
    `Source rule context:
{ruleContext}
- vendor: {vendor}
- mitre_attack_technique_ids: {mitreAttackIds}

${PREBUILT_RULES_SEMANTIC_QUERY_GUIDELINES}
{searchInstructions}`,
  ],
]);

const FIRST_SEARCH_INSTRUCTIONS = `
Call the searchPrebuiltRules tool with your best query to find candidate Elastic pre-built detection rules for this source rule.`;

/**
 * Closes the query-generation message. With no prior attempts this is the plain "call the tool"
 * directive for the first search. Prior attempts only exist here when the latest search returned no
 * candidates — the caller injects the match prompt instead whenever there is something to evaluate —
 * so in that branch every listed query genuinely failed and can be described as such.
 */
export const formatSemanticQueryInstructions = (
  previousSearchAttempts: PreviousSearchAttempt[]
): string => {
  if (previousSearchAttempts.length === 0) {
    return FIRST_SEARCH_INSTRUCTIONS;
  }

  const attempts = previousSearchAttempts
    .map(({ query, candidateNames }) => {
      const candidates =
        candidateNames.length > 0 ? candidateNames.map((name) => `"${name}"`).join(', ') : 'none';
      return `- Query: "${query}"\n  Candidates: ${candidates}`;
    })
    .join('\n');

  return `
<previous_search_attempts>
${attempts}
</previous_search_attempts>

Your most recent search returned no candidates. The block above lists every query already issued for this source rule and what each returned; none of them produced a match.
Call searchPrebuiltRules with a meaningfully different query — not a light rewording of one listed above.`;
};

/**
 * Graph-injected retry prompt after a no-match JSON answer: asks the model to search once more
 * from a different keyword angle. `matchPrebuiltRuleRouter` uses the prefix to tell a declined
 * retry (this prompt already shown, model answered JSON again) from a no-match that followed a search.
 */
export const RETRY_SEARCH_PROMPT_PREFIX =
  'Your last search returned candidates but none were a match.';

export const isRetrySearchPromptMessage = (message: { content?: unknown }): boolean =>
  typeof message.content === 'string' && message.content.startsWith(RETRY_SEARCH_PROMPT_PREFIX);

/** Injected inside one agent turn when the model answered without a tool call and the text was not valid JSON. */
export const RETRY_ON_MALFORMED_JSON_PROMPT =
  'Your last reply was not valid JSON. Reply with a JSON object inside three backticks as instructed.';

/**
 * Injected by the agent node when the router sends the run back after a no-match JSON answer.
 * Remaining searches is leftover `MAX_TOOL_CALL_ATTEMPTS` so the 1st and 2nd no-match can
 * each re-search; the 3rd no-match has no budget left and finalizes.
 */
export const formatRetrySearchPrompt = (
  previousSearchAttempts: PreviousSearchAttempt[]
): string => {
  const queries = previousSearchAttempts.map(({ query }) => `"${query}"`).join(', ');
  const remainingSearches = MAX_TOOL_CALL_ATTEMPTS - previousSearchAttempts.length;
  return (
    `${RETRY_SEARCH_PROMPT_PREFIX} ` +
    'Before concluding there is no matching prebuilt rule, try one more search from a ' +
    'different keyword angle — focus on the attack category, the detection technique, ' +
    'or a related technology rather than rewording the same query.\n' +
    `Queries already tried: ${queries}. Do not reuse or lightly reword any of them.\n` +
    `You may call searchPrebuiltRules at most ${remainingSearches} more time(s) after this.`
  );
};

export const MATCH_PREBUILT_RULE_PROMPT_V2 = ChatPromptTemplate.fromMessages([
  [
    'human',
    `${MATCH_GUIDELINES}

${OUTPUT_FORMAT_GUIDELINES}`,
  ],
]);
