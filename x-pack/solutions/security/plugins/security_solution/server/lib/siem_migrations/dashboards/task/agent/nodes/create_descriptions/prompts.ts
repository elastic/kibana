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
write a short description for the main dashboard and also for each panel, explaining the goal or intent of the dashboard and each visualization.

Rules:
- Use only information present in the dashboard title, panel title, and SPL query.
- Be concise but informative. The descriptions should explain "what it shows" and "why it's useful" in 1 sentence.
- Be neutral. If the intent is ambiguous, keep it generic, do not guess.
- If units are clear (e.g., bytes, ms, count, %), use them in wording; otherwise keep generic.
- The final output must be strict JSON with:
  {{
    "dashboard_description": "<description>",
    "panel_descriptions": {{ "<panel_id>": "<description>", ... }},
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
  "dashboard_description": "<≤30-word description>",
  "panel_descriptions": {{ "<panel_id>": "<≤30-word description>", ... }},
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
  "dashboard_description": "Monitors the reliability of web services by tracking server errors and endpoint latency using access logs.",
  "panel_descriptions": {{
    "ab50f18e-2cdd-4bcf-bd58-16063303dda1": "A 5-minute trend of HTTP 5xx errors per host highlights server issues.",
    "ab50f18e-2cdd-4bcf-bd58-16063303dda2": "The top 10 endpoints ranked by average response time reveal latency hotspots."
  }},
}}
\`\`\`
</example_ai>
</example>
`,
  ],
  ['ai', 'Please find the match JSON object below:'],
]);
