/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pre-built SOC workflow playbooks as YAML definitions.
 *
 * These can be imported via the Workflows Management UI.
 * Each playbook orchestrates a sequence of AI agent steps to automate
 * common Security Operations Center workflows.
 *
 * All agent steps use structured output schemas so downstream conditions
 * reference typed JSON fields instead of fragile string matching.
 */

/**
 * Incident Response playbook
 *
 * End-to-end pipeline: Triage -> Extract -> Investigate -> Respond -> Approval Gate -> Report.
 * Triggers on high/critical severity alerts and routes through
 * specialized agents for each phase of incident handling.
 * Includes a confidence-gated approval step before executing response actions.
 */
export const INCIDENT_RESPONSE_PLAYBOOK = `\
name: Incident Response
description: End-to-end incident response pipeline - Triage, Investigate, Respond, Report
triggers:
  - type: security.alertCreated
    on:
      condition: 'event.severity: "critical" OR event.severity: "high"'
steps:
  - name: triage
    type: ai.agent
    agent-id: security.triage
    with:
      schema:
        type: object
        properties:
          verdict:
            type: string
            enum: [true_positive, benign_true_positive, false_positive]
            description: Classification of the alert
          confidence:
            type: number
            description: Confidence score 0.0-1.0
          summary:
            type: string
            description: Brief summary of the triage analysis
          key_evidence:
            type: string
            description: Key evidence supporting the verdict
          recommended_action:
            type: string
            description: Suggested next action based on triage
        required: [verdict, confidence, summary, key_evidence, recommended_action]
      message: >
        Triage the following security alert:
        Alert ID: {{ context.event.alert_id }}
        Rule: {{ context.event.rule_name }}
        Severity: {{ context.event.severity }}
        Risk Score: {{ context.event.risk_score }}

        Provide a structured verdict (true_positive, benign_true_positive, false_positive)
        with confidence score, key evidence, and recommended next action.

  - name: extract_triage
    type: data.map
    items: "${{ steps.triage.output.structured_output }}"
    with:
      fields:
        verdict: "${{ item.verdict }}"
        confidence: "${{ item.confidence }}"
        summary: "${{ item.summary }}"
        recommended_action: "${{ item.recommended_action }}"

  - name: investigate
    type: ai.agent
    agent-id: security.investigator
    if: "steps.triage.output.structured_output.verdict == 'true_positive'"
    with:
      schema:
        type: object
        properties:
          timeline:
            type: string
            description: Chronological timeline of the incident
          affected_entities:
            type: array
            items:
              type: string
            description: List of affected entities (hosts, users, IPs)
          attack_vector:
            type: string
            description: Identified attack vector or entry point
          root_cause:
            type: string
            description: Root cause analysis
          severity:
            type: string
            enum: [critical, high, medium, low]
            description: Assessed severity after investigation
        required: [timeline, affected_entities, attack_vector, root_cause, severity]
      message: >
        Investigate the alert that was triaged as a true positive:
        Verdict: {{ steps.triage.output.structured_output.verdict }}
        Confidence: {{ steps.triage.output.structured_output.confidence }}
        Summary: {{ steps.triage.output.structured_output.summary }}
        Key Evidence: {{ steps.triage.output.structured_output.key_evidence }}

        Build a complete timeline, identify affected entities, determine the attack vector,
        analyze root cause, and assess severity.

  - name: respond
    type: ai.agent
    agent-id: security.responder
    if: "steps.investigate.output.structured_output.severity == 'critical' OR steps.investigate.output.structured_output.severity == 'high'"
    with:
      schema:
        type: object
        properties:
          confidence:
            type: number
            description: Confidence score 0.0-1.0 in recommended actions
          recommended_actions:
            type: array
            items:
              type: string
            description: Ordered list of recommended containment and remediation actions
          blast_radius:
            type: string
            description: Assessment of the potential impact of response actions
          rollback_procedures:
            type: string
            description: Steps to roll back response actions if needed
        required: [confidence, recommended_actions, blast_radius, rollback_procedures]
      message: >
        Based on the investigation findings, recommend containment actions:
        Severity: {{ steps.investigate.output.structured_output.severity }}
        Attack Vector: {{ steps.investigate.output.structured_output.attack_vector }}
        Root Cause: {{ steps.investigate.output.structured_output.root_cause }}
        Affected Entities: {{ steps.investigate.output.structured_output.affected_entities }}

        Provide confidence-scored recommendations with blast radius assessment
        and rollback procedures.

  - name: approval_gate
    type: console.log
    if: "steps.respond.output.structured_output.confidence < 0.70"
    with:
      message: >
        HUMAN APPROVAL REQUIRED: Response actions recommended with confidence
        {{ steps.respond.output.structured_output.confidence }}.
        Actions: {{ steps.respond.output.structured_output.recommended_actions }}
        Blast Radius: {{ steps.respond.output.structured_output.blast_radius }}
        Please review and approve before execution.

  - name: report
    type: ai.agent
    agent-id: security.reporter
    with:
      schema:
        type: object
        properties:
          report_markdown:
            type: string
            description: Full incident report in Markdown format
          executive_summary:
            type: string
            description: Executive-level summary of the incident
          case_id:
            type: string
            description: Generated case identifier for tracking
        required: [report_markdown, executive_summary, case_id]
      message: >
        Generate an incident report based on the completed workflow steps.

        Triage findings:
        Verdict: {{ steps.triage.output.structured_output.verdict | default: "unknown" }}
        Confidence: {{ steps.triage.output.structured_output.confidence | default: "N/A" }}
        Summary: {{ steps.triage.output.structured_output.summary | default: "No triage summary available." }}

        Investigation findings (if investigation was performed):
        Severity: {{ steps.investigate.output.structured_output.severity | default: "N/A" }}
        Timeline: {{ steps.investigate.output.structured_output.timeline | default: "Investigation was not performed - alert was classified as false positive or benign." }}
        Root Cause: {{ steps.investigate.output.structured_output.root_cause | default: "N/A" }}
        Affected Entities: {{ steps.investigate.output.structured_output.affected_entities | default: "N/A" }}

        Response recommendations (if response was needed):
        Actions: {{ steps.respond.output.structured_output.recommended_actions | default: "No response actions were recommended for this incident." }}
        Confidence: {{ steps.respond.output.structured_output.confidence | default: "N/A" }}
        Rollback: {{ steps.respond.output.structured_output.rollback_procedures | default: "N/A" }}

        Create both executive and technical summaries. If investigation or response
        sections show default values, note that in the report and explain why those phases were skipped.
`;

/**
 * Full Investigation playbook
 *
 * Deep investigation pipeline: Investigate -> Correlate -> MITRE Map -> Report.
 * Designed for manual invocation when an analyst needs a thorough
 * investigation with cross-campaign correlation and ATT&CK mapping.
 */
export const FULL_INVESTIGATION_PLAYBOOK = `\
name: Full Investigation
description: Deep investigation pipeline - Investigate, Correlate, MITRE Map, Report
steps:
  - name: investigate
    type: ai.agent
    agent-id: security.investigator
    with:
      schema:
        type: object
        properties:
          timeline:
            type: string
            description: Chronological timeline of the incident
          affected_entities:
            type: array
            items:
              type: string
            description: List of affected entities
          root_cause:
            type: string
            description: Root cause analysis
          confidence:
            type: number
            description: Confidence score 0.0-1.0 in findings
        required: [timeline, affected_entities, root_cause, confidence]
      message: >
        Conduct a deep investigation of the following finding:
        {{ context.event.alert_id }}

        Build timeline, identify affected entities, and analyze root cause.

  - name: correlate
    type: ai.agent
    agent-id: security.correlator
    with:
      schema:
        type: object
        properties:
          campaigns:
            type: array
            items:
              type: string
            description: Identified related campaigns
          related_findings:
            type: string
            description: Summary of related findings across entity dimensions
          attack_chain:
            type: string
            description: Reconstructed attack chain from correlated events
        required: [campaigns, related_findings, attack_chain]
      message: >
        Analyze the investigation findings for cross-campaign correlation:
        Timeline: {{ steps.investigate.output.structured_output.timeline }}
        Affected Entities: {{ steps.investigate.output.structured_output.affected_entities }}
        Root Cause: {{ steps.investigate.output.structured_output.root_cause }}

        Look for related activity across entity dimensions and identify campaign patterns.

  - name: mitre_analysis
    type: ai.agent
    agent-id: security.mitre_analyst
    with:
      schema:
        type: object
        properties:
          covered_techniques:
            type: array
            items:
              type: string
            description: MITRE ATT&CK techniques observed in this incident
          gaps:
            type: array
            items:
              type: string
            description: Detection gaps identified from the attack chain
          recommendations:
            type: string
            description: Recommendations for improving detection coverage
        required: [covered_techniques, gaps, recommendations]
      message: >
        Map the correlated findings to MITRE ATT&CK:
        Attack Chain: {{ steps.correlate.output.structured_output.attack_chain }}
        Campaigns: {{ steps.correlate.output.structured_output.campaigns }}
        Related Findings: {{ steps.correlate.output.structured_output.related_findings }}

        Identify coverage gaps and recommend detection improvements.

  - name: report
    type: ai.agent
    agent-id: security.reporter
    with:
      schema:
        type: object
        properties:
          report_markdown:
            type: string
            description: Full investigation report in Markdown format
        required: [report_markdown]
      message: >
        Generate a comprehensive investigation report:
        - Investigation Timeline: {{ steps.investigate.output.structured_output.timeline }}
        - Affected Entities: {{ steps.investigate.output.structured_output.affected_entities }}
        - Root Cause: {{ steps.investigate.output.structured_output.root_cause }}
        - Campaigns: {{ steps.correlate.output.structured_output.campaigns }}
        - Attack Chain: {{ steps.correlate.output.structured_output.attack_chain }}
        - MITRE Techniques: {{ steps.mitre_analysis.output.structured_output.covered_techniques }}
        - Detection Gaps: {{ steps.mitre_analysis.output.structured_output.gaps }}
        - Recommendations: {{ steps.mitre_analysis.output.structured_output.recommendations }}
`;

/**
 * Proactive Threat Hunt playbook
 *
 * Automated weekly hunting: Hunt -> Correlate -> Create Rules.
 * Scheduled to run every 7 days, scanning for unusual patterns
 * and recommending new detection rules for uncovered techniques.
 */
export const PROACTIVE_THREAT_HUNT_PLAYBOOK = `\
name: Proactive Threat Hunt
description: Automated weekly threat hunting - Hunt, Correlate, Create Rules
triggers:
  - type: schedule
    on:
      interval: 7d
steps:
  - name: hunt
    type: ai.agent
    agent-id: security.agent
    with:
      schema:
        type: object
        properties:
          findings:
            type: array
            items:
              type: object
              properties:
                description:
                  type: string
                severity:
                  type: string
                  enum: [critical, high, medium, low]
                entities:
                  type: array
                  items:
                    type: string
            description: List of findings from the threat hunt
          severity:
            type: string
            enum: [critical, high, medium, low, none]
            description: Overall severity of hunt findings
          hunt_areas_searched:
            type: array
            items:
              type: string
            description: Areas that were searched during the hunt
        required: [findings, severity, hunt_areas_searched]
      message: >
        Conduct a proactive threat hunt across the environment.
        Look for:
        1. Unusual authentication patterns in the last 7 days
        2. Suspicious process execution chains
        3. Anomalous network connections to rare external domains
        4. Living-off-the-land (LOTL) technique indicators

        Use the alerts and entity risk tools to identify high-risk entities.
        Return structured findings with severity assessments.

  - name: correlate
    type: ai.agent
    agent-id: security.correlator
    if: "steps.hunt.output.structured_output.findings | size > 0"
    with:
      schema:
        type: object
        properties:
          patterns:
            type: array
            items:
              type: object
              properties:
                pattern_name:
                  type: string
                description:
                  type: string
                confidence:
                  type: number
            description: Identified patterns across hunt findings
          campaign_assessment:
            type: string
            description: Assessment of whether findings constitute a coordinated campaign
        required: [patterns, campaign_assessment]
      message: >
        Correlate the threat hunt findings across campaigns:
        Findings: {{ steps.hunt.output.structured_output.findings }}
        Overall Severity: {{ steps.hunt.output.structured_output.severity }}
        Areas Searched: {{ steps.hunt.output.structured_output.hunt_areas_searched }}

        Identify patterns, group related findings, and assess if they constitute a campaign.

  - name: create_rules
    type: ai.agent
    agent-id: security.mitre_analyst
    if: "steps.correlate.output.structured_output.patterns | size > 0"
    with:
      message: >
        Based on the hunt and correlation findings, recommend new detection rules:
        Patterns: {{ steps.correlate.output.structured_output.patterns }}
        Campaign Assessment: {{ steps.correlate.output.structured_output.campaign_assessment }}

        Identify MITRE techniques that need coverage and create ES|QL detection rules.
`;

/**
 * Detection Coverage Audit playbook
 *
 * Monthly MITRE ATT&CK coverage audit: Analyze -> Generate Rules.
 * Scheduled to run every 30 days, mapping existing detection rules
 * to MITRE techniques and generating rules for the highest-priority gaps.
 */
export const DETECTION_COVERAGE_AUDIT_PLAYBOOK = `\
name: Detection Coverage Audit
description: Monthly MITRE ATT&CK coverage audit - Analyze, Generate Rules
triggers:
  - type: schedule
    on:
      interval: 30d
steps:
  - name: audit
    type: ai.agent
    agent-id: security.mitre_analyst
    with:
      schema:
        type: object
        properties:
          total_rules:
            type: number
            description: Total number of active detection rules
          covered_techniques:
            type: array
            items:
              type: string
            description: MITRE ATT&CK techniques with existing detection coverage
          uncovered_techniques:
            type: array
            items:
              type: object
              properties:
                technique_id:
                  type: string
                name:
                  type: string
                priority:
                  type: string
                  enum: [critical, high, medium, low]
            description: MITRE ATT&CK techniques lacking detection coverage
          coverage_percentage:
            type: number
            description: Percentage of MITRE techniques covered (0-100)
        required: [total_rules, covered_techniques, uncovered_techniques, coverage_percentage]
      message: >
        Conduct a comprehensive MITRE ATT&CK detection coverage audit:
        1. Query all active detection rules
        2. Map rules to MITRE techniques
        3. Identify coverage gaps
        4. Prioritize gaps by severity and prevalence

        Focus on critical and high-severity gaps first.

  - name: generate_rules
    type: ai.agent
    agent-id: security.mitre_analyst
    if: "steps.audit.output.structured_output.uncovered_techniques | size > 0"
    with:
      schema:
        type: object
        properties:
          created_rules:
            type: array
            items:
              type: object
              properties:
                rule_name:
                  type: string
                technique_id:
                  type: string
                esql_query:
                  type: string
                severity:
                  type: string
                  enum: [critical, high, medium, low]
            description: Generated detection rules for uncovered techniques
          rule_count:
            type: number
            description: Number of rules generated
        required: [created_rules, rule_count]
      message: >
        Based on the coverage audit, generate detection rules for the top priority gaps:
        Coverage: {{ steps.audit.output.structured_output.coverage_percentage }}%
        Total Rules: {{ steps.audit.output.structured_output.total_rules }}
        Uncovered Techniques: {{ steps.audit.output.structured_output.uncovered_techniques }}

        Create ES|QL detection rules for the top 5 uncovered techniques,
        prioritizing critical and high severity gaps.
`;

/** All pre-built playbooks for easy iteration */
export const SOC_PLAYBOOKS = [
  { name: 'incident_response', yaml: INCIDENT_RESPONSE_PLAYBOOK },
  { name: 'full_investigation', yaml: FULL_INVESTIGATION_PLAYBOOK },
  { name: 'proactive_threat_hunt', yaml: PROACTIVE_THREAT_HUNT_PLAYBOOK },
  { name: 'detection_coverage_audit', yaml: DETECTION_COVERAGE_AUDIT_PLAYBOOK },
] as const;
