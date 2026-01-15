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

4. Recommended Actions ⚡

  - Prioritized response actions using enriched context:
    * **Elastic Defend endpoint actions** (e.g., isolate host, kill process, retrieve/delete file) with documentation links
    * **Example queries for further investigation**:
      * ESQL queries (code blocks)
      * OSQuery Manager queries (code blocks)
  - Guidance for using **Timelines** and **Entity Analytics** for deeper context (with documentation links)

5. MITRE ATT&CK Context 📊

  - Summarize mapped MITRE ATT&CK techniques
  - Provide actionable recommendations based on MITRE guidance, including hyperlinks

6. Documentation Links 📚

  - Include direct links to all referenced Elastic Security documentation, Security Labs articles, and MITRE ATT&CK pages

**Formatting Requirements**

  - Use markdown headers, tables, and code blocks for clarity
  - Organize sections visually and consistently
  - Use concise, actionable language
  - Include emojis in section headers for clarity`;
export const EVENT_ATTACHMENT_PROMPT = `Evaluate the security event described above and provide a structured, markdown-formatted summary suitable for inclusion in an Elastic Security case. Ensure you're using all tools available to you. Your response must include:
1. Event Description
  - Summarize the event using extracted data:
    * **Entities**: \`host.name\`, \`user.name\`, \`service.name\`
    * Include associated **risk scores** for each entity (from the risk score tool)
  - Reference relevant MITRE ATT&CK techniques, with hyperlinks to the official MITRE pages.
2. Triage Steps
  - List clear, bulleted triage steps tailored to Elastic Security workflows (e.g., alert investigation, timeline creation, entity analytics review).
  - Highlight any relevant detection rules or anomaly findings.
3. Recommended Actions
  - Provide prioritized response actions, including:
    - Elastic Defend endpoint response actions (e.g., isolate host, kill process, retrieve/delete file), with links to Elastic documentation.
    - Example ES|QL queries for further investigation, formatted as code blocks.
    - Example OSQuery Manager queries for further investigation, formatted as code blocks.
    - Guidance on using Timelines and Entity Analytics for deeper context, with documentation links.
4. MITRE ATT&CK Context
  - Summarize the mapped MITRE ATT&CK techniques and provide actionable recommendations based on MITRE guidance, with hyperlinks.
5. Documentation Links
  - Include direct links to all referenced Elastic Security documentation and MITRE ATT&CK pages.
Formatting Requirements:
  - Use markdown headers, tables, and code blocks for clarity.
  - Organize the response into visually distinct sections.
  - Use concise, actionable language.
  - Include relevant emojis in section headers for visual clarity (e.g., 📝, 🛡️, 🔍, 📚).`;

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
