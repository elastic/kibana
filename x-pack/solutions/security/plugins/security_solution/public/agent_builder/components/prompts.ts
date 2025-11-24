/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ATTACK_DISCOVERY_ATTACHMENT_PROMPT = `Summarize the attack discovery attached and recommend next steps. Case URLs MUST be included in the response if they exist. Summary should be in markdown.`;
export const ALERT_ATTACHMENT_PROMPT = `Evaluate the provided security alert and generate a structured, markdown-formatted summary suitable for inclusion in an Elastic Security case. Use all available enrichment tools before generating your response. Include the following sections:

---

## 1. Event Description 📝

* Summarize the alert using extracted data:

  * **Alert ID**: \`kibana.alert.uuid\` or \`_id\`
  * **Rule Name**: \`kibana.alert.rule.name\`
  * **Entities**: \`host.name\`, \`user.name\`, \`service.name\`
  * Include associated **risk scores** for each entity (from the risk score tool)
  * Reference **MITRE ATT&CK techniques** with links (\`kibana.alert.rule.threat.technique.id\`, \`kibana.alert.rule.threat.tactic.id\`, \`threat.tactic.id\`)

---

## 2. Associated Cases & Attack Discoveries 🔍

* Summarize any attack discoveries that include this alert ID, highlighting:

  * Involved hosts, users, and status
  * Patterns or recurring behaviors

* List all open or related security cases referencing this alert ID, **always using markdown links** to the case URLs (from the cases tool)

---

## 3. Triage Steps 🛡️

* Provide clear, actionable triage steps tailored to Elastic Security workflows:

  * Consider the alert’s rule, involved entities, and MITRE context
  * Include relevant detection rules or anomaly findings
  * Reference Security Labs articles related to the MITRE technique or alert rule (with links)

---

## 4. Recommended Actions ⚡

* Prioritized response actions using enriched context:

  * **Elastic Defend endpoint actions** (e.g., isolate host, kill process, retrieve/delete file) with documentation links
  * **Example queries for further investigation**:

    * Elasticsearch / EQL queries (code blocks)
    * OSQuery Manager queries (code blocks)

  * Guidance for using **Timelines** and **Entity Analytics** for deeper context (with documentation links)

---

## 5. MITRE ATT&CK Context 📊

* Summarize mapped MITRE ATT&CK techniques
* Provide actionable recommendations based on MITRE guidance, including hyperlinks

---

## 6. Documentation Links 📚

* Include direct links to all referenced Elastic Security documentation, Security Labs articles, and MITRE ATT&CK pages

---

**Formatting Requirements**

* Use markdown headers, tables, and code blocks for clarity
* Organize sections visually and consistently
* Use concise, actionable language
* Include emojis in section headers for clarity

**CRITICAL:** You MUST incorporate results from **all enrichment tools** (risk scores, attack discoveries, related cases, Security Labs) before generating the response. Do not skip any step.`;
