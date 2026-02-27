/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

/**
 * Prebuilt alert triage skill for security analysts.
 *
 * Provides a structured, step-by-step process for evaluating security alerts,
 * gathering context, assessing threats, and making triage decisions.
 *
 * For alerts involving domains, DNS, or network IOCs, the triage process
 * includes VirusTotal enrichment and escalates into the forensics_analytics
 * skill for deep cross-endpoint investigation using osquery.
 */
export const ALERT_TRIAGE_SKILL = defineSkillType({
  id: 'security.alert_triage',
  name: 'alert-triage',
  basePath: 'skills/security/alerts',
  description:
    'Step-by-step alert triage: assess severity, gather context, enrich with threat intel, and escalate to forensic investigation when needed',
  content: `# Alert Triage

## Overview

Systematically triage security alerts in Elastic Security. This skill covers the full triage lifecycle:
- Initial assessment and severity evaluation
- Context gathering across related alerts, entities, and historical activity
- **Threat intelligence enrichment** via VirusTotal
- Threat assessment (true positive vs false positive)
- **Escalation to the forensics_analytics skill** for deep cross-endpoint investigation
- Decision making and documentation

## CRITICAL: Use Tools — Don't Just Describe Steps

When triaging alerts, you MUST:
1. **Fetch the alert** — use the alerts tool to retrieve the full alert document
2. **Query related data** — search for related alerts, entity risk scores, and historical activity
3. **Enrich with VirusTotal** — for domain/IP alerts, query \`logs-threatintel.virustotal-default\` or trigger the VirusTotal workflow
4. **Run osquery** when investigating domains/DNS — use the osquery skill for cross-endpoint queries
5. **Escalate to forensics_analytics** when deeper investigation is needed
6. **Document findings** — add notes to alerts and create cases

Use the \`write_todos\` tool to track your triage steps and mark them complete as you progress.

## Triage Process

### Step 1: Initial Assessment

Fetch the alert and examine:

1. **Alert Severity & Risk Score**: Critical/high alerts require immediate attention. Check \`kibana.alert.severity\` and \`kibana.alert.risk_score\`
2. **Detection Rule**: Read \`kibana.alert.rule.name\` and the rule description to understand what was detected
3. **MITRE ATT&CK Mapping**: Check \`kibana.alert.rule.threat\` for tactic/technique IDs (e.g., TA0001 Initial Access, T1566 Phishing)
4. **Source Entities**: Identify the key entities from the alert:
   - \`host.name\` — the affected endpoint
   - \`user.name\` — the user account involved
   - \`process.name\` — **the process that triggered the alert** (e.g., \`chrome\`, \`firefox\`, \`curl\`, \`powershell\`)
   - \`destination.domain\` or \`dns.question.name\` — the domain involved
   - \`source.ip\` / \`destination.ip\` — network addresses
5. **Investigation Guide**: Check if the rule has an investigation guide attached
6. **Alert Tags**: Look for tags like \`rsa-2026-demo\`, \`ref7707\`, \`typosquatting\` that provide additional context

**Key insight for domain alerts**: When \`process.name\` is a browser (chrome, firefox, edge, safari), it means a **user browsed to the domain**. This is different from a background service or malware reaching out — it indicates the user was likely lured via phishing or social engineering.

### Step 2: Context Gathering

Collect additional context to make informed decisions:

- **Related Alerts**: Search for other alerts involving the same entities (host, user, domain, IP) within a time window
- **Historical Activity**: Review past behavior of the entities involved
- **Asset Criticality**: Check if affected assets are critical (domain controllers, databases, key personnel)
- **Business Context**: Consider maintenance windows, authorized testing, or known changes

### Step 2a: Threat Intelligence Enrichment (for domain/IP/hash alerts)

For alerts involving domains, IPs, or file hashes, **check threat intelligence before proceeding**:

**Query existing VirusTotal enrichments:**
\`\`\`
FROM logs-threatintel.virustotal-default
| WHERE threat.enrichments.indicator.domain == "<domain_from_alert>"
| SORT @timestamp DESC
| LIMIT 5
\`\`\`

If no enrichment exists, trigger the VirusTotal workflow:
\`\`\`
invoke_skill({
  name: "security.workflows",
  parameters: {
    operation: "run_workflow",
    params: {
      name: "RSA 2026 Demo - VirusTotal Domain Check",
      inputs: { domain: "<domain_from_alert>" }
    }
  }
})
\`\`\`

**Interpreting VirusTotal results:**
- Check \`threat.enrichments[].virustotal.stats\` for detection ratios
- High detection count = confirmed malicious → escalate immediately
- Low/zero detections with suspicious domain = potential new/emerging threat → still investigate
- Cross-reference the domain against known typosquatting patterns (see REF7707 section below)

### Step 2b: De-duplication, Correlation, and Case Scoping (REQUIRED)

If you find **duplicate** or **related** alerts (same entities, same rule, same technique, or overlapping time window):

1. **Create a new case** to track the incident and avoid triaging duplicates independently
2. **Attach all related alerts to the case** (the case becomes the single source of truth)
3. **Triage one representative alert first**, then apply the same framework to all attached alerts
4. **Document the consolidated outcome** in the case (summary, key pivots, next steps)

**Guardrails**: Creating a case and attaching alerts is a write operation — get explicit user confirmation and pass \`confirm: true\`.

\`\`\`
invoke_skill({
  name: "security.cases",
  parameters: {
    operation: "create_case",
    params: {
      title: "Potential incident: related security alerts",
      description: "Grouping duplicate/related alerts for unified triage.",
      tags: ["triage", "dedupe"],
      confirm: true
    }
  }
})
\`\`\`

Then attach alerts:
\`\`\`
invoke_skill({
  name: "security.cases",
  parameters: {
    operation: "attach_alerts",
    params: {
      caseId: "<case_id>",
      alerts: [
        { "alertId": "<alert_id_1>", "index": "<alerts_index>" },
        { "alertId": "<alert_id_2>", "index": "<alerts_index>" }
      ],
      confirm: true
    }
  }
})
\`\`\`

### Step 2c: Cross-Host Investigation with Osquery (for domain/DNS/URL alerts)

When investigating alerts related to **malicious domains, DNS queries, or suspicious URLs**, you MUST use osquery to check whether other hosts in the environment have also accessed the same domain. This determines the **blast radius** of the compromise.

Elastic's osquery integration includes a unique \`elastic_browser_history\` table that provides **unified browser history across all installed browsers** (Chrome, Firefox, Edge, Safari) in a single normalized schema. This is the key capability that enables cross-endpoint forensic discovery — without it, you would need to query each browser's native SQLite database separately on every endpoint.

**Step 1: List all agents and their protection levels:**
\`\`\`
security.osquery.get_agents({})
\`\`\`
Examine \`policy_name\` for each agent:
- Policy contains "Defend" → Elastic Defend + Osquery (full protection)
- Policy does NOT contain "Defend" → Osquery only (browser history queryable, but no real-time protection)

**Step 2: Discover the browser history schema (required — columns vary by version):**
\`\`\`
security.osquery.get_table_schema({ tableName: "elastic_browser_history", agentId: "<agent_id_from_alert>" })
\`\`\`

**Step 3: Query browser history on the alert source endpoint first:**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT <columns_from_schema> FROM elastic_browser_history WHERE <url_column> LIKE '%<domain_from_alert>%'",
  agentIds: ["<agent_id_from_alert>"]
})
\`\`\`

**Step 4: Fetch results (MANDATORY — live queries return an action_id, not data):**
\`\`\`
security.osquery.get_results({ actionId: "<queries[0].action_id>" })
\`\`\`

**Step 5: Sweep ALL endpoints for the same domain:**
Pass ALL agent IDs from Step 1 to check every endpoint in a single query:
\`\`\`
security.osquery.run_live_query({
  query: "SELECT <columns_from_schema> FROM elastic_browser_history WHERE <url_column> LIKE '%<domain_from_alert>%'",
  agentIds: ["<id1>", "<id2>", "<id3>", ...]
})
\`\`\`
Then fetch results — each row includes \`_agent_id\` to identify which endpoint returned it.

**Analyzing cross-host results:**
- Match \`_agent_id\` back to the agent list to identify hostnames and policy types
- Endpoints with **Elastic Defend + Osquery** have full protection (network events, process monitoring)
- Endpoints with **Osquery only** have limited visibility — browser history is queryable via \`elastic_browser_history\` but no real-time protection
- **Highlight any endpoints that visited the domain but LACK Elastic Defend** — these are blind spots that need Defend deployed

### Step 3: Threat Assessment

Evaluate the potential threat using all gathered evidence:

**True Positive Indicators (likely real threat):**
- VirusTotal confirms domain is malicious (high detection ratio)
- Domain uses typosquatting (e.g., \`checkponit.com\` → \`checkpoint.com\`, \`ictnsc.com\` → \`ictsec.com\`)
- Browser process (chrome/firefox) initiated the connection — suggests user was lured
- Multiple hosts affected across the environment
- Activity correlates with known MITRE ATT&CK techniques (T1566 Phishing, T1204 User Execution)

**False Positive Indicators (likely benign):**
- Known maintenance or authorized testing
- Domain is a legitimate service with similar spelling
- Activity matches normal business patterns
- VirusTotal shows clean results and domain has long history

### Step 4: Escalate to Forensic Investigation (when warranted)

**When to escalate**: If triage confirms a true positive — especially for domain/DNS alerts where the browser process was the source — escalate to the \`forensics_analytics\` skill for deep investigation.

**The forensics_analytics skill will use osquery's \`elastic_browser_history\` as the primary discovery mechanism:**
1. **List all agents** and categorize their protection levels (Defend + Osquery vs Osquery-only)
2. **Discover the \`elastic_browser_history\` schema** via \`security.osquery.get_table_schema\` (column names vary by version)
3. **Query browser history on the alerted endpoint** to confirm the user visited the malicious domain via Chrome/Firefox
4. **Sweep ALL endpoints** for the same domain in \`elastic_browser_history\` — this is the key forensic discovery step that reveals compromised hosts that had NO network alert
5. **Run process forensics** on affected endpoints — analyze browser process trees, check for malicious child processes
6. **Check persistence mechanisms** on affected endpoints (crontab, systemd, registry run keys)
7. **Correlate with VirusTotal** enrichment from \`logs-threatintel.virustotal-default\`
8. **Report the full blast radius** — which endpoints are affected, their protection level, and remediation (deploy Elastic Defend on Osquery-only hosts)

### Step 5: Decision Making

Based on your assessment, determine the appropriate action:

- **Acknowledge**: Alert is valid, investigation in progress
- **Close (False Positive)**: Alert does not represent a real threat
- **Close (Benign True Positive)**: Alert is valid but represents expected/acceptable behavior
- **Escalate**: Alert is a confirmed threat — use forensics_analytics for full investigation

### Step 6: Document and Close

Add notes to the alert documenting the triage decision:

\`\`\`
invoke_skill({
  name: "add_alert_note",
  parameters: {
    alertId: "<alert_uuid>",
    note: "<triage_decision_and_rationale>"
  }
})
\`\`\`

## REF7707 Typosquatting Domain Reference

The following domains are typosquatting variants identified by Elastic Security Labs (report REF7707 — "Fragile Web"). They mimic legitimate security vendor brands and are associated with APT groups and phishing campaigns:

| Typosquatting Domain | Legitimate Brand | Technique |
|---|---|---|
| \`poster.checkponit.com\` | Check Point (\`checkpoint.com\`) | Letter swap |
| \`support.fortineat.com\` | Fortinet (\`fortinet.com\`) | Letter swap |
| \`update.hobiter.com\` | Hobiter (tool name) | Misspelling |
| \`support.vmphere.com\` | VMware vSphere (\`vmware.com\`) | Letter omission |
| \`cloud.autodiscovar.com\` | Autodiscover (\`autodiscover\`) | Letter swap |
| \`digert.ictnsc.com\` | DigiCert / ICTSEC (\`ictsec.com\`) | Letter swap |

**MITRE ATT&CK mapping**: TA0001 Initial Access → T1566 Phishing
**Reference**: https://www.elastic.co/security-labs/fragile-web-ref7707

When triaging alerts that match any of these domains, immediately classify as **high confidence true positive** and escalate to forensics_analytics.

## Severity-Based Prioritization

**Critical**: Immediate investigation. Active compromise likely. Escalate to forensics_analytics immediately.

**High**: Important security events. Requires prompt investigation. VirusTotal enrichment and cross-host sweep required. Review within hours.

**Medium**: Moderate security concerns. Standard investigation timeline. May require additional context. Review within 24 hours.

**Low/Info**: Minor observations. Often informational. Can be batched for review. May be closed if context is clear.

## Common Triage Scenarios

### Scenario: Malicious Domain Detection (REF7707 typosquatting)
This is the primary scenario for the RSA 2026 AI Forensics Agent demo. It showcases osquery's \`elastic_browser_history\` table — a custom Elastic table that provides unified browser history across Chrome, Firefox, Edge, and Safari in a single query, enabling cross-endpoint forensic discovery that would be impossible with standard log telemetry alone.

1. **Fetch the alert** — note the domain (\`destination.domain\` or \`dns.question.name\`), the source host (\`host.name\`), and the process (\`process.name\`)
2. **Identify the browser** — if \`process.name\` is \`chrome\` or \`firefox\`, the user browsed to the domain (phishing/social engineering vector)
3. **Check the REF7707 domain table** above — if the domain matches, this is a known typosquatting domain
4. **Enrich with VirusTotal** — query \`logs-threatintel.virustotal-default\` or trigger the workflow
5. **Discover \`elastic_browser_history\` schema** — call \`security.osquery.get_table_schema({ tableName: "elastic_browser_history", agentId: "<agent_id>" })\`
6. **Query browser history on the alerted endpoint** — confirm the user's Chrome/Firefox visited the domain
7. **Sweep ALL endpoints via \`elastic_browser_history\`** — this is the key step: query every osquery-enabled agent to discover which other hosts also visited the domain. Endpoints that had no network alert but DO have browser history are the hidden compromised hosts the forensic agent uncovers.
8. **Escalate to forensics_analytics** for full process tree analysis, persistence checks, and blast radius report
9. **Key findings to report**: which hosts are affected, which browsers were used (Chrome vs Firefox), which hosts have Elastic Defend vs Osquery-only, and recommended remediation

### Scenario: High Volume of Similar Alerts
1. Group related alerts by entity, rule, and technique
2. Create a case and attach all related alerts
3. Investigate one representative alert thoroughly
4. Apply findings to the group — close duplicates with appropriate notes

### Scenario: Alert on Critical System
1. Prioritize investigation even if severity is lower
2. Assess potential business impact
3. Check for lateral movement from/to the critical system
4. Escalate or acknowledge for deeper investigation

### Scenario: Alert with Multiple IOCs
1. Correlate IOCs with VirusTotal and threat intelligence
2. Run cross-endpoint IOC sweep via forensics_analytics
3. Likely a true positive — escalate immediately

## Triage Decision Framework

When triaging any alert, answer these questions:

1. **Is this a real security threat?** (True positive vs false positive — use VirusTotal and REF7707 reference)
2. **What is the potential impact?** (Severity × asset criticality)
3. **What is the urgency?** (Time sensitivity and active threat indicators)
4. **What process initiated the activity?** (Browser = user-initiated = likely phishing/social engineering)
5. **What is the blast radius?** (How many other hosts are affected? Use osquery cross-endpoint sweep)
6. **What action is required?** (Investigate, enrich with VirusTotal, escalate to forensics_analytics, or close)

Effective triage balances thoroughness with efficiency — ensure real threats are identified, enriched with threat intelligence, and escalated to forensic investigation while maintaining operational velocity.`,
});
