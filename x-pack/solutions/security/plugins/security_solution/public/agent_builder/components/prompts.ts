/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// temporary until we figure out if we are using prompt system or not
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
export const ENTITY_ANALYSIS = `Analyze asset data described above to provide security insights. The data contains the context of a specific asset (e.g., a host, user, service or cloud resource). Your response must be structured, contextual, and provide a general analysis based on the structure below.
Your response must be in markdown format and include the following sections:
**1. 🔍 Asset Overview**
   - Begin by acknowledging the asset you are analyzing using its primary identifiers (e.g., "Analyzing host \`[host.name]\` with IP \`[host.ip]\`").
   - Provide a concise summary of the asset's most critical attributes from the provided context.
   - Describe its key relationships and dependencies (e.g., "This asset is part of the \`[cloud.project.name]\` project and is located in the \`[cloud.availability_zone]\` zone.").
**2. 💡 Investigation & Analytics**
   - Based on the asset's type and attributes, suggest potential investigation paths or common attack vectors.
   - **Generate one contextual ES|QL query** to help the user investigate further. Your generated query should address a common analytical question related to the asset type and sub type. Suggest other possible queries and ask if the user wants to generate more queries.
**General Instructions:**
- **Context Awareness:** Your entire analysis must be derived from the provided asset context. If a piece of information is not available in the context state that and proceed with the available data.
- **Query Generation:** When generating a query, your primary output for that section should be a valid, ready-to-use ES|QL query based on the asset's schema. Use ES|QL tool for query generation. Format all queries as code blocks.
- **Formatting:** Use markdown headers, tables, code blocks, and bullet points to ensure the output is clear, organized, and easily readable. Use concise, actionable language.`;
