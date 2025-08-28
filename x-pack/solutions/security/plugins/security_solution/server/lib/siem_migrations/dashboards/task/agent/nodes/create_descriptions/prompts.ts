/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
export const CREATE_DESCRIPTIONS_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a precise SPL analyst migrating Splunk dashboards to Elastic.
Given a dashboard title and its panels (each with title and SPL query),
write a short description for each panel explaining the goal or intent of the visualization, including the information from the top level dashboard title,
then also produce a brief markdown summary describing the reasoning behind generating the descriptions.

Rules:
- Use only information present in the dashboard title, panel title, and SPL.
- Be concise and neutral; do not invent fields or business logic.
- Each panel description should carry the dashboard title information explicitly.
- Explain "what it shows" and "why it's useful" in 1 sentence per panel.
- If units are clear (e.g., bytes, ms, count, %), use them in wording; otherwise keep generic.
- If the panel intent is ambiguous, note that in the summary.
- The final output must be strict JSON with:
  {{
    "descriptions": {{ "<panel_id>": "<description>", ... }},
    "summary": "## Describe Panels Summary\\n<1-3 short lines of markdown capturing the shared intent/assumptions>"
  }}
- Do not include any extra keys, comments, code fences, or prose outside that JSON.
`,
  ],
  [
    'human',
    `DASHBOARD TITLE:
"{dashboard_title}"

PANELS:
{panels_json}

TASK:
Return strict JSON with exactly these two keys:
{{
  "descriptions": {{ "<panel_id>": "<≤30-word description>", ... }},
  "summary": "## Describe Panels Summary\\n<succinct markdown capturing the overall dashboard intent and any shared assumptions>"
}}

<example>
<example_user>
DASHBOARD TITLE:
"Web Reliability Overview"

PANELS:
[
  {{
    "id": "ab50f18e-2cdd-4bcf-bd58-16063303dda1",
    "title": "5xx by host (5m)",
    "query": "index=web sourcetype=access_combined status>=500 | timechart span=5m count by host"
  }},
  {{
    "id": "ab50f18e-2cdd-4bcf-bd58-16063303dda2",
    "title": "Top endpoints by latency",
    "query": "index=web status=200 | stats avg(resp_time_ms) as avg_rt by endpoint | sort - avg_rt | head 10"
  }}
]
</example_user>
<example_ai>
Please find the match JSON object below:
\`\`\`json
{{
  "descriptions": {{
    "ab50f18e-2cdd-4bcf-bd58-16063303dda1": "In the Web Reliability Overview dashboard, a 5-minute trend of HTTP 5xx errors per host highlights server issues.",
    "ab50f18e-2cdd-4bcf-bd58-16063303dda2": "In the Web Reliability Overview dashboard, the top 10 endpoints ranked by average response time reveal latency hotspots."
  }},
  "summary": "## Describe Panels Summary\\\nDescriptions assume the dashboard's intent is to monitor web reliability dashboard by tracking server errors and endpoint latency in access logs."
}}
\`\`\`
</example_ai>
</example>
`,
  ],
  ['ai', 'Please find the match JSON object below:'],
]);
