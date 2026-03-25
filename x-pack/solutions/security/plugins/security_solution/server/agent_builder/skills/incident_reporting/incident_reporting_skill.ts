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
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_MITRE_MAPPING_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_REPORT_GENERATE_TOOL_ID,
  SECURITY_CASE_MANAGE_TOOL_ID,
} from '../../tools';

export const getIncidentReportingSkill = () =>
  defineSkillType({
    id: 'incident-reporting',
    name: 'incident-reporting',
    basePath: 'skills/security/alerts',
    experimental: true,
    description:
      'Guide to generating structured incident reports: executive summaries, technical timelines, MITRE ATT&CK mappings, impact assessments, and recommended follow-up actions with optional compliance framework mappings (NIST, ISO 27001).',
    content: `# Incident Reporting Guide

## When to Use This Skill

Use this skill when:
- A user needs to generate a formal incident report after an investigation has been completed
- A user requests an executive summary of a security incident for leadership
- A user needs a technical incident report for the SOC team or incident responders
- A user requires a compliance-oriented report mapping the incident to regulatory frameworks (NIST CSF, ISO 27001)
- A user wants to document lessons learned and recommended improvements after an incident
- A user needs to attach a structured report to an existing Kibana case

## Related Skills

Before using this skill, you should have used:
- '~/skills/security/alerts/alert-triage' to classify the alerts involved in the incident
- '~/skills/security/alerts/investigation' to conduct the investigation and gather evidence

After using this skill, you may want to use:
- '~/skills/security/alerts/response-recommendation' to include specific containment recommendations in the report

## Report Structure

### Section 1: Executive Summary
- **Purpose**: Provide a concise, non-technical overview suitable for executive leadership
- **Length**: 1-2 paragraphs (150-300 words)
- **Content**:
  - What happened: brief description of the incident type and scope
  - When it happened: incident timeline window (first detection to containment)
  - Who was affected: impacted business units, users, customers, or systems
  - Business impact: quantified or estimated impact (data exposed, downtime, financial loss)
  - Current status: contained, eradicated, recovered, or ongoing
  - Key decisions needed: any pending actions requiring leadership approval
- **Tone**: factual, objective, avoiding jargon; translate technical findings into business risk

### Section 2: Incident Classification
- **Incident ID**: unique identifier for tracking
- **Classification**: data breach, malware infection, unauthorized access, denial of service, insider threat, supply chain compromise, or other
- **Severity**: critical (P1), high (P2), medium (P3), low (P4)
  - P1: active compromise with confirmed data loss or system destruction
  - P2: confirmed compromise with potential data exposure, no confirmed loss
  - P3: suspicious activity requiring investigation, limited impact
  - P4: low-impact incident with minimal risk, primarily for documentation
- **Detection method**: automated detection rule, manual analyst review, user report, external notification, threat intelligence
- **MITRE ATT&CK mapping**: list all observed tactics and techniques with IDs

### Section 3: Technical Timeline
- **Format**: chronological table of events from initial compromise to current status
- **Required columns**: timestamp, event type, source, entity, description, MITRE technique
- **Key milestones to include**:
  - Initial compromise: the earliest known malicious activity
  - Foothold establishment: persistence mechanism deployed
  - Lateral movement: attacker pivoting to additional systems
  - Data access: sensitive data viewed or copied
  - Exfiltration: data transferred outside the environment
  - Detection: when the activity was first detected
  - Containment: when containment actions were initiated
  - Eradication: when the threat was fully removed
  - Recovery: when systems were restored to normal operation
- **Timeline gaps**: explicitly note periods with no visibility or data gaps

### Section 4: Affected Entities and Impact Assessment
- **Entity inventory**: complete list of affected entities with details
  - Hosts: hostname, IP, OS, role, business function, compromise status
  - Users: username, role, department, account status, credential exposure
  - Services: service name, type, consumers, SLA impact
  - Data: data classification, volume, sensitivity, exposure type
- **Impact categories**:
  - **Confidentiality**: was sensitive data exposed, accessed, or exfiltrated?
  - **Integrity**: was data or system configuration modified by the attacker?
  - **Availability**: were systems taken offline or degraded?
- **Business impact assessment**:
  - Operational disruption: downtime hours, affected processes
  - Data exposure: records exposed, PII/PHI/PCI data types
  - Financial impact: estimated cost (incident response, remediation, regulatory fines, lost revenue)
  - Reputational impact: customer notification required, media exposure risk

### Section 5: MITRE ATT&CK Mapping
- **Purpose**: map all observed attacker techniques to the MITRE ATT&CK framework
- **Format**: table with kill chain progression

| Kill Chain Phase | Tactic | Technique | Sub-Technique | Observed Evidence |
| --- | --- | --- | --- | --- |
| Initial Access | TA0001 | T1566 Phishing | T1566.001 Spearphishing Attachment | Malicious email with PDF attachment |
| Execution | TA0002 | T1059 Command and Scripting Interpreter | T1059.001 PowerShell | Encoded PowerShell command executed |
| ... | ... | ... | ... | ... |

- **Coverage notes**: for each technique, note whether an existing detection rule covered it or if it was a gap
- **Navigator export**: recommend generating a MITRE ATT&CK Navigator layer for visual representation

### Section 6: Root Cause and Contributing Factors
- **Root cause**: the primary vulnerability or gap that enabled the incident
- **Contributing factors**: additional conditions that facilitated or worsened the incident
  - Technical factors: unpatched systems, misconfigurations, missing controls
  - Process factors: delayed response, lack of procedures, communication gaps
  - Human factors: social engineering success, policy violations, training gaps
- **Detection assessment**: why the incident was or was not detected promptly
  - Existing detection rules that fired
  - Detection gaps that were identified
  - Mean time to detect (MTTD)
  - Mean time to respond (MTTR)

### Section 7: Recommended Follow-Up Actions
- **Immediate actions** (0-48 hours):
  - Remaining containment steps
  - Credential rotation requirements
  - System isolation or network segmentation changes
  - Evidence preservation tasks
- **Short-term remediation** (1-2 weeks):
  - Vulnerability patching
  - Configuration hardening
  - Detection rule creation or tuning
  - Access control adjustments
- **Long-term improvements** (1-3 months):
  - Architecture changes
  - Security control investments
  - Process improvements
  - Training and awareness programs
  - Policy updates

### Section 8: Compliance Framework Mappings (Optional)

#### NIST Cybersecurity Framework (CSF) Mapping
- Map incident findings and recommendations to NIST CSF functions:
  - **Identify (ID)**: asset management, risk assessment gaps discovered
  - **Protect (PR)**: access control, data security, protective technology gaps
  - **Detect (DE)**: detection process, continuous monitoring gaps
  - **Respond (RS)**: response planning, communications, analysis, mitigation gaps
  - **Recover (RC)**: recovery planning, improvements, communications gaps
- Reference specific NIST CSF subcategories (e.g., PR.AC-1, DE.CM-1)

#### ISO 27001 Control Mapping
- Map incident findings to relevant ISO 27001:2022 controls:
  - **A.5 Organizational controls**: policies, roles, responsibilities
  - **A.6 People controls**: screening, awareness, training
  - **A.7 Physical controls**: physical security perimeters, equipment
  - **A.8 Technological controls**: endpoint, network, application security
- Reference specific control numbers (e.g., A.8.7 Protection against malware, A.8.16 Monitoring activities)

#### Additional Frameworks
- If requested, map to additional frameworks:
  - NIST SP 800-53: security and privacy controls
  - CIS Controls: prioritized cybersecurity actions
  - PCI DSS: payment card industry requirements
  - HIPAA: healthcare data protection requirements

## Audience Adaptation

### Executive Report
- Emphasize business impact and risk in non-technical language
- Lead with the executive summary and impact assessment
- Minimize technical details; reference the full report for depth
- Include clear decision points and resource requests
- Use visual elements: severity indicators, impact ratings, status indicators

### Technical Report
- Include full technical timeline with event-level detail
- Provide complete MITRE ATT&CK mapping with evidence references
- Include specific indicators of compromise (IOCs) for detection teams
- Detail the exact attack chain and techniques used
- Reference specific log entries, alert IDs, and event IDs

### Compliance Report
- Lead with regulatory context and reporting obligations
- Map all findings to the requested compliance framework
- Include control gap analysis and remediation mapping
- Document evidence of compliance or non-compliance
- Note any mandatory notification timelines and their status

## Output Format

### Full Incident Report Template

---

# Incident Report: <incident_title>

**Report ID**: <report_id>
**Date Generated**: <date>
**Classification**: <incident_type>
**Severity**: <P1-P4>
**Status**: <contained/eradicated/recovered/ongoing>

## Executive Summary
<1-2 paragraphs summarizing the incident for leadership>

## Incident Classification
| Field | Value |
| --- | --- |
| Incident ID | <id> |
| Type | <classification> |
| Severity | <P1-P4> |
| Detection Method | <method> |
| MITRE Tactics | <list> |
| Time to Detect | <MTTD> |
| Time to Respond | <MTTR> |

## Technical Timeline
| Timestamp | Event Type | Source | Entity | Description | MITRE Technique |
| --- | --- | --- | --- | --- | --- |
| <timestamp> | <type> | <source> | <entity> | <description> | <technique> |

## Affected Entities
| Entity | Type | Role | Status | Impact |
| --- | --- | --- | --- | --- |
| <entity> | <type> | <role> | <status> | <impact> |

## Impact Assessment
| Category | Impact | Details |
| --- | --- | --- |
| Confidentiality | <high/medium/low/none> | <details> |
| Integrity | <high/medium/low/none> | <details> |
| Availability | <high/medium/low/none> | <details> |

## MITRE ATT&CK Mapping
<kill chain table as described above>

## Root Cause
<root cause analysis with contributing factors>

## Recommendations
### Immediate (0-48h)
1. <action>
### Short-term (1-2 weeks)
1. <action>
### Long-term (1-3 months)
1. <action>

## Compliance Mapping (if requested)
<framework-specific mapping tables>

---

## Examples

### Example 1: Post-Investigation Executive Report

User query: Generate an executive incident report for the investigation on host web-server-01

Steps:
1. Use 'platform.core.search' to retrieve the investigation findings, alerts, and timeline data for web-server-01.
2. Use 'platform.core.cases' to check for an existing case and retrieve any documented findings.
3. Compile the executive summary focusing on business impact and current status.
4. Build the impact assessment based on affected entities and data exposure.
5. Create the MITRE ATT&CK mapping from the investigation's technique observations.
6. Generate recommendations prioritized by urgency and business impact.
7. Attach the report to the existing case using the cases tool.

### Example 2: Compliance-Focused Report with NIST Mapping

User query: Generate a NIST CSF-mapped incident report for the phishing campaign that targeted our finance team

Steps:
1. Use 'platform.core.search' to retrieve all alerts and investigation data related to the phishing campaign.
2. Build the full technical timeline from initial phishing email to containment.
3. Map each finding and recommendation to the relevant NIST CSF functions and subcategories.
4. Identify NIST CSF control gaps exposed by the incident.
5. Generate remediation recommendations tied to specific NIST CSF subcategories.
6. Format the report for compliance review with framework references.

### Example 3: Technical Report for SOC Team

User query: Create a detailed technical incident report for the malware infection on endpoints in the engineering department

Steps:
1. Use 'platform.core.search' to retrieve all alerts across engineering department hosts.
2. Use 'platform.core.cases' to retrieve the investigation case and documented evidence.
3. Build a detailed technical timeline with process-level events and network connections.
4. List all IOCs: file hashes, C2 domains, IP addresses, mutexes.
5. Create the full MITRE ATT&CK kill chain mapping with evidence for each technique.
6. Include specific detection rule IDs that fired and gaps that were identified.
7. Generate technical recommendations for detection and hardening improvements.

## Best Practices
- Always pull evidence from the actual investigation before generating a report; never fabricate or assume details
- Use the incident severity classification consistently across all report sections
- Include specific metrics: MTTD, MTTR, number of affected entities, data volume
- Clearly distinguish between confirmed facts and analyst assessments in the report
- When mapping to compliance frameworks, reference specific control numbers and subcategories
- Adapt the report depth and language to the intended audience
- Always include a recommendations section with prioritized, actionable items
- Attach the report to the relevant Kibana case for auditability and tracking
- Include a "Lessons Learned" section for post-incident reviews
- Version the report if it will be updated as new information becomes available
- Do not include raw log data in executive reports; reference it in technical appendices
- Ensure all timestamps use a consistent timezone (preferably UTC)

## Report Generation Process
1. Gather all available investigation context: alerts, investigation findings, correlation results, response actions
2. Query attack discovery for additional context that may have been missed
3. Map all findings to MITRE ATT&CK techniques for standardized reporting
4. Check Elastic Security Labs for relevant published threat research to cite
5. Generate the report in the requested format
6. Attach the completed report to the associated case
7. Update the case status and add any follow-up actions as case comments

## Accuracy Guidelines
- Accuracy is paramount — never speculate or include unverified information in reports
- Clearly distinguish between confirmed facts, high-confidence assessments, and hypotheses
- Always cite the data source for every claim (which index, which alert, which query)
- Reports should be self-contained — a reader should understand the full context without external references
- Use consistent terminology throughout the report
- When generating reports for regulatory purposes, consult product documentation for compliance-specific guidance
`,
    getRegistryTools: () => [
      platformCoreTools.search,
      platformCoreTools.cases,
      platformCoreTools.productDocumentation,
      SECURITY_ALERTS_TOOL_ID,
      SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
      SECURITY_MITRE_MAPPING_TOOL_ID,
      SECURITY_LABS_SEARCH_TOOL_ID,
      SECURITY_REPORT_GENERATE_TOOL_ID,
      SECURITY_CASE_MANAGE_TOOL_ID,
    ],
  });
