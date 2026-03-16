/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleAsset } from '../../../prebuilt_rules/model/rule_assets/prebuilt_rule_asset';

/**
 * Prebuilt correlation rule definitions demonstrating common attack patterns.
 * These are JSON fixtures that validate against the PrebuiltRuleAsset schema
 * and serve as reference implementations for shipping correlation rules via
 * the detection-rules repo in the future.
 */
export const PREBUILT_CORRELATION_RULES: PrebuiltRuleAsset[] = [
  {
    rule_id: 'corr-lateral-movement-remote-exec-001',
    version: 1,
    name: 'Lateral Movement - Remote Execution After Authentication',
    description:
      'Detects a sequence where a successful remote authentication event is followed by remote process execution on the same host by the same user within a short time window. This pattern is indicative of an attacker who has obtained valid credentials and is moving laterally across the network by authenticating to remote systems and executing commands or deploying tools. The temporal ordering ensures the authentication precedes the execution, reducing false positives from unrelated events.',
    type: 'correlation',
    language: 'esql',
    query: 'FROM .alerts-security.alerts-default',
    risk_score: 73,
    severity: 'high',
    from: 'now-6m',
    interval: '5m',
    to: 'now',
    correlation: {
      type: 'temporal_ordered',
      rules: ['auth-success-remote', 'remote-process-execution'],
      groupBy: ['host.name', 'user.name'],
      timespan: '5m',
    },
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0008',
          name: 'Lateral Movement',
          reference: 'https://attack.mitre.org/tactics/TA0008/',
        },
        technique: [
          {
            id: 'T1021',
            name: 'Remote Services',
            reference: 'https://attack.mitre.org/techniques/T1021/',
            subtechnique: [],
          },
        ],
      },
    ],
    tags: ['Elastic', 'Correlation', 'Lateral Movement'],
    author: ['Elastic'],
    license: 'Elastic License v2',
    false_positives: [
      'Legitimate remote administration tools used by IT staff may trigger this rule. Tune by excluding known admin accounts or jump-box hosts.',
    ],
    references: [
      'https://attack.mitre.org/tactics/TA0008/',
      'https://attack.mitre.org/techniques/T1021/',
    ],
    note: '## Investigation Guide\n\n### Triage Steps\n1. Identify the source host from which the authentication originated.\n2. Verify whether the user account is authorized for remote access to the target host.\n3. Check for additional lateral movement indicators such as new service installations or scheduled tasks on the target.\n4. Review the executed process for known malicious binaries or LOLBins.\n5. Correlate with network flow data to identify the full scope of lateral movement.\n\n### False Positive Analysis\n- IT administrators using remote management tools (e.g., PsExec, SSH) as part of routine operations.\n- Automated deployment or configuration management systems.\n',
  },
  {
    rule_id: 'corr-privilege-escalation-chain-001',
    version: 1,
    name: 'Privilege Escalation - Suspicious Process Chain',
    description:
      'Correlates a suspicious process creation event followed by a privilege escalation attempt on the same host and user within a 10-minute window. This ordered sequence detects attack patterns where an adversary first establishes a foothold through a suspicious process (e.g., a reverse shell, script interpreter, or exploit payload) and then attempts to escalate privileges through techniques such as exploiting a vulnerable service, abusing SUID/SGID binaries, or leveraging kernel vulnerabilities.',
    type: 'correlation',
    language: 'esql',
    query: 'FROM .alerts-security.alerts-default',
    risk_score: 73,
    severity: 'high',
    from: 'now-6m',
    interval: '5m',
    to: 'now',
    correlation: {
      type: 'temporal_ordered',
      rules: ['suspicious-process-creation', 'privilege-escalation-attempt'],
      groupBy: ['host.name', 'user.name'],
      timespan: '10m',
    },
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0004',
          name: 'Privilege Escalation',
          reference: 'https://attack.mitre.org/tactics/TA0004/',
        },
        technique: [
          {
            id: 'T1068',
            name: 'Exploitation for Privilege Escalation',
            reference: 'https://attack.mitre.org/techniques/T1068/',
            subtechnique: [],
          },
        ],
      },
    ],
    tags: ['Elastic', 'Correlation', 'Privilege Escalation'],
    author: ['Elastic'],
    license: 'Elastic License v2',
    false_positives: [
      'Software installers that spawn child processes requiring elevated privileges may match this pattern. Review the process tree to determine legitimacy.',
    ],
    references: [
      'https://attack.mitre.org/tactics/TA0004/',
      'https://attack.mitre.org/techniques/T1068/',
    ],
    note: '## Investigation Guide\n\n### Triage Steps\n1. Examine the suspicious process that triggered the initial alert — check its parent process, command-line arguments, and file hash.\n2. Determine if the privilege escalation attempt succeeded by reviewing the resulting process token or effective UID.\n3. Check for persistence mechanisms that may have been established after privilege escalation.\n4. Review the user account for recent password changes or unusual login patterns.\n5. Investigate whether the same exploit chain has been observed on other hosts.\n\n### False Positive Analysis\n- Development environments where compilers or build tools spawn privileged processes.\n- System update mechanisms that temporarily elevate privileges.\n',
  },
  {
    rule_id: 'corr-credential-spray-001',
    version: 1,
    name: 'Credential Access - Authentication Spray Detected',
    description:
      'Identifies password spraying attacks by correlating 10 or more authentication failure events from the same source IP within a 15-minute window. Password spraying is a brute-force variant where an attacker tries a small number of commonly used passwords against many accounts, staying below per-account lockout thresholds. This event-count correlation detects the aggregate pattern across multiple failed authentication attempts originating from a single source.',
    type: 'correlation',
    language: 'esql',
    query: 'FROM .alerts-security.alerts-default',
    risk_score: 47,
    severity: 'medium',
    from: 'now-6m',
    interval: '5m',
    to: 'now',
    correlation: {
      type: 'event_count',
      rules: ['auth-failure-brute-force'],
      groupBy: ['source.ip'],
      timespan: '15m',
      condition: { operator: 'gte', value: 10 },
    },
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0006',
          name: 'Credential Access',
          reference: 'https://attack.mitre.org/tactics/TA0006/',
        },
        technique: [
          {
            id: 'T1110',
            name: 'Brute Force',
            reference: 'https://attack.mitre.org/techniques/T1110/',
            subtechnique: [
              {
                id: 'T1110.003',
                name: 'Password Spraying',
                reference: 'https://attack.mitre.org/techniques/T1110/003/',
              },
            ],
          },
        ],
      },
    ],
    tags: ['Elastic', 'Correlation', 'Credential Access'],
    author: ['Elastic'],
    license: 'Elastic License v2',
    false_positives: [
      'Automated vulnerability scanners or penetration testing tools may generate authentication failures matching this pattern. Coordinate with security testing schedules.',
      'Misconfigured service accounts with expired credentials retrying authentication.',
    ],
    references: [
      'https://attack.mitre.org/tactics/TA0006/',
      'https://attack.mitre.org/techniques/T1110/003/',
    ],
    note: '## Investigation Guide\n\n### Triage Steps\n1. Identify the source IP and determine if it belongs to an internal or external network.\n2. Enumerate all targeted user accounts from the authentication failure events.\n3. Check if any of the targeted accounts subsequently had a successful authentication (indicating a compromised credential).\n4. Review threat intelligence feeds for the source IP.\n5. If the source is external, consider blocking the IP at the perimeter firewall.\n\n### False Positive Analysis\n- Automated monitoring systems probing service availability with incorrect credentials.\n- Load balancers or proxies that aggregate traffic from multiple users behind a single IP.\n',
  },
  {
    rule_id: 'corr-data-exfil-multichannel-001',
    version: 1,
    name: 'Exfiltration - Data Transfer Across Multiple Channels',
    description:
      'Detects potential data exfiltration by correlating alerts for large file transfers, DNS tunneling activity, and cloud storage uploads from the same host within a 30-minute window. The value-count condition requires at least 2 distinct destination IPs, indicating the use of multiple exfiltration channels. Adversaries often diversify their exfiltration paths to avoid detection by volume-based monitoring, splitting data across different protocols and destinations.',
    type: 'correlation',
    language: 'esql',
    query: 'FROM .alerts-security.alerts-default',
    risk_score: 85,
    severity: 'critical',
    from: 'now-6m',
    interval: '5m',
    to: 'now',
    correlation: {
      type: 'value_count',
      rules: ['large-file-transfer', 'dns-tunneling-activity', 'cloud-storage-upload'],
      groupBy: ['host.name'],
      timespan: '30m',
      condition: { operator: 'gte', value: 2, field: 'destination.ip' },
    },
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0010',
          name: 'Exfiltration',
          reference: 'https://attack.mitre.org/tactics/TA0010/',
        },
        technique: [
          {
            id: 'T1048',
            name: 'Exfiltration Over Alternative Protocol',
            reference: 'https://attack.mitre.org/techniques/T1048/',
            subtechnique: [],
          },
        ],
      },
    ],
    tags: ['Elastic', 'Correlation', 'Exfiltration'],
    author: ['Elastic'],
    license: 'Elastic License v2',
    false_positives: [
      'Backup software that simultaneously uploads data to multiple cloud storage providers.',
      'Content delivery workflows that distribute large files to multiple endpoints.',
    ],
    references: [
      'https://attack.mitre.org/tactics/TA0010/',
      'https://attack.mitre.org/techniques/T1048/',
    ],
    note: '## Investigation Guide\n\n### Triage Steps\n1. Identify the host and user associated with the correlated alerts.\n2. Determine the total volume of data transferred across all channels.\n3. Examine the destination IPs and domains — check against known cloud storage, file sharing, and DNS tunneling infrastructure.\n4. Review the types of files being transferred for sensitive or classified content.\n5. Check for data staging activity (compression, encryption, archiving) preceding the transfers.\n6. Escalate immediately if the host handles sensitive data or belongs to a privileged user.\n\n### False Positive Analysis\n- Developer workstations pushing code to multiple remote repositories simultaneously.\n- Automated CI/CD pipelines that deploy artifacts to multiple environments.\n',
  },
  {
    rule_id: 'corr-defense-evasion-execution-001',
    version: 1,
    name: 'Defense Evasion Followed by Suspicious Execution',
    description:
      'Correlates a defense evasion event (such as disabling security tools, clearing logs, or modifying system configurations) with a subsequent suspicious script or binary execution on the same host within a 3-minute window. This short temporal window captures the common attack pattern where adversaries first neutralize defenses and then immediately execute their payload while the host is unprotected. The tight timespan minimizes false positives from unrelated events.',
    type: 'correlation',
    language: 'esql',
    query: 'FROM .alerts-security.alerts-default',
    risk_score: 63,
    severity: 'high',
    from: 'now-6m',
    interval: '5m',
    to: 'now',
    correlation: {
      type: 'temporal',
      rules: ['defense-evasion-tamper', 'suspicious-script-execution'],
      groupBy: ['host.name'],
      timespan: '3m',
    },
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0005',
          name: 'Defense Evasion',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [
          {
            id: 'T1562',
            name: 'Impair Defenses',
            reference: 'https://attack.mitre.org/techniques/T1562/',
            subtechnique: [
              {
                id: 'T1562.001',
                name: 'Disable or Modify Tools',
                reference: 'https://attack.mitre.org/techniques/T1562/001/',
              },
            ],
          },
        ],
      },
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0002',
          name: 'Execution',
          reference: 'https://attack.mitre.org/tactics/TA0002/',
        },
        technique: [],
      },
    ],
    tags: ['Elastic', 'Correlation', 'Defense Evasion', 'Execution'],
    author: ['Elastic'],
    license: 'Elastic License v2',
    false_positives: [
      'System administrators temporarily disabling endpoint protection for troubleshooting, followed by running diagnostic scripts.',
      'Software deployment tools that modify security configurations as part of an installation process.',
    ],
    references: [
      'https://attack.mitre.org/tactics/TA0005/',
      'https://attack.mitre.org/techniques/T1562/001/',
    ],
    note: '## Investigation Guide\n\n### Triage Steps\n1. Identify which security tool or mechanism was tampered with in the defense evasion alert.\n2. Determine if the security tool is still disabled or has been restored.\n3. Analyze the suspicious execution — command-line arguments, parent process, and file origin.\n4. Check if the executed script or binary has been seen on other hosts in the environment.\n5. Look for persistence mechanisms that may have been established during the unprotected window.\n6. Verify that endpoint protection is fully operational on the affected host.\n\n### False Positive Analysis\n- Security tool updates that briefly stop and restart services.\n- Authorized red team exercises.\n',
  },
  {
    rule_id: 'corr-persistence-after-access-001',
    version: 1,
    name: 'Persistence Mechanism After Initial Access',
    description:
      'Detects an ordered sequence where an initial access event (such as a phishing payload execution) is followed by the establishment of a persistence mechanism (registry run key modification or scheduled task creation) on the same host and user within one hour. This pattern captures the full kill-chain progression from initial compromise to establishing a foothold, where adversaries ensure continued access by installing autostart mechanisms before their initial session may expire or be detected.',
    type: 'correlation',
    language: 'esql',
    query: 'FROM .alerts-security.alerts-default',
    risk_score: 71,
    severity: 'high',
    from: 'now-6m',
    interval: '5m',
    to: 'now',
    correlation: {
      type: 'temporal_ordered',
      rules: [
        'initial-access-phishing',
        'persistence-registry-run-key',
        'persistence-scheduled-task',
      ],
      groupBy: ['host.name', 'user.name'],
      timespan: '1h',
    },
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0003',
          name: 'Persistence',
          reference: 'https://attack.mitre.org/tactics/TA0003/',
        },
        technique: [
          {
            id: 'T1547',
            name: 'Boot or Logon Autostart Execution',
            reference: 'https://attack.mitre.org/techniques/T1547/',
            subtechnique: [
              {
                id: 'T1547.001',
                name: 'Registry Run Keys / Startup Folder',
                reference: 'https://attack.mitre.org/techniques/T1547/001/',
              },
            ],
          },
        ],
      },
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0001',
          name: 'Initial Access',
          reference: 'https://attack.mitre.org/tactics/TA0001/',
        },
        technique: [
          {
            id: 'T1566',
            name: 'Phishing',
            reference: 'https://attack.mitre.org/techniques/T1566/',
            subtechnique: [],
          },
        ],
      },
    ],
    tags: ['Elastic', 'Correlation', 'Persistence', 'Initial Access'],
    author: ['Elastic'],
    license: 'Elastic License v2',
    false_positives: [
      'Legitimate software installations that create scheduled tasks or registry run keys after being downloaded via email.',
      'Enterprise software deployment via email-distributed installers.',
    ],
    references: [
      'https://attack.mitre.org/tactics/TA0003/',
      'https://attack.mitre.org/techniques/T1547/001/',
      'https://attack.mitre.org/techniques/T1566/',
    ],
    note: '## Investigation Guide\n\n### Triage Steps\n1. Review the initial access alert to determine the delivery mechanism (email attachment, link, drive-by).\n2. Identify the persistence mechanism — examine the registry key path or scheduled task definition.\n3. Check if the persisted payload is a known malicious binary or script.\n4. Determine if the user account that triggered the events has elevated privileges.\n5. Search for the same persistence indicator (file hash, registry path, task name) across all hosts.\n6. Contain the affected host and reset the user credentials if the chain is confirmed malicious.\n\n### False Positive Analysis\n- Legitimate applications installed from email-distributed links that register autostart entries.\n- IT provisioning workflows that involve emailed setup instructions followed by scheduled task creation.\n',
  },
];
