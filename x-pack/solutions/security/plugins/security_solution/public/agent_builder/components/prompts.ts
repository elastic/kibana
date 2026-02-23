/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// temporary until we figure out if we are using prompt system or not
export const ATTACK_DISCOVERY_ATTACHMENT_PROMPT = `Summarize the attack discovery attached and recommend next steps. Find the risk score for each extracted host.name and user.name. Case URLs MUST be included in the response if they exist. Summary should be in markdown.`;
export const ALERT_ATTACHMENT_PROMPT = `Evaluate the provided security alert and generate a structured, markdown-formatted summary suitable for inclusion in an Elastic Security case. Use all available enrichment tools before generating your response. Include the following sections:

1. Event Description 📝
  - Summarize the alert using extracted data:
    * **Alert ID**: Use the \`_id\` field value (not \`kibana.alert.uuid\`)
    * **Rule Name**: \`kibana.alert.rule.name\`
    * **Entities**: \`host.name\`, \`user.name\`, \`service.name\`
    * Include associated **risk scores** for each entity (from the risk score tool)
    * Reference **MITRE ATT&CK techniques** with links (\`kibana.alert.rule.threat.technique.id\`, \`kibana.alert.rule.threat.tactic.id\`, \`threat.tactic.id\`)

2. Associated Cases & Attack Discoveries 🔍
  - Summarize any attack discoveries that include this alert ID, highlighting:
    * Involved hosts, users, and status
    * Patterns or recurring behaviors
  - List all open or related security cases referencing this alert ID, **always using markdown links** to the case URLs (from the cases tool)

3. Triage Steps 🛡️

  - Provide clear, actionable triage steps tailored to Elastic Security workflows:
    * Consider the alert’s rule, involved entities, and MITRE context
    * Include relevant detection rules or anomaly findings
    * Reference Security Labs articles related to the MITRE technique or alert rule (with links)

4. Automated Investigation ⚡ (REQUIRED - Execute queries, don't just suggest them)

  You MUST automatically execute investigation queries and analyze results. Do NOT provide example queries for the user to run - run them yourself and reason about the findings.

  **ES|QL Investigation** (use the search/execute_esql tool):
  - Execute queries to gather context around the alert timestamp (±15 minutes):
    * Process activity on the affected host
    * Network connections from the affected host/user
    * Authentication events for the user
    * File system activity if relevant to the alert type
  - After each query, explain what you found and its significance

  **Osquery Live Investigation** (use the \`osquery.live_query\` skill):
  - Execute live queries on the affected endpoint to collect current state:
    * Running processes (\`SELECT * FROM processes\`)
    * Network connections (\`SELECT * FROM process_open_sockets\`)
    * Scheduled tasks/cron jobs for persistence
    * Browser extensions if relevant
    * Recently modified files in suspicious locations
  - Analyze the live query results and correlate with the alert

  **Investigation Summary**:
  - Present key findings from your queries in a clear table or bullet list
  - State your assessment: Does the evidence support this being a true positive?
  - List any additional IOCs, suspicious processes, or lateral movement indicators discovered

5. Recommended Response Actions 🛡️

  Based on your investigation findings, provide prioritized response actions:
  - **Elastic Defend endpoint actions** (e.g., isolate host, kill process, retrieve/delete file) with documentation links
  - Specific remediation steps based on what you discovered
  - Guidance for using **Timelines** and **Entity Analytics** for deeper context (with documentation links)

6. MITRE ATT&CK Context 📊

  - Summarize mapped MITRE ATT&CK techniques
  - Provide actionable recommendations based on MITRE guidance, including hyperlinks

7. Documentation Links 📚

  - Include direct links to all referenced Elastic Security documentation, Security Labs articles, and MITRE ATT&CK pages

**Formatting Requirements**

  - Use markdown headers, tables, and code blocks for clarity
  - Organize sections visually and consistently
  - Use concise, actionable language
  - Include emojis in section headers for clarity`;
export const EVENT_ATTACHMENT_PROMPT = `Evaluate the security event described above and provide a structured, markdown-formatted summary suitable for inclusion in an Elastic Security case. Ensure you're using all tools available to you. Your response must include:
1. Event Description 📝
  - Summarize the event using extracted data:
    * **Entities**: \`host.name\`, \`user.name\`, \`service.name\`
    * Include associated **risk scores** for each entity (from the risk score tool)
  - Reference relevant MITRE ATT&CK techniques, with hyperlinks to the official MITRE pages.
2. Triage Steps 🔍
  - List clear, bulleted triage steps tailored to Elastic Security workflows (e.g., alert investigation, timeline creation, entity analytics review).
  - Highlight any relevant detection rules or anomaly findings.
3. Automated Investigation ⚡ (REQUIRED - Execute queries, don't just suggest them)

  You MUST automatically execute investigation queries and analyze results. Do NOT provide example queries for the user to run - run them yourself and reason about the findings.

  **ES|QL Investigation** (use the search/execute_esql tool):
  - Execute queries to gather context around the event timestamp (±15 minutes):
    * Related events from the same host/user
    * Process activity and network connections
    * Authentication events
    * File system activity if relevant
  - After each query, explain what you found and its significance

  **Osquery Live Investigation** (use the \`osquery.live_query\` skill):
  - Execute live queries on the affected endpoint to collect current state:
    * Running processes (\`SELECT * FROM processes\`)
    * Network connections (\`SELECT * FROM process_open_sockets\`)
    * Scheduled tasks/cron jobs for persistence
    * Recently modified files in suspicious locations
  - Analyze the live query results and correlate with the event

  **Investigation Summary**:
  - Present key findings from your queries in a clear table or bullet list
  - State your assessment: Does the evidence indicate suspicious or benign activity?
  - List any additional IOCs or context discovered

4. Recommended Response Actions 🛡️
  Based on your investigation findings, provide prioritized response actions:
  - Elastic Defend endpoint response actions (e.g., isolate host, kill process, retrieve/delete file), with links to Elastic documentation.
  - Specific remediation steps based on what you discovered.
  - Guidance on using Timelines and Entity Analytics for deeper context, with documentation links.

5. MITRE ATT&CK Context 📊
  - Summarize the mapped MITRE ATT&CK techniques and provide actionable recommendations based on MITRE guidance, with hyperlinks.

6. Documentation Links 📚
  - Include direct links to all referenced Elastic Security documentation and MITRE ATT&CK pages.

Formatting Requirements:
  - Use markdown headers, tables, and code blocks for clarity.
  - Organize the response into visually distinct sections.
  - Use concise, actionable language.
  - Include relevant emojis in section headers for visual clarity.`;

export const ENTITY_PROMPT = `Investigate the entity and suggest next steps.`;

export const RULE_ATTACHMENT_PROMPT = `Review the detection rule provided and help improve it. Analyze the rule's configuration including:
- Query logic and data sources
- MITRE ATT&CK mappings
- Rule schedule and lookback periods
- Tags
- Rule name
- Rule description

Put each suggested field into copyable code block of new field value in markdown with named sections.

Question:`;
