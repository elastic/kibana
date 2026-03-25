/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_THREAT_INTEL_ENRICH_TOOL_ID,
  SECURITY_TIMELINE_CREATE_TOOL_ID,
  SECURITY_CASE_MANAGE_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_MITRE_MAPPING_TOOL_ID,
  SECURITY_ENTITY_STORE_QUERY_TOOL_ID,
} from '../../tools';

export const getInvestigationSkill = () =>
  defineSkillType({
    id: 'investigation',
    name: 'investigation',
    basePath: 'skills/security/alerts',
    experimental: true,
    description:
      'Guide to conducting systematic security investigations: scope definition, evidence collection, timeline reconstruction, cross-source correlation, root cause analysis, and findings documentation with confidence assessment.',
    content: `# Security Investigation Guide

## When to Use This Skill

Use this skill when:
- A user needs to conduct a deep investigation after alert triage has identified a true positive
- A user wants to understand the full scope and timeline of a security incident
- A user asks for root cause analysis of a security event or alert chain
- A user needs to correlate events across multiple data sources (endpoints, network, authentication, application logs)
- An analyst needs to build a comprehensive timeline for an incident report
- A user wants to identify all affected entities and lateral movement paths

## Related Skills

Before using this skill, you may want to use:
- '~/skills/security/alerts/alert-triage' to classify alerts and determine which ones warrant deeper investigation

After using this skill, you may want to use:
- '~/skills/security/alerts/response-recommendation' to get containment recommendations based on investigation findings
- '~/skills/security/alerts/incident-reporting' to generate a formal incident report from the investigation findings
- '~/skills/security/entities/entity-analytics' to get entity risk scores and asset criticality for involved entities
- '~/skills/security/ml/find-security-ml-jobs' to check for anomalous behavior related to investigated entities

## Investigation Methodology

### Phase 1: Scope Definition
- Define the investigation scope based on the triggering alert or request:
  - **Primary entities**: the hosts, users, IPs, and services directly referenced in the triggering event
  - **Time window**: establish initial investigation window (default: 24 hours before and after the triggering event)
  - **Data sources**: identify which indices and data sources are relevant (alerts, endpoint events, network logs, authentication logs, application logs)
  - **Investigation hypothesis**: formulate an initial hypothesis about what happened
- Set scope boundaries to prevent investigation sprawl:
  - Maximum entity expansion depth: 3 hops from the primary entity
  - Maximum time window expansion: 7 days in either direction from the triggering event
  - Entity count cap: investigate up to 50 unique entities before summarizing and prioritizing

### Phase 2: Evidence Collection
- Systematically collect evidence from multiple data sources:

#### 2a. Alert Evidence
- Fetch all alerts related to primary entities within the investigation time window
- Group alerts by rule name, severity, and MITRE ATT&CK technique
- Identify alert clusters that suggest coordinated activity
- Note any alerts that were previously closed or marked as false positives

#### 2b. Endpoint Evidence
- Query endpoint events for primary host entities:
  - Process execution events: look for suspicious process trees, command-line arguments, unsigned binaries
  - File events: file creation, modification, deletion in sensitive directories
  - Registry events (Windows): persistence mechanisms, configuration changes
  - Network connections: outbound connections from host processes, unusual ports or protocols
  - Library loads: DLL side-loading, injection indicators
- Use ES|QL to query endpoint data efficiently with targeted filters

#### 2c. Network Evidence
- Query network flow data for primary IP entities:
  - Connection patterns: volume, frequency, timing, destination diversity
  - DNS queries: suspicious domains, DGA patterns, tunnel indicators
  - HTTP/HTTPS traffic: unusual user agents, large data transfers, beaconing patterns
  - Lateral movement indicators: SMB, RDP, WMI, SSH connections between internal hosts
- Cross-reference network connections with known threat intelligence indicators

#### 2d. Authentication Evidence
- Query authentication logs for primary user entities:
  - Login events: successful and failed attempts, source IPs, timestamps
  - Privilege escalation: sudo events, service account usage, token manipulation
  - Account modifications: password changes, group membership changes, new account creation
  - Session activity: session duration, concurrent sessions, unusual access patterns
- Identify authentication anomalies: impossible travel, brute force patterns, credential stuffing

#### 2e. Application and Audit Evidence
- Query application logs for relevant activity:
  - Cloud service events: API calls, configuration changes, data access
  - Email events: phishing indicators, attachment downloads, forwarding rules
  - Database access: unusual queries, bulk data exports, schema modifications
  - Audit logs: policy changes, security control modifications

### Phase 3: Timeline Reconstruction
- Build a chronological timeline of events from all collected evidence:
  - Merge events from all data sources into a single timeline sorted by timestamp
  - Identify the initial compromise event (patient zero)
  - Map the attack progression through the kill chain:
    1. Initial Access: how did the attacker gain entry?
    2. Execution: what code or commands were run?
    3. Persistence: what mechanisms were established for continued access?
    4. Privilege Escalation: how were higher privileges obtained?
    5. Defense Evasion: what techniques were used to avoid detection?
    6. Credential Access: were credentials harvested or stolen?
    7. Discovery: what reconnaissance was performed?
    8. Lateral Movement: how did the attacker move between systems?
    9. Collection: what data was staged for exfiltration?
    10. Exfiltration: was data transferred out of the environment?
    11. Impact: what damage was done or attempted?
  - Highlight gaps in the timeline where visibility is limited
  - Note any anti-forensic activity (log deletion, timestamp manipulation)

### Phase 4: Cross-Source Correlation
- Correlate findings across data sources to build a coherent narrative:
  - **Entity linking**: connect the same entity across different data sources (e.g., a user's authentication events linked to their endpoint activity)
  - **Temporal correlation**: identify events that occurred within close time proximity across different systems
  - **Causal correlation**: establish cause-and-effect relationships (e.g., phishing email -> malware download -> C2 connection)
  - **Pattern matching**: identify common attack patterns or TTPs across the evidence
- Validate correlations:
  - Require at least two independent data sources to confirm a correlation
  - Flag single-source findings as "unconfirmed" in the report
  - Weight correlations by data quality and completeness

### Phase 5: Root Cause Analysis
- Determine the root cause of the incident:
  - **Initial vector**: how did the threat initially enter the environment?
  - **Enabling factors**: what vulnerabilities, misconfigurations, or policy gaps enabled the attack?
  - **Propagation mechanism**: how did the threat spread from the initial foothold?
  - **Detection gap**: why was the threat not detected sooner?
- Assess confidence in the root cause hypothesis:
  - 0.90 - 1.00: Root cause is definitively established with clear evidence chain
  - 0.70 - 0.89: Root cause is highly probable based on available evidence
  - 0.50 - 0.69: Root cause is the most likely explanation but alternative hypotheses exist
  - 0.30 - 0.49: Root cause is a working hypothesis that needs further validation
  - 0.00 - 0.29: Insufficient evidence to determine root cause

### Phase 6: Findings Documentation
- Compile all findings into a structured investigation report:
  - Executive summary: one paragraph overview of the incident
  - Timeline: chronological sequence of events with timestamps
  - Affected entities: complete list of compromised or affected hosts, users, services
  - Attack vector: detailed description of how the attack was carried out
  - Root cause: explanation of the underlying vulnerability or gap
  - Evidence inventory: list of all evidence collected with source references
  - Confidence assessment: overall confidence in the investigation findings
  - Recommendations: prioritized list of remediation and prevention actions

## Output Format

### Investigation Summary

**Scope**
- Triggering Event: <alert_id or event description>
- Time Window: <start_time> to <end_time>
- Primary Entities: <list of entities>
- Data Sources Queried: <list of indices/sources>

**Timeline**
| Timestamp | Source | Entity | Event | MITRE Technique | Significance |
| --- | --- | --- | --- | --- | --- |
| <timestamp> | <source> | <entity> | <event_description> | <technique_id> | <high/medium/low> |

**Affected Entities**
| Entity | Type | Role | Risk Score | Criticality | Status |
| --- | --- | --- | --- | --- | --- |
| <entity_id> | <host/user/ip> | <initial_target/lateral/exfil> | <score> | <level> | <compromised/suspected/cleared> |

**Root Cause**
- Hypothesis: <description>
- Confidence: <0.00 - 1.00>
- Supporting Evidence: <list of key evidence items>
- Alternative Hypotheses: <list if any>

**Recommendations**
1. <immediate_action>
2. <short_term_remediation>
3. <long_term_prevention>

## Examples

### Example 1: Investigating a Confirmed Malware Alert

User query: Investigate alert abc123 which was triaged as a true positive malware infection

Steps:
1. Use the 'security.alerts' tool to fetch the triggering alert and identify primary entities (host, user, file hash).
2. Define scope: 24-hour window around the alert timestamp, primary host and user entities.
3. Use 'platform.core.execute_esql' to query endpoint events on the affected host for process execution, file creation, and network connections.
4. Use 'platform.core.execute_esql' to query authentication logs for the affected user.
5. Use 'platform.core.search' to find related alerts involving the same entities.
6. Use 'platform.core.get_document_by_id' to retrieve specific high-value events by ID for detailed examination.
7. Build timeline from collected evidence, identifying initial access through malware delivery.
8. Correlate process execution with network connections to identify C2 communication.
9. Assess root cause: identify the delivery mechanism (e.g., phishing email, drive-by download).
10. Document findings with timeline, affected entities, and recommendations.

### Example 2: Investigating Lateral Movement

User query: Investigate potential lateral movement from host srv-db-01

Steps:
1. Use 'platform.core.execute_esql' to query authentication events originating from srv-db-01 to other internal hosts.
2. Use 'platform.core.execute_esql' to query network connections from srv-db-01 on SMB, RDP, WMI, and SSH ports.
3. Use the 'security.alerts' tool to find all alerts on srv-db-01 and any hosts it connected to.
4. For each destination host identified, query endpoint events for suspicious process execution following the connection.
5. Use 'platform.core.cases' to check for existing cases involving srv-db-01 or connected hosts.
6. Build a lateral movement map showing the progression from srv-db-01 to other hosts.
7. Correlate timestamps to establish the sequence of lateral movement events.
8. Determine root cause: how was srv-db-01 initially compromised and what credentials were used for lateral movement.
9. Document all affected hosts, compromised accounts, and the lateral movement path.

### Example 3: Investigating Unusual Data Exfiltration

User query: Investigate unusually large data transfers from user jsmith over the last 48 hours

Steps:
1. Define scope: 48-hour window, primary entity user "jsmith" and associated hosts.
2. Use 'platform.core.execute_esql' to query network flow data for high-volume outbound transfers associated with jsmith's hosts.
3. Use 'platform.core.execute_esql' to query endpoint events for file staging activity (compression, encryption, large file copies).
4. Use 'platform.core.execute_esql' to query authentication events for jsmith to identify all sessions and accessed systems.
5. Use the 'security.alerts' tool to check for any data loss prevention (DLP) alerts or exfiltration detection alerts.
6. Use 'platform.core.get_document_by_id' to examine specific high-volume transfer events in detail.
7. Build timeline of data access, staging, and transfer events.
8. Correlate with jsmith's normal behavior baseline to quantify the deviation.
9. Assess whether the transfer was authorized (e.g., legitimate business need) or potentially malicious.
10. Document findings with data volume estimates, destination analysis, and recommendations.

## Best Practices
- Always start with scope definition to prevent investigation sprawl
- Use ES|QL for efficient querying across large datasets; prefer targeted filters over broad scans
- Build the timeline incrementally as evidence is collected; do not wait until all evidence is gathered
- Correlate across at least two independent data sources before drawing conclusions
- Document gaps in visibility explicitly; do not assume absence of evidence means absence of activity
- Assess confidence at each phase and adjust the investigation direction based on findings
- Prioritize evidence collection based on the investigation hypothesis
- When the scope expands beyond initial boundaries, pause and reassess priorities
- Always recommend both immediate actions and long-term preventive measures
- Reference specific event IDs, timestamps, and entity identifiers in all findings
- Keep the investigation narrative coherent; connect each finding to the overall story
- Consider anti-forensic techniques that may have been used to obscure evidence

## Case Creation Guidelines
- Create a case when: the investigation confirms malicious activity, multiple entities are affected, or the incident requires cross-team coordination
- Always attach the investigation timeline and IOC list to the case
- Set appropriate severity and assign to the relevant team
- Link related alerts to the case for full traceability
- Preserve the chain of evidence — note exactly which queries and data sources you used
- When evidence is ambiguous, state the uncertainty clearly rather than drawing unsupported conclusions
`,
    getRegistryTools: () => [
      platformCoreTools.search,
      platformCoreTools.executeEsql,
      platformCoreTools.cases,
      platformCoreTools.getDocumentById,
      platformCoreTools.productDocumentation,
      SECURITY_ALERTS_TOOL_ID,
      SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
      SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
      SECURITY_THREAT_INTEL_ENRICH_TOOL_ID,
      SECURITY_TIMELINE_CREATE_TOOL_ID,
      SECURITY_CASE_MANAGE_TOOL_ID,
      SECURITY_LABS_SEARCH_TOOL_ID,
      SECURITY_MITRE_MAPPING_TOOL_ID,
      SECURITY_ENTITY_STORE_QUERY_TOOL_ID,
    ],
  });
