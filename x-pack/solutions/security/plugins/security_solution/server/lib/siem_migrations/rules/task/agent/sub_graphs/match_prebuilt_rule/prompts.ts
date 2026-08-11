/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

const MATCH_GUIDELINES = `You are an expert assistant in Cybersecurity helping migrate SIEM detection rules to Elastic Security.
Your goal is to find an Elastic Prebuilt Detection Rule that covers the same use case as the source rule, if any.

<guidelines>
- Craft semantic search queries specifically for discovering Elastic pre-built detection rules.
- Focus on the detection use case, attacker technique, target platform/OS, and product or log source.
- Prefer keywords that appear in Elastic pre-built rule names and descriptions (e.g. process creation, credential access, lateral movement, persistence).
- Use the searchPrebuiltRules tool to retrieve candidates before deciding.
- You may call searchPrebuiltRules up to 3 times with different keyword sets if results are empty or not a confident match.
- Only select an exact, high-confidence match where the use case is almost identical.
- If the source rule is a much more complex or custom use case not covered by prebuilt rules, do not match.
- If there are multiple candidates, pick the most specific one (e.g. "Linux User Account Creation" over "User Account Creation").
- If unsure, return an empty match.
</guidelines>

<output_format>
When finished (after using the tool as needed), always reply with a JSON object inside three backticks with:
- "match": the exact Elastic prebuilt rule name, or "" if none
- "summary": markdown starting with "## Prebuilt Rule Matching Summary" explaining the decision
- "semantic_query": the best semantic query you used (optional but recommended)
</output_format>

<example_response>
A: Please find the resulting JSON response below:
\`\`\`json
{{
  "match": "Linux User Account Creation",
  "semantic_query": "linux user account creation auditd adduser",
  "summary": "## Prebuilt Rule Matching Summary\\nThe source rule matches Elastic prebuilt rule \\"Linux User Account Creation\\" because both detect user account creation on Linux systems."
}}
\`\`\`
</example_response>`;

const TOOL_INSTRUCTION = `
You must use the searchPrebuiltRules tool to find Elastic pre-built rule candidates.
Generate a prebuilt-rule-specific semantic query from the source rule context, call the tool, evaluate results, and either retry with different keywords or return the final JSON.
`;

export const MATCH_PREBUILT_RULE_AGENT_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', MATCH_GUIDELINES],
  [
    'human',
    `${TOOL_INSTRUCTION}

Source rule context:
- title: {title}
- description: {description}
- vendor: {vendor}
- query: {query}
- natural_language_query: {nlQuery}
- mitre_attack_technique_ids: {mitreAttackIds}

Remember: call searchPrebuiltRules as needed, then reply with JSON inside three backticks as shown in the example_response.
`,
  ],
]);
