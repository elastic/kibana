/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageExample } from '../src/types';

/**
 * Detection gaps that only an Elastic prebuilt rule covers. No rule is installed, so the
 * correct verdict is `prebuilt_available` for every example, and the rule must be the
 * primary rule or an acceptable alternate. The decoys are rules that look related but
 * detect a different behavior or need a different data source.
 *
 * Source: the Detection Watch product answer key for the coverage worker (20 Linux gaps,
 * written from public threat reports). The indicator text is the one the hunt producer
 * writes. Test bookkeeping (gap ids, test tags) is removed, because the review passes
 * the indicator to the model.
 */
export const prebuiltSuggestionDataset: CoverageExample[] = [
  {
    input: {
      gapId: 'RS-01',
      indicator: {
        type: 'security.coverage',
        title:
          'Command and Scripting Interpreter (T1059): Command execution on Zimbra mail servers through forged log text',
        description:
          'Command execution on Zimbra mail servers through forged log text. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nOn Zimbra Collaboration servers, forged log text delivered over SMTP is interpolated by the swatchdog monitoring component into an snmptrap shell command. An unauthenticated remote attacker gets command execution as the zimbra user and can pull down tooling or drop a JSP webshell.\n\nSource: https://www.microsoft.com/en-us/security/blog/2026/09/30/unauthenticated-command-injection-on-internet-facing-mail-servers-tracking-cve-2026-73570/\n\nTechniques: T1059.004 Unix Shell; T1190 Exploit Public-Facing Application\n\nData sources: logs-endpoint.events.process-*\n\nSeverity: critical\n\nES|QL: not executed\n\nReport excerpt:\n"A legitimate snmptrap invocation immediately followed by shell metacharacters and a wget or curl call, wrapped in a trailing ‘#’ comment that swallows the remaining legitimate arguments."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1059.004',
          all_techniques: ['T1059.004', 'T1190'],
          severity: 'critical',
          data_sources: ['logs-endpoint.events.process-*'],
          source_report:
            'https://www.microsoft.com/en-us/security/blog/2026/09/30/unauthenticated-command-injection-on-internet-facing-mail-servers-tracking-cve-2026-73570/',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://www.microsoft.com/en-us/security/blog/2026/09/30/unauthenticated-command-injection-on-internet-facing-mail-servers-tracking-cve-2026-73570/',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '1fa1a434-75a7-4c58-9bef-331d62bf3f82',
        name: 'Zimbra Swatchdog SNMP Command Injection Execution',
      },
      alternateRuleNames: [],
      decoyRuleNames: [
        'Suspicious Child Execution via Web Server',
        'Potential Webshell Deployed via Apache Struts CVE-2023-50164 Exploitation',
      ],
    },
    metadata: {
      difficulty: 'easy',
      whatItTests: 'Named product + vulnerability class maps to one specific rule.',
      passCriteria:
        'Primary rule named in the top suggestions. Mentioning only a generic web-server rule is a fail.',
    },
  },
  {
    input: {
      gapId: 'RS-02',
      indicator: {
        type: 'security.coverage',
        title:
          'Exploit Public-Facing Application (T1190): Unauthenticated root shell through a crafted telnet USER environment value',
        description:
          'Unauthenticated root shell through a crafted telnet USER environment value. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nGNU Inetutils telnetd passes a client-supplied USER environment value to /usr/bin/login. Sending a value such as \'-f root\' makes login skip authentication and returns a root shell to a remote unauthenticated user (CVE-2026-24061). The only host telemetry collected on these servers is Auditd Manager execve data.\n\nSource: https://www.safebreach.com/blog/safebreach-labs-root-cause-analysis-and-poc-exploit-for-cve-2026-24061/\n\nTechniques: T1190 Exploit Public-Facing Application; T1210 Exploitation of Remote Services; T1068 Exploitation for Privilege Escalation\n\nData sources: logs-auditd_manager.auditd-*, auditbeat-*\n\nSeverity: critical\n\nES|QL: not executed\n\nReport excerpt:\n"we could change the PATH variable of any child process (including /usr/bin/login) that telnetd runs to whatever we want"\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1190',
          all_techniques: ['T1190', 'T1210', 'T1068'],
          severity: 'critical',
          data_sources: ['logs-auditd_manager.auditd-*', 'auditbeat-*'],
          source_report:
            'https://www.safebreach.com/blog/safebreach-labs-root-cause-analysis-and-poc-exploit-for-cve-2026-24061/',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-auditd_manager.auditd-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://auditbeat-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://www.safebreach.com/blog/safebreach-labs-root-cause-analysis-and-poc-exploit-for-cve-2026-24061/',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: 'eb3150eb-e9fb-4a64-a0fc-aa66cdd35632',
        name: 'Telnet Authentication Bypass via User Environment Variable',
      },
      alternateRuleNames: ['Potential Telnet Authentication Bypass (CVE-2026-24061)'],
      decoyRuleNames: [
        'Connection to External Network via Telnet',
        'Connection to Internal Network via Telnet',
      ],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests:
        'Two near-identical rules; the available telemetry (Auditd) decides which one is correct.',
      passCriteria:
        'Pass if the auditd rule is first. Partial pass if the Defend rule is first but the agent says it needs a different data source.',
    },
  },
  {
    input: {
      gapId: 'RS-03',
      indicator: {
        type: 'security.coverage',
        title:
          'Remote Services: SSH (T1021.004): Pre-authentication command execution inside sshd from a backdoored compression library',
        description:
          'SSH (T1021.004): Pre-authentication command execution inside sshd from a backdoored compression library. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA backdoored liblzma loaded into sshd (CVE-2024-3094) lets an attacker holding the right key run commands through system() inside sshd before authentication completes. The result is an \'sh -c\' child of sshd and an abnormal sshd exit.\n\nSource: https://www.elastic.co/security-labs/500ms-to-midnight\n\nTechniques: T1556 Modify Authentication Process; T1021.004 SSH; T1563.001 SSH Hijacking; T1059.004 Unix Shell\n\nData sources: logs-endpoint.events.process-*, logs-endpoint.events.network-*\n\nSeverity: medium\n\nES|QL: not executed\n\nReport excerpt:\n"Type 2: executes null-terminated payload with system()"\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1556',
          all_techniques: ['T1556', 'T1021.004', 'T1563.001', 'T1059.004'],
          severity: 'medium',
          data_sources: ['logs-endpoint.events.process-*', 'logs-endpoint.events.network-*'],
          source_report: 'https://www.elastic.co/security-labs/500ms-to-midnight',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-endpoint.events.network-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://www.elastic.co/security-labs/500ms-to-midnight',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '7afc6cc9-8800-4c7f-be6b-b688d2dea248',
        name: 'Potential Execution via SSH Backdoor',
      },
      alternateRuleNames: [],
      decoyRuleNames: [
        'Unusual SSHD Child Process',
        'Network Connection Initiated by Suspicious SSHD Child Process',
      ],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests: 'Supply-chain backdoor described by behavior; several SSH-related decoys.',
      passCriteria:
        'Pass if the primary is first or second. A generic sshd-child rule first with the primary absent is a fail.',
    },
  },
  {
    input: {
      gapId: 'RS-04',
      indicator: {
        type: 'security.coverage',
        title:
          'Exploitation for Privilege Escalation (T1068): Local root through a glibc dynamic loader environment overflow',
        description:
          'Local root through a glibc dynamic loader environment overflow. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA buffer overflow in the glibc dynamic loader (ld.so) when it parses the GLIBC_TUNABLES environment variable lets a local unprivileged user gain root by launching SUID binaries with a malformed tunables string (CVE-2023-4911).\n\nSource: https://blog.qualys.com/vulnerabilities-threat-research/2023/10/03/cve-2023-4911-looney-tunables-local-privilege-escalation-in-the-glibcs-ld-so\n\nTechniques: T1068 Exploitation for Privilege Escalation; T1548.001 Setuid and Setgid\n\nData sources: logs-endpoint.events.process-*\n\nSeverity: high\n\nES|QL: not executed\n\nReport excerpt:\n"Although we are withholding our exploit code for now, the ease with which the buffer overflow can be transformed into a data-only attack implies that other research teams could soon produce and release exploits."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1068',
          all_techniques: ['T1068', 'T1548.001'],
          severity: 'high',
          data_sources: ['logs-endpoint.events.process-*'],
          source_report:
            'https://blog.qualys.com/vulnerabilities-threat-research/2023/10/03/cve-2023-4911-looney-tunables-local-privilege-escalation-in-the-glibcs-ld-so',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://blog.qualys.com/vulnerabilities-threat-research/2023/10/03/cve-2023-4911-looney-tunables-local-privilege-escalation-in-the-glibcs-ld-so',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '6d8685a1-94fa-4ef7-83de-59302e7c4ca8',
        name: 'Potential Privilege Escalation via CVE-2023-4911',
      },
      alternateRuleNames: [],
      decoyRuleNames: ['Suspicious SUID Binary Execution', 'Privilege Escalation via SUID/SGID'],
    },
    metadata: {
      difficulty: 'easy',
      whatItTests: 'CVE-named local privilege escalation.',
      passCriteria: 'Primary rule listed. Generic SUID rules alone are a partial pass.',
    },
  },
  {
    input: {
      gapId: 'RS-05',
      indicator: {
        type: 'security.coverage',
        title:
          'Hijack Execution Flow (T1574): Root through a recreated /tmp/.snap directory after tmpfiles cleanup',
        description:
          'Root through a recreated /tmp/.snap directory after tmpfiles cleanup. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA local user abuses the timing between systemd-tmpfiles cleanup and snap-confine\'s private /tmp handling. After /tmp/.snap is purged, the attacker recreates it inside the snap sandbox so snap-confine, running as root, bind-mounts attacker-controlled content, which ends in root code execution.\n\nSource: https://blog.qualys.com/vulnerabilities-threat-research/2026/03/17/cve-2026-3888-important-snap-flaw-enables-local-privilege-escalation-to-root\n\nTechniques: T1068 Exploitation for Privilege Escalation; T1574 Hijack Execution Flow\n\nData sources: logs-endpoint.events.file-*, logs-endpoint.events.process-*\n\nSeverity: high\n\nES|QL: not executed\n\nReport excerpt:\n"we re-create the ./.snap directory ourselves (/tmp/.snap inside the snap\'s sandbox), since it was deleted by systemd-tmpfiles"\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1068',
          all_techniques: ['T1068', 'T1574'],
          severity: 'high',
          data_sources: ['logs-endpoint.events.file-*', 'logs-endpoint.events.process-*'],
          source_report:
            'https://blog.qualys.com/vulnerabilities-threat-research/2026/03/17/cve-2026-3888-important-snap-flaw-enables-local-privilege-escalation-to-root',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.file-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://blog.qualys.com/vulnerabilities-threat-research/2026/03/17/cve-2026-3888-important-snap-flaw-enables-local-privilege-escalation-to-root',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '44cb1d8a-1922-4fc0-a00f-36c1caf57393',
        name: 'Potential snap-confine Privilege Escalation via CVE-2026-3888',
      },
      alternateRuleNames: [],
      decoyRuleNames: ['Privilege Escalation via SUID/SGID', 'Suspicious Symbolic Link Created'],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests: 'Behavior-only description (no CVE number); file-event rule.',
      passCriteria: 'Primary rule listed in the top 3.',
    },
  },
  {
    input: {
      gapId: 'RS-06',
      indicator: {
        type: 'security.coverage',
        title:
          'Exploitation for Privilege Escalation (T1068): Page-cache write through AF_ALG sockets and splice',
        description:
          'Page-cache write through AF_ALG sockets and splice. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nAn unprivileged process opens AF_ALG crypto sockets and uses splice() to write four controlled bytes into the page cache of any readable file, typically a setuid binary such as su. Executing the corrupted binary yields root. The primitive also crosses container boundaries because the page cache is shared with the host.\n\nSource: https://xint.io/blog/copy-fail-linux-distributions\n\nTechniques: T1068 Exploitation for Privilege Escalation; T1548 Abuse Elevation Control Mechanism; T1548.001 Setuid and Setgid\n\nData sources: logs-auditd_manager.auditd-*, auditbeat-*\n\nSeverity: high\n\nES|QL: not executed\n\nReport excerpt:\n"The same primitive also crosses container boundaries because the page cache is shared across the host."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1068',
          all_techniques: ['T1068', 'T1548', 'T1548.001'],
          severity: 'high',
          data_sources: ['logs-auditd_manager.auditd-*', 'auditbeat-*'],
          source_report: 'https://xint.io/blog/copy-fail-linux-distributions',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-auditd_manager.auditd-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://auditbeat-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://xint.io/blog/copy-fail-linux-distributions',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '1c28becc-ec0b-4e6d-81a5-899d00348089',
        name: 'Potential Copy Fail (CVE-2026-31431) Exploitation via AF_ALG Socket',
      },
      alternateRuleNames: ['Suspicious SUID Binary Execution (Auditd Sequence)'],
      decoyRuleNames: ['Potential Privilege Escalation via a Parent/Child Process Sequence'],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests:
        'Kernel primitive described in syscall terms; generic LPE rules are plausible decoys.',
      passCriteria: 'Pass if the primary is first. Generic LPE rules first is a partial pass.',
    },
  },
  {
    input: {
      gapId: 'RS-07',
      indicator: {
        type: 'security.coverage',
        title:
          'Linux and Mac File and Directory Permissions Modification (T1222.002): Argument injection through shell wildcard expansion',
        description:
          'Argument injection through shell wildcard expansion. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA root-run cron job or script uses a shell wildcard (*) in a directory that a low-privileged user can write to. Attacker-created files named like options (--reference=..., --checkpoint-action=exec=...) are expanded as arguments, letting the attacker change ownership or permissions of root-owned files or run commands as root.\n\nSource: https://www.exploit-db.com/papers/33930\n\nTechniques: T1068 Exploitation for Privilege Escalation; T1222.002 Linux and Mac File and Directory Permissions Modification; T1059.004 Unix Shell\n\nData sources: logs-endpoint.events.process-*, logs-auditd_manager.auditd-*\n\nSeverity: medium\n\nES|QL: not executed\n\nReport excerpt:\n"Chmod also has --reference option that can be abused to specify arbitrary permissions on files selected with asterisk wildcard."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1068',
          all_techniques: ['T1068', 'T1222.002', 'T1059.004'],
          severity: 'medium',
          data_sources: ['logs-endpoint.events.process-*', 'logs-auditd_manager.auditd-*'],
          source_report: 'https://www.exploit-db.com/papers/33930',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-auditd_manager.auditd-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://www.exploit-db.com/papers/33930',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '4a99ac6f-9a54-4ba5-a64f-6eb65695841b',
        name: 'Potential Unauthorized Access via Wildcard Injection Detected',
      },
      alternateRuleNames: ['Potential Shell via Wildcard Injection Detected'],
      decoyRuleNames: ['Privilege Escalation via CAP_CHOWN/CAP_FOWNER Capabilities'],
    },
    metadata: {
      difficulty: 'hard',
      whatItTests:
        'Two valid sibling rules for the same technique; checks the agent does not stop at one.',
      passCriteria: 'Pass if at least one of the two is suggested. Best result names both.',
    },
  },
  {
    input: {
      gapId: 'RS-08',
      indicator: {
        type: 'security.coverage',
        title:
          "Escape to Host (T1611): Entering the host's namespaces from a container with nsenter",
        description:
          "Entering the host's namespaces from a container with nsenter. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.",
        content:
          'Threat:\nFrom inside a container with enough privileges, a process runs nsenter against PID 1\'s namespaces (target PID 1 with mount and pid namespaces) to step into the host and run commands as root on the node.\n\nSource: https://www.cyberark.com/resources/threat-research-blog/the-route-to-root-container-escape-using-kernel-exploitation\n\nTechniques: T1611 Escape to Host\n\nData sources: logs-endpoint.events.process-*\n\nSeverity: medium\n\nES|QL: not executed\n\nReport excerpt:\n"Changing the mnt and pid namespaces is enough to achieve the desired escape to the host."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1611',
          all_techniques: ['T1611'],
          severity: 'medium',
          data_sources: ['logs-endpoint.events.process-*'],
          source_report:
            'https://www.cyberark.com/resources/threat-research-blog/the-route-to-root-container-escape-using-kernel-exploitation',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://www.cyberark.com/resources/threat-research-blog/the-route-to-root-container-escape-using-kernel-exploitation',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '5f3ab3ce-7b41-4168-a06a-68d2af8ebc88',
        name: 'Potential Docker Escape via Nsenter',
      },
      alternateRuleNames: ['Nsenter to PID Namespace via Auditd'],
      decoyRuleNames: [
        'Potential Chroot Container Escape via Mount',
        'Potential Container Escape via Kernel core_pattern Modification',
      ],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests: 'Container-escape technique with several container-related decoys.',
      passCriteria:
        'Primary or its auditd sibling listed first; escape rules for other methods first is a fail.',
    },
  },
  {
    input: {
      gapId: 'RS-09',
      indicator: {
        type: 'security.coverage',
        title:
          'Escape to Host (T1611): Container writes a pipe handler into the kernel core_pattern',
        description:
          'Container writes a pipe handler into the kernel core_pattern. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA process in a privileged or misconfigured container writes a pipe handler (\'|/path/to/program\') into /proc/sys/kernel/core_pattern. The next process crash makes the host kernel run that program as root outside the container.\n\nSource: https://www.sysdig.com/blog/runc-container-escape-vulnerabilities\n\nTechniques: T1611 Escape to Host\n\nData sources: logs-endpoint.events.process-*, logs-endpoint.events.file-*\n\nSeverity: medium\n\nES|QL: not executed\n\nReport excerpt:\n"Critically, attackers can redirect sysctl writes containing arbitrary text to dangerous files like /proc/sysrq-trigger or /proc/sys/kernel/core_pattern that can crash the system or escape the container, respectively."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1611',
          all_techniques: ['T1611'],
          severity: 'medium',
          data_sources: ['logs-endpoint.events.process-*', 'logs-endpoint.events.file-*'],
          source_report: 'https://www.sysdig.com/blog/runc-container-escape-vulnerabilities',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-endpoint.events.file-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://www.sysdig.com/blog/runc-container-escape-vulnerabilities',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '4872671a-c8d2-4847-9891-d3ce08b9e4c9',
        name: 'Potential Container Escape via Kernel core_pattern Modification',
      },
      alternateRuleNames: [],
      decoyRuleNames: [
        'Potential Docker Escape via Nsenter',
        'Potential Privilege Escalation via Container Misconfiguration',
      ],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests: 'Same tactic as RS-08 but a different escape method.',
      passCriteria:
        'Primary rule in the top 3 and the agent does not recommend nsenter as the main answer.',
    },
  },
  {
    input: {
      gapId: 'RS-10',
      indicator: {
        type: 'security.coverage',
        title:
          'Command and Scripting Interpreter (T1059): The print-service account runs attacker commands after a malicious print job',
        description:
          'The print-service account runs attacker commands after a malicious print job. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nOn Linux hosts running CUPS, printing to an attacker-controlled printer entry (cups-browsed / foomatic-rip chain) makes the lp print-service account run arbitrary commands on the host. The commands then fetch tools, write files, or open outbound connections.\n\nSource: https://www.elastic.co/security-labs/cups-overflow\n\nTechniques: T1059.004 Unix Shell; T1203 Exploitation for Client Execution; T1190 Exploit Public-Facing Application\n\nData sources: logs-endpoint.events.process-*, logs-endpoint.events.network-*, logs-endpoint.events.file-*\n\nSeverity: high\n\nES|QL: not executed\n\nReport excerpt:\n"The `lp` user in many default configurations has access to commands that are not required for the print service, for instance `telnet`."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1059.004',
          all_techniques: ['T1059.004', 'T1203', 'T1190'],
          severity: 'high',
          data_sources: [
            'logs-endpoint.events.process-*',
            'logs-endpoint.events.network-*',
            'logs-endpoint.events.file-*',
          ],
          source_report: 'https://www.elastic.co/security-labs/cups-overflow',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-endpoint.events.network-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-endpoint.events.file-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://www.elastic.co/security-labs/cups-overflow',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '986361cd-3dac-47fe-afa1-5c5dd89f2fb4',
        name: 'Suspicious Execution from Foomatic-rip or Cupsd Parent',
      },
      alternateRuleNames: [
        'Cupsd or Foomatic-rip Shell Execution',
        'Printer User (lp) Shell Execution',
        'File Creation by Cups or Foomatic-rip Child',
        'Network Connection by Cups or Foomatic-rip Child',
      ],
      decoyRuleNames: ['Unusual Pkexec Execution'],
    },
    metadata: {
      difficulty: 'hard',
      whatItTests:
        'One threat, five sibling rules for different stages; any of them is acceptable.',
      passCriteria: 'Pass if any CUPS rule is first. Best result groups them by stage.',
    },
  },
  {
    input: {
      gapId: 'RS-11',
      indicator: {
        type: 'security.coverage',
        title:
          'Pluggable Authentication Modules (T1556.003): A hidden script runs on every authentication through a PAM exec line',
        description:
          'A hidden script runs on every authentication through a PAM exec line. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nAn attacker adds a pam_exec.so line to a PAM service file (such as /etc/pam.d/sshd) so a hidden script runs with every authentication. The script spawns a reverse shell through nohup, setsid and bash.\n\nSource: https://www.elastic.co/security-labs/approaching-the-summit-on-persistence\n\nTechniques: T1556.003 Pluggable Authentication Modules; T1059 Command and Scripting Interpreter\n\nData sources: logs-endpoint.events.process-*, logs-endpoint.events.file-*\n\nSeverity: medium\n\nES|QL: not executed\n\nReport excerpt:\n"Upon authentication, we can see the execution of the backdoor by the SSHD parent process, starting the reverse shell chain (pam_exec_backdoor.sh → nohup → setsid → bash)."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1556.003',
          all_techniques: ['T1556.003', 'T1059'],
          severity: 'medium',
          data_sources: ['logs-endpoint.events.process-*', 'logs-endpoint.events.file-*'],
          source_report:
            'https://www.elastic.co/security-labs/approaching-the-summit-on-persistence',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-endpoint.events.file-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://www.elastic.co/security-labs/approaching-the-summit-on-persistence',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '96f29282-ffcc-4ce7-834b-b17aee905568',
        name: 'Potential Backdoor Execution Through PAM_EXEC',
      },
      alternateRuleNames: ['Pluggable Authentication Module or Configuration Creation'],
      decoyRuleNames: [
        'Pluggable Authentication Module (PAM) Source Download',
        'Pluggable Authentication Module (PAM) Creation in Unusual Directory',
      ],
    },
    metadata: {
      difficulty: 'hard',
      whatItTests:
        'PAM family: one rule fits the runtime behavior, another fits the config change; others are decoys.',
      passCriteria:
        'Pass if the primary is first or second. Decoys without either valid rule is a fail.',
    },
  },
  {
    input: {
      gapId: 'RS-12',
      indicator: {
        type: 'security.coverage',
        title:
          'Event Triggered Execution (T1546): Git hooks used as a persistence trigger for a reverse shell',
        description:
          'Git hooks used as a persistence trigger for a reverse shell. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA persistence implant stores a malicious script in a repository\'s .git/hooks directory, or hooks git through configuration such as the pager. When a developer runs routine git commands, git launches a shell that backgrounds a reverse shell (git, sh, nohup, setsid, bash).\n\nSource: https://www.elastic.co/security-labs/sequel-on-persistence-mechanisms\n\nTechniques: T1546 Event Triggered Execution; T1574 Hijack Execution Flow; T1059.004 Unix Shell\n\nData sources: logs-endpoint.events.process-*, logs-endpoint.events.file-*, logs-endpoint.events.network-*\n\nSeverity: low\n\nES|QL: not executed\n\nReport excerpt:\n"Invoking the Git Pager (`less`) executes the backdoor, setting up the `git` → `sh` → `nohup` → `setsid` → `bash` reverse connection chain."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1546',
          all_techniques: ['T1546', 'T1574', 'T1059.004'],
          severity: 'low',
          data_sources: [
            'logs-endpoint.events.process-*',
            'logs-endpoint.events.file-*',
            'logs-endpoint.events.network-*',
          ],
          source_report: 'https://www.elastic.co/security-labs/sequel-on-persistence-mechanisms',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-endpoint.events.file-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-endpoint.events.network-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://www.elastic.co/security-labs/sequel-on-persistence-mechanisms',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: 'dc61f382-dc0c-4cc0-a845-069f2a071704',
        name: 'Git Hook Command Execution',
      },
      alternateRuleNames: [
        'Git Hook Child Process',
        'Git Hook Created or Modified',
        'Git Hook Egress Network Connection',
      ],
      decoyRuleNames: ['Shell Configuration Creation'],
    },
    metadata: {
      difficulty: 'hard',
      whatItTests: 'Git-hook persistence family of four.',
      passCriteria: 'Pass if any git-hook rule is first.',
    },
  },
  {
    input: {
      gapId: 'RS-13',
      indicator: {
        type: 'security.coverage',
        title:
          'Boot or Logon Initialization Scripts (T1037): Script in the login banner directory spawns tools on every SSH login',
        description:
          'Script in the login banner directory spawns tools on every SSH login. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA script planted in /etc/update-motd.d runs as root whenever a user logs in over SSH and launches a reverse shell or other tools. Long-running children end up reparented to PID 1.\n\nSource: https://pberba.github.io/security/2022/02/06/linux-threat-hunting-for-persistence-initialization-scripts-and-shell-configuration/#10-boot-or-logon-initialization-scripts-motd\n\nTechniques: T1037 Boot or Logon Initialization Scripts; T1059.004 Unix Shell\n\nData sources: logs-endpoint.events.process-*, logs-endpoint.events.file-*\n\nSeverity: high\n\nES|QL: not executed\n\nReport excerpt:\n"Since scripts in update-motd.d have to end for the SSH shell to start, then any long running processes that from running a malicious script in /etc/update-motd.d would have a parent PID of 1."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1037',
          all_techniques: ['T1037', 'T1059.004'],
          severity: 'high',
          data_sources: ['logs-endpoint.events.process-*', 'logs-endpoint.events.file-*'],
          source_report:
            'https://pberba.github.io/security/2022/02/06/linux-threat-hunting-for-persistence-initialization-scripts-and-shell-configuration/#10-boot-or-logon-initialization-scripts-motd',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-endpoint.events.file-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://pberba.github.io/security/2022/02/06/linux-threat-hunting-for-persistence-initialization-scripts-and-shell-configuration/#10-boot-or-logon-initialization-scripts-motd',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '4ec47004-b34a-42e6-8003-376a123ea447',
        name: 'Process Spawned from Message-of-the-Day (MOTD)',
      },
      alternateRuleNames: ['Message-of-the-Day (MOTD) File Creation'],
      decoyRuleNames: ['rc.local/rc.common File Creation', 'Systemd Service Created'],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests: 'Two-rule family (creation vs execution); behavior points to execution.',
      passCriteria: 'Primary or its creation sibling first.',
    },
  },
  {
    input: {
      gapId: 'RS-14',
      indicator: {
        type: 'security.coverage',
        title:
          'Kernel Modules and Extensions (T1547.006): Rootkit kernel module staged in a writable directory and loaded',
        description:
          'Rootkit kernel module staged in a writable directory and loaded. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA rootkit kernel module (.ko) is staged in a writable directory such as /tmp and loaded with insmod or modprobe. Syslogk-style LKM rootkits hide directories and processes after loading.\n\nSource: https://decoded.avast.io/davidalvarez/linux-threat-hunting-syslogk-a-kernel-rootkit-found-under-development-in-the-wild/\n\nTechniques: T1547.006 Kernel Modules and Extensions; T1014 Rootkit\n\nData sources: logs-endpoint.events.process-*\n\nSeverity: high\n\nES|QL: not executed\n\nReport excerpt:\n"As you can see, any directory containing the substring -Zobk0jpi will be hidden."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1547.006',
          all_techniques: ['T1547.006', 'T1014'],
          severity: 'high',
          data_sources: ['logs-endpoint.events.process-*'],
          source_report:
            'https://decoded.avast.io/davidalvarez/linux-threat-hunting-syslogk-a-kernel-rootkit-found-under-development-in-the-wild/',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://decoded.avast.io/davidalvarez/linux-threat-hunting-syslogk-a-kernel-rootkit-found-under-development-in-the-wild/',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: 'd54b649d-46d0-4b4c-a9a7-1bc9fc458d3c',
        name: 'Kernel Module Load from Unusual Location',
      },
      alternateRuleNames: [
        'Kernel Module Load via Built-in Utility',
        'Kernel Object File Creation',
      ],
      decoyRuleNames: [
        'Kernel Module Loaded with Tainting Flags',
        'Kernel Driver Load',
        'Loadable Kernel Module Configuration File Creation',
      ],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests:
        'Rootkit module loading; several kernel-module decoys on different data sources.',
      passCriteria: 'Pass if the primary or one of its alternates is first.',
    },
  },
  {
    input: {
      gapId: 'RS-15',
      indicator: {
        type: 'security.coverage',
        title:
          'Match Legitimate Resource Name or Location (T1036.005): Fileless ELF execution from an anonymous O_TMPFILE inode',
        description:
          'Fileless ELF execution from an anonymous O_TMPFILE inode. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA loader executes an ELF payload from an anonymous O_TMPFILE inode using execveat with AT_EMPTY_PATH, avoiding memfd_create artifacts. The kernel reports the executable as /tmp/#<inode> (deleted) while the process name is spoofed.\n\nSource: https://matheuzsecurity.github.io/hacking/fileless-loader-bypassing-elastic-memfd/\n\nTechniques: T1036.005 Match Legitimate Resource Name or Location\n\nData sources: logs-endpoint.events.process-*, logs-auditd_manager.auditd-*\n\nSeverity: high\n\nES|QL: not executed\n\nReport excerpt:\n"process.executable: /tmp/#220 (deleted)"\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1036.005',
          all_techniques: ['T1036.005'],
          severity: 'high',
          data_sources: ['logs-endpoint.events.process-*', 'logs-auditd_manager.auditd-*'],
          source_report:
            'https://matheuzsecurity.github.io/hacking/fileless-loader-bypassing-elastic-memfd/',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-auditd_manager.auditd-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://matheuzsecurity.github.io/hacking/fileless-loader-bypassing-elastic-memfd/',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '6fdd522d-421c-49f5-884e-0f278c388276',
        name: 'Potential Fileless Execution via O_TMPFILE',
      },
      alternateRuleNames: [],
      decoyRuleNames: [
        'Potential Fileless Execution via Unusual memfd Create Call',
        'Binary Executed from Shared Memory Directory',
      ],
    },
    metadata: {
      difficulty: 'hard',
      whatItTests:
        'Near-miss decoy: the memfd_create fileless rule shares the technique but not the primitive.',
      passCriteria: 'Pass if the primary is first. memfd rule first is a fail.',
    },
  },
  {
    input: {
      gapId: 'RS-16',
      indicator: {
        type: 'security.coverage',
        title:
          'Match Legitimate Resource Name or Location (T1036.005): Malware changes its own process name through a syscall',
        description:
          'Malware changes its own process name through a syscall. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nMalware renames its own process with prctl(PR_SET_NAME) so ps and top show a benign or kernel-thread-like name (process name stomping). Only syscall auditing records the change.\n\nSource: https://haxrob.net/process-name-stomping/\n\nTechniques: T1036.005 Match Legitimate Resource Name or Location\n\nData sources: logs-auditd_manager.auditd-*, auditbeat-*\n\nSeverity: high\n\nES|QL: not executed\n\nReport excerpt:\n"A process that overwrites it\'s own argv[0] will change /proc/[pid]/cmdline. The original process name will be disguised with default arguments to utilities like ps or top."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1036.005',
          all_techniques: ['T1036.005'],
          severity: 'high',
          data_sources: ['logs-auditd_manager.auditd-*', 'auditbeat-*'],
          source_report: 'https://haxrob.net/process-name-stomping/',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-auditd_manager.auditd-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://auditbeat-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://haxrob.net/process-name-stomping/',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: 'fef62ecf-0260-4b71-848b-a8624b304828',
        name: 'Potential Process Name Stomping with Prctl',
      },
      alternateRuleNames: [],
      decoyRuleNames: [
        'Executable Masquerading as Kernel Process',
        'Unusual Execution from Kernel Thread (kthreadd) Parent',
      ],
    },
    metadata: {
      difficulty: 'hard',
      whatItTests:
        'Process-name masquerading, but only syscall (auditd) telemetry sees it; process-name decoys.',
      passCriteria: 'Pass if the primary is first.',
    },
  },
  {
    input: {
      gapId: 'RS-17',
      indicator: {
        type: 'security.coverage',
        title:
          'Masquerade Task or Service (T1036.004): Executables named after kernel threads on disk',
        description:
          'Executables named after kernel threads on disk. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA cryptominer and rootkit sample runs executables named after kernel threads (kthreadd, kworker, bioset) from disk so they blend into process listings.\n\nSource: https://sandflysecurity.com/blog/linux-stealth-rootkit-malware-with-edr-evasion-analyzed/\n\nTechniques: T1036.004 Masquerade Task or Service; T1036.005 Match Legitimate Resource Name or Location; T1564 Hide Artifacts\n\nData sources: logs-endpoint.events.process-*\n\nSeverity: high\n\nES|QL: not executed\n\nReport excerpt:\n"There were two processes called *bioset* and *kthreadd*."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1036.004',
          all_techniques: ['T1036.004', 'T1036.005', 'T1564'],
          severity: 'high',
          data_sources: ['logs-endpoint.events.process-*'],
          source_report:
            'https://sandflysecurity.com/blog/linux-stealth-rootkit-malware-with-edr-evasion-analyzed/',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://sandflysecurity.com/blog/linux-stealth-rootkit-malware-with-edr-evasion-analyzed/',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '202829f6-0271-4e88-b882-11a655c590d4',
        name: 'Executable Masquerading as Kernel Process',
      },
      alternateRuleNames: ['Unusual Execution from Kernel Thread (kthreadd) Parent'],
      decoyRuleNames: [
        'Potential Process Name Stomping with Prctl',
        'Suspicious File Creation via Kworker',
        'Network Activity Detected via Kworker',
      ],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests:
        'Name-masquerade variant (binary named like a kernel thread) vs. the prctl rule in RS-16.',
      passCriteria: 'Primary or its alternate first.',
    },
  },
  {
    input: {
      gapId: 'RS-18',
      indicator: {
        type: 'security.coverage',
        title:
          'Rootkit (T1014): Magic signal numbers sent through kill to control a kernel rootkit',
        description:
          'Magic signal numbers sent through kill to control a kernel rootkit. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nA Diamorphine-style LKM rootkit hooks the kill syscall and reacts to special signal numbers sent by an unprivileged process to hide or unhide the module, hide processes and grant root.\n\nSource: https://github.com/m0nad/Diamorphine/blob/master/diamorphine.c#L302\n\nTechniques: T1014 Rootkit\n\nData sources: logs-auditd_manager.auditd-*, auditbeat-*\n\nSeverity: high\n\nES|QL: not executed\n\nReport excerpt:\n"LKM rootkit for Linux Kernels 2.6.x-6.x (x86/x86_64 and ARM/64)"\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1014',
          all_techniques: ['T1014'],
          severity: 'high',
          data_sources: ['logs-auditd_manager.auditd-*', 'auditbeat-*'],
          source_report: 'https://github.com/m0nad/Diamorphine/blob/master/diamorphine.c#L302',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-auditd_manager.auditd-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://auditbeat-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://github.com/m0nad/Diamorphine/blob/master/diamorphine.c#L302',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: 'cf307a5a-d503-44a4-8158-db196d99c9df',
        name: 'Unusual Kill Signal',
      },
      alternateRuleNames: [],
      decoyRuleNames: ['Kernel Driver Load', 'Kernel Driver Load by non-root User'],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests: 'Rootkit trigger via magic signal; only auditd sees it; module-load decoys.',
      passCriteria: 'Pass if the primary is first.',
    },
  },
  {
    input: {
      gapId: 'RS-19',
      indicator: {
        type: 'security.coverage',
        title:
          'Multi-hop Proxy (T1090.003): Operator pivots through chained SOCKS proxies from a compromised Linux host',
        description:
          'Operator pivots through chained SOCKS proxies from a compromised Linux host. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nAn operator who has compromised a Linux host routes scanners and shells through chained SOCKS proxies using proxychains to reach internal networks while hiding their origin.\n\nSource: https://blog.bitsadmin.com/living-off-the-foreign-land-windows-as-offensive-platform\n\nTechniques: T1090.003 Multi-hop Proxy; T1572 Protocol Tunneling\n\nData sources: logs-endpoint.events.process-*, logs-auditd_manager.auditd-*\n\nSeverity: medium\n\nES|QL: not executed\n\nReport excerpt:\n"it is also possible to use software like proxychains-ng[5](#fn:5) to force software in which no SOCKS can be configured to go over the SOCKS server."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1090.003',
          all_techniques: ['T1090.003', 'T1572'],
          severity: 'medium',
          data_sources: ['logs-endpoint.events.process-*', 'logs-auditd_manager.auditd-*'],
          source_report:
            'https://blog.bitsadmin.com/living-off-the-foreign-land-windows-as-offensive-platform',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'index://logs-auditd_manager.auditd-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://blog.bitsadmin.com/living-off-the-foreign-land-windows-as-offensive-platform',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '4b868f1f-15ff-4ba3-8c11-d5a7a6356d37',
        name: 'ProxyChains Activity',
      },
      alternateRuleNames: ['Suspicious Utility Launched via ProxyChains'],
      decoyRuleNames: [
        'Potential Linux Tunneling and/or Port Forwarding',
        'Potential Protocol Tunneling via EarthWorm',
        'Potential Protocol Tunneling via Chisel Client',
      ],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests: 'Pivoting through SOCKS chains; tunneling decoys; two rules for this tool.',
      passCriteria: 'Pass if either proxychains rule is first.',
    },
  },
  {
    input: {
      gapId: 'RS-20',
      indicator: {
        type: 'security.coverage',
        title: 'Input Capture (T1056): SSH passwords captured by tracing the SSH daemon',
        description:
          'SSH passwords captured by tracing the SSH daemon. Coverage review needed: which existing detection rule addresses this threat? ES|QL not executed.',
        content:
          'Threat:\nAn attacker with root stops the running SSH daemon and restarts it under strace, or attaches a tracer, to capture the read and write system calls that carry user passwords in cleartext.\n\nSource: https://dfir.ch/posts/strace/\n\nTechniques: T1056; T1556 Modify Authentication Process\n\nData sources: logs-endpoint.events.process-*\n\nSeverity: medium\n\nES|QL: not executed\n\nReport excerpt:\n"ltrace is a program that simply runs the specified command until it exits. It intercepts and records the dynamic library calls which are called by the executed process and the signals which are received by that process."\n\nCoverage status: no detection rule is currently mapped to this threat.',
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          technique: 'T1056',
          all_techniques: ['T1056', 'T1556'],
          severity: 'medium',
          data_sources: ['logs-endpoint.events.process-*'],
          source_report: 'https://dfir.ch/posts/strace/',
          esql_status: 'not_executed',
        },
        references: [
          {
            uri: 'index://logs-endpoint.events.process-*',
            relation: 'derived_from',
            description: 'Data source named by the gap',
          },
          {
            uri: 'https://dfir.ch/posts/strace/',
            relation: 'supported_by',
            description: 'Threat report',
          },
        ],
      },
    },
    output: {
      verdict: 'prebuilt_available',
      primaryRule: {
        ruleId: '9eaa3fb1-3f70-48ed-bb0e-d7ae4d3c8f28',
        name: 'Potential SSH Password Grabbing via strace',
      },
      alternateRuleNames: [],
      decoyRuleNames: [
        'Potential OpenSSH Backdoor Logging Activity',
        'Renaming of OpenSSH Binaries',
      ],
    },
    metadata: {
      difficulty: 'medium',
      whatItTests: 'Credential capture by tracing a daemon; SSH-themed decoys.',
      passCriteria: 'Pass if the primary is first or second.',
    },
  },
];
