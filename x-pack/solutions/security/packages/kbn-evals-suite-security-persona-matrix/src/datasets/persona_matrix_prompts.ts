/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PersonaMatrixExampleInput extends Record<string, unknown> {
  question: string;
  /** Inline attachment content sent to the converse API alongside the question. */
  attachment?: string;
}

export interface PersonaMatrixExampleOutput {
  reference: string;
  tool_sequence?: string[];
  primary_skill?: string;
}

export interface PersonaMatrixExample {
  id: string;
  category: string;
  variant: 'A' | 'B' | 'C';
  description: string;
  input: PersonaMatrixExampleInput;
  output: PersonaMatrixExampleOutput;
  metadata: {
    expectedSkill: string;
    expectedTools?: string[];
    allowSkills?: string[];
    expectedAttachmentReads?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
  };
}

export const PERSONA_MATRIX_EXAMPLES: PersonaMatrixExample[] = [
  {
    id: 'alert-analysis-a',
    category: 'alert-analysis',
    variant: 'A',
    description: 'Single alert triage and disposition',
    input: {
      question:
        "Take a look at this alert and tell me what's going on. " +
        "Is it something I should worry about, and what's your recommended disposition?",
      attachment:
        'Alert Details:\n' +
        '  Rule: Suspicious BluetoothService Side-Load\n' +
        '  Host: srv-win-defend-01\n' +
        '  User: SYSTEM\n' +
        '  Severity: High (risk: 73)\n' +
        '  Process: BluetoothService.exe\n' +
        '  File loaded: log.dll (sha256: 275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f)\n' +
        '  MITRE: T1574.002 (DLL Side-Loading)\n' +
        '  Timestamp: 2026-07-21T08:00:00Z\n' +
        '  Status: Open',
    },
    output: { reference: 'alert-analysis-a expected response' },
    metadata: {
      expectedSkill: 'alert-analysis',
      expectedTools: ['attachment_read', 'entity_risk_score', 'threat_intel_lookup'],
      severity: 'high',
      tags: ['triage', 'single-alert'],
    },
  },
  {
    id: 'alert-analysis-b',
    category: 'alert-analysis',
    variant: 'B',
    description: 'Host queue triage and entity correlation',
    input: {
      question:
        "We've got alerts firing on srv-win-defend-01. Triage what's in the alert queue " +
        'for that host — are these related to the same incident, and which entities do they share? ' +
        'Give me a disposition.',
    },
    output: { reference: 'alert-analysis-b expected response' },
    metadata: {
      expectedSkill: 'alert-analysis',
      expectedTools: ['attachment_read', 'entity_risk_score', 'threat_intel_lookup'],
      severity: 'high',
      tags: ['triage', 'host-queue'],
    },
  },
  {
    id: 'alert-analysis-c',
    category: 'alert-analysis',
    variant: 'C',
    description: 'Noise evaluation with threat intel',
    input: {
      question:
        "I'm seeing noise on srv-win-defend-01. Is this a real threat or a false positive? " +
        'Pull in any threat intel that would help me decide.',
    },
    output: { reference: 'alert-analysis-c expected response' },
    metadata: {
      expectedSkill: 'alert-analysis',
      expectedTools: ['threat_intel_lookup', 'entity_risk_score'],
      severity: 'medium',
      tags: ['triage', 'noise'],
    },
  },
  {
    id: 'detection-rule-edit-a',
    category: 'detection-rule-edit',
    variant: 'A',
    description: 'Construct rule for DLL side-loading',
    input: {
      question:
        'Build me a detection rule that catches BluetoothService.exe loading log.dll from ' +
        'a non-standard path. Map it to the relevant MITRE ATT&CK technique and set severity to high.',
    },
    output: { reference: 'detection-rule-edit-a expected response' },
    metadata: {
      expectedSkill: 'detection-rule-creation',
      expectedTools: ['detection_rule_create', 'mitre_lookup'],
      severity: 'high',
      tags: ['rule-creation', 'mitre'],
    },
  },
  {
    id: 'detection-rule-edit-b',
    category: 'detection-rule-edit',
    variant: 'B',
    description: 'ES|QL rule for known IOA pattern',
    input: {
      question:
        'I want a new rule to detect the Chrysalis side-loading pattern we just hunted down. ' +
        'Draft it as an ES|QL rule with appropriate tags and threat mappings.',
    },
    output: { reference: 'detection-rule-edit-b expected response' },
    metadata: {
      expectedSkill: 'detection-rule-creation',
      expectedTools: ['detection_rule_create', 'generate_esql'],
      severity: 'high',
      tags: ['rule-creation', 'esql'],
    },
  },
  {
    id: 'detection-rule-edit-c',
    category: 'detection-rule-edit',
    variant: 'C',
    description: 'Gap closure with research grounding',
    input: {
      question:
        "We've confirmed a threat where BluetoothService.exe on srv-win-defend-01 " +
        'side-loads log.dll (sha256: 275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f) ' +
        'from C:\\Users\\Public\\. Help me close the detection gap — create a rule ' +
        'so we catch this automatically next time, and ground it in the relevant Security Labs research.',
    },
    output: { reference: 'detection-rule-edit-c expected response' },
    metadata: {
      expectedSkill: 'detection-rule-creation',
      expectedTools: ['detection_rule_create', 'mitre_lookup'],
      severity: 'high',
      tags: ['rule-creation', 'research'],
    },
  },
  {
    id: 'entity-analytics-a',
    category: 'entity-analytics',
    variant: 'A',
    description: 'Host risk and behavior profile',
    input: {
      question:
        'Show me what we know about the host srv-win-defend-01 — its risk score, ' +
        'asset criticality, and any unusual behavior tied to it.',
    },
    output: { reference: 'entity-analytics-a expected response' },
    metadata: {
      expectedSkill: 'entity-analytics',
      expectedTools: ['entity_risk_score', 'entity_summary'],
      severity: 'medium',
      tags: ['entity', 'host-profile'],
    },
  },
  {
    id: 'entity-analytics-b',
    category: 'entity-analytics',
    variant: 'B',
    description: 'Top riskiest entities in environment',
    input: {
      question:
        'Which hosts and users in my environment are the riskiest right now? Profile the top one.',
    },
    output: { reference: 'entity-analytics-b expected response' },
    metadata: {
      expectedSkill: 'entity-analytics',
      expectedTools: ['entity_risk_score', 'entity_summary'],
      severity: 'medium',
      tags: ['entity', 'risk-ranking'],
    },
  },
  {
    id: 'entity-analytics-c',
    category: 'entity-analytics',
    variant: 'C',
    description: 'Entity history and escalation signal',
    input: {
      question:
        "The SYSTEM user on srv-win-defend-01 keeps coming up. What's this entity's history " +
        'and risk profile — should I be escalating based on the entity itself?',
    },
    output: { reference: 'entity-analytics-c expected response' },
    metadata: {
      expectedSkill: 'entity-analytics',
      expectedTools: ['entity_risk_score', 'entity_summary'],
      severity: 'medium',
      tags: ['entity', 'history'],
    },
  },
  {
    id: 'multi-step-a',
    category: 'multi-step',
    variant: 'A',
    description: 'Triaged alert → VT → on-call → Slack',
    input: {
      question:
        'Analyze this alert. If it involves a file hash, verify the hash on VirusTotal. ' +
        'Then check who is on call, and create a Slack channel with the on-call analyst that ' +
        'includes your findings from this alert (verdict, IOCs, and the on-call owner). ' +
        'Walk me through each step as you go.',
      attachment:
        'Alert Details:\n' +
        '  Rule: Suspicious BluetoothService Side-Load\n' +
        '  Host: srv-win-defend-01\n' +
        '  User: SYSTEM\n' +
        '  Severity: High (risk: 73)\n' +
        '  File hash (sha256): 275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f\n' +
        '  Process: BluetoothService.exe loaded log.dll from C:\\Users\\Public\\\n' +
        '  MITRE: T1574.002 (DLL Side-Loading)\n' +
        '  Timestamp: 2026-07-21T08:00:00Z',
    },
    output: { reference: 'multi-step-a expected response' },
    metadata: {
      expectedSkill: 'security-multi-step',
      allowSkills: ['alert-analysis', 'threat-intel', 'workflow-execute'],
      expectedTools: [
        'attachment_read',
        'virustotal_lookup',
        'on_call_lookup',
        'workflow_execute_step',
      ],
      severity: 'critical',
      tags: ['multi-step', 'orchestration'],
    },
  },
  {
    id: 'multi-step-b',
    category: 'multi-step',
    variant: 'B',
    description: 'Full incident response: VT → on-call → case → Slack',
    input: {
      question:
        "There's a confirmed Chrysalis incident on srv-win-defend-01 — BluetoothService.exe " +
        'is side-loading log.dll (sha256: 275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f). ' +
        'Run the full response: ' +
        'verify the loader hash on VirusTotal, check the on-call schedule, open a critical Security case, ' +
        'then spin up a Slack incident channel with the on-call responder and post the case summary and top IOCs. ' +
        'Report what you did at each step.',
    },
    output: { reference: 'multi-step-b expected response' },
    metadata: {
      expectedSkill: 'security-multi-step',
      allowSkills: ['alert-analysis', 'threat-intel', 'case-management', 'workflow-execute'],
      expectedTools: [
        'virustotal_lookup',
        'on_call_lookup',
        'create_case',
        'workflow_execute_step',
      ],
      severity: 'critical',
      tags: ['multi-step', 'incident-response'],
    },
  },
  {
    id: 'multi-step-c',
    category: 'multi-step',
    variant: 'C',
    description: 'End-to-end triage with conditional escalation',
    input: {
      question:
        'Triage srv-win-defend-01 end-to-end: pull the alerts for that host, hunt for the ' +
        "Chrysalis IOCs (BluetoothService.exe, log.dll, C2 domains) to confirm, check who's on call, " +
        "and if it's a true positive, create a Slack channel with the on-call analyst summarizing " +
        "the confirmed findings and recommended actions. Don't escalate if it's benign.",
    },
    output: { reference: 'multi-step-c expected response' },
    metadata: {
      expectedSkill: 'security-multi-step',
      allowSkills: ['alert-analysis', 'threat-intel', 'workflow-execute'],
      expectedTools: [
        'attachment_read',
        'entity_risk_score',
        'threat_intel_lookup',
        'on_call_lookup',
        'workflow_execute_step',
      ],
      severity: 'critical',
      tags: ['multi-step', 'conditional-escalation'],
    },
  },
  {
    id: 'threat-hunting-a',
    category: 'threat-hunting',
    variant: 'A',
    description: 'Hypothesis-driven DLL side-loading hunt',
    input: {
      question:
        "I have a hypothesis that there's a malicious DLL being side-loaded on our Windows fleet. " +
        'Hunt for evidence of log.dll across process and file telemetry and tell me what you find.',
    },
    output: { reference: 'threat-hunting-a expected response' },
    metadata: {
      expectedSkill: 'threat-intel-hunt',
      expectedTools: ['generate_esql', 'index_search'],
      severity: 'high',
      tags: ['hunt', 'hypothesis-driven'],
    },
  },
  {
    id: 'threat-hunting-b',
    category: 'threat-hunting',
    variant: 'B',
    description: 'IOA-based Chrysalis hunt on specific host',
    input: {
      question:
        'Hunt for signs of the Chrysalis backdoor on srv-win-defend-01 — look for BluetoothService.exe ' +
        'execution, suspicious DLL loads, and any C2 network or DNS activity. Walk me through what you discover.',
    },
    output: { reference: 'threat-hunting-b expected response' },
    metadata: {
      expectedSkill: 'threat-intel-hunt',
      expectedTools: ['generate_esql', 'index_search', 'threat_intel_lookup'],
      severity: 'high',
      tags: ['hunt', 'ioc-driven'],
    },
  },
  {
    id: 'threat-hunting-c',
    category: 'threat-hunting',
    variant: 'C',
    description: 'Baseline-driven anomaly detection',
    input: {
      question:
        "Something feels off on srv-win-defend-01 but I don't have a specific IOC. " +
        'Establish a baseline of normal process activity for that host and surface anything anomalous.',
    },
    output: { reference: 'threat-hunting-c expected response' },
    metadata: {
      expectedSkill: 'threat-intel-hunt',
      expectedTools: ['generate_esql', 'index_search'],
      severity: 'medium',
      tags: ['hunt', 'baseline'],
    },
  },
  {
    id: 'workflow-authoring-a',
    category: 'workflow-authoring',
    variant: 'A',
    description: 'Slack triage summary workflow (parameterized)',
    input: {
      question:
        'Use the workflow authoring skill to author a runnable Elastic workflow (YAML) that posts ' +
        "a Chrysalis triage summary to Slack. Give it a manual trigger and a 'message' input, " +
        'and use an http step against the existing Slack connector with id d7306385-cbe6-4541-9726-49afdff59ba5.',
    },
    output: { reference: 'workflow-authoring-a expected response' },
    metadata: {
      expectedSkill: 'workflow-authoring',
      expectedTools: ['workflow_author', 'workflow_preview'],
      severity: 'medium',
      tags: ['workflow', 'authoring'],
    },
  },
  {
    id: 'workflow-authoring-b',
    category: 'workflow-authoring',
    variant: 'B',
    description: 'Fixed-message Slack workflow',
    input: {
      question:
        'Author an Elastic workflow in YAML that, on a manual trigger, posts a fixed one-line message ' +
        "'Chrysalis hunt complete — see case for details' to Slack channel #general. " +
        'Use an http step targeting the Slack connector.',
    },
    output: { reference: 'workflow-authoring-b expected response' },
    metadata: {
      expectedSkill: 'workflow-authoring',
      expectedTools: ['workflow_author', 'workflow_preview'],
      severity: 'low',
      tags: ['workflow', 'authoring-fixed'],
    },
  },
  {
    id: 'workflow-authoring-c',
    category: 'workflow-authoring',
    variant: 'C',
    description: 'Parameterized summary notification workflow',
    input: {
      question:
        'I want to automate Chrysalis incident notifications. Author a workflow (YAML) with a manual trigger ' +
        "that takes a 'summary' string input and posts it to Slack #general via an http step on connector " +
        'd7306385-cbe6-4541-9726-49afdff59ba5.',
    },
    output: { reference: 'workflow-authoring-c expected response' },
    metadata: {
      expectedSkill: 'workflow-authoring',
      expectedTools: ['workflow_author', 'workflow_preview'],
      severity: 'medium',
      tags: ['workflow', 'authoring-parameterized'],
    },
  },
  {
    id: 'workflow-execution-a',
    category: 'workflow-execution',
    variant: 'A',
    description: 'VirusTotal hash verification',
    input: {
      question:
        'The Chrysalis loader hash is 275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f. ' +
        'Check this hash against VirusTotal and tell me the verdict.',
    },
    output: { reference: 'workflow-execution-a expected response' },
    metadata: {
      expectedSkill: 'security-tools',
      expectedTools: ['virustotal_lookup'],
      severity: 'high',
      tags: ['workflow', 'vt-check'],
    },
  },
  {
    id: 'workflow-execution-b',
    category: 'workflow-execution',
    variant: 'B',
    description: 'On-call schedule lookup',
    input: {
      question:
        'Who is currently on call to own a Chrysalis incident response? Look up the on-call schedule ' +
        'and tell me the primary responder and their contact.',
    },
    output: { reference: 'workflow-execution-b expected response' },
    metadata: {
      expectedSkill: 'security-tools',
      expectedTools: ['on_call_lookup'],
      severity: 'medium',
      tags: ['workflow', 'on-call'],
    },
  },
  {
    id: 'workflow-execution-c',
    category: 'workflow-execution',
    variant: 'C',
    description: 'Security case creation',
    input: {
      question:
        'Open a Security case for the confirmed Chrysalis incident on srv-win-defend-01. ' +
        "Title it 'Chrysalis backdoor — srv-win-defend-01', set severity to critical, " +
        'and put a short summary of the side-loading activity in the description.',
    },
    output: { reference: 'workflow-execution-c expected response' },
    metadata: {
      expectedSkill: 'security-tools',
      expectedTools: ['create_case'],
      severity: 'critical',
      tags: ['workflow', 'case-creation'],
    },
  },
];
