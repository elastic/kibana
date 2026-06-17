/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferenceRule } from './sample_rules';

/**
 * Complex / multi-domain prompt/rule pairs sourced from elastic/detection-rules.
 * These cover cross-platform, supply-chain, and container/Kubernetes scenarios that
 * require broader context to generate correctly.
 *
 * Sources:
 *   https://github.com/elastic/detection-rules/blob/main/rules/
 */
export const complexPairs: ReferenceRule[] = [
  // Complex 1 — https://github.com/elastic/detection-rules/blob/main/rules/cross-platform/execution_nodejs_pre_or_post_install_script_execution.toml
  {
    id: 'nodejs-npm-pre-post-install-script',
    name: 'Node.js Pre or Post-Install Script Execution',
    prompt:
      'This rule detects the execution of Node.js pre or post-install scripts. These scripts are executed by the Node.js package manager (npm) during the installation of packages. Adversaries may abuse this technique to execute arbitrary commands on the system and establish persistence. This activity was observed in the wild as part of the Shai-Hulud worm.\n\nAvailable data: logs-endpoint.events.*',
    description:
      'Detects the execution of Node.js pre or post-install scripts executed by npm during package installation. Adversaries may abuse this technique to execute arbitrary commands on the system and establish persistence.',
    query: `sequence by host.id with maxspan=10s
 [process where host.os.type in ("linux", "macos") and event.type == "start" and event.action in ("exec", "ProcessRollup2", "start") and process.name == "node" and process.args == "install"] by process.entity_id
 [process where host.os.type in ("linux", "macos") and event.type == "start" and event.action in ("exec", "ProcessRollup2", "start") and process.parent.name == "node"] by process.parent.entity_id`,
    threat: [
      { technique: 'T1059', tactic: 'TA0002', subtechnique: 'Unix Shell' },
      { technique: 'T1204', tactic: 'TA0002', subtechnique: 'Malicious Library' },
      { technique: 'T1543', tactic: 'TA0003' },
      { technique: 'T1574', tactic: 'TA0003' },
    ],
    severity: 'medium',
    tags: [
      'Domain: Endpoint',
      'OS: Linux',
      'OS: macOS',
      'Use Case: Threat Detection',
      'Tactic: Persistence',
      'Tactic: Execution',
      'Tactic: Defense Evasion',
      'Data Source: Elastic Defend',
      'Resources: Investigation Guide',
      'Data Source: Crowdstrike',
      'Data Source: SentinelOne',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'execution',
    type: 'eql',
    language: 'eql',
    esqlQuery: `FROM logs-endpoint.events.* metadata _id, _version, _index
| WHERE host.os.type IN ("linux", "macos") AND event.type == "start"
    AND event.action IN ("exec", "ProcessRollup2", "start")
    AND (
      (process.name == "node" AND process.args == "install")
      OR
      process.parent.name == "node"
    )
| EVAL Esql.step = CASE(
    process.name == "node" AND process.args == "install", "npm_install",
    process.parent.name == "node", "node_child",
    "unknown"
  )
| STATS Esql.step_count = COUNT_DISTINCT(Esql.step) BY host.id
| WHERE Esql.step_count >= 2`,
  },

  // Complex 2 — https://github.com/elastic/detection-rules/blob/main/rules/cross-platform/execution_suspicious_genai_descendant_activity.toml
  // TODO: This file returns 404 in elastic/detection-rules as of 2026-02-19 — update query/threat
  //       once the rule is published to the repo.
  {
    id: 'suspicious-genai-descendant-activity',
    name: 'Suspicious GenAI Coding Assistant Descendant Activity',
    prompt:
      'Identifies suspicious network utilities, reconnaissance commands, or shell-based socket connections executed by descendant processes of GenAI coding assistants (Cursor, Claude, Copilot, etc.). This rule uses process ancestry tracking to detect activity from grandchildren and beyond, not just direct children. It specifically detects bash /dev/tcp and /dev/udp socket techniques commonly used as netcat alternatives. This may indicate prompt injection, compromised MCP servers, or malicious dependency exploitation.\n\nAvailable data: logs-endpoint.events.*',
    description:
      'Identifies suspicious network utilities, reconnaissance commands, or shell-based socket connections executed by descendant processes of GenAI coding assistants. This may indicate prompt injection, compromised MCP servers, or malicious dependency exploitation.',
    query: '',
    threat: [
      { technique: 'T1059', tactic: 'TA0002' },
      { technique: 'T1071', tactic: 'TA0011' },
    ],
    severity: 'medium',
    tags: [
      'Domain: Endpoint',
      'OS: Linux',
      'OS: macOS',
      'Use Case: Threat Detection',
      'Tactic: Execution',
      'Tactic: Command and Control',
      'Data Source: Elastic Defend',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'execution',
    type: 'eql',
    language: 'eql',
  },

  // Complex 3 — https://github.com/elastic/detection-rules/blob/main/rules/cross-platform/execution_via_github_runner_with_runner_tracking_id_tampering_via_env_vars.toml
  {
    id: 'github-runner-tracking-id-tampering',
    name: 'Tampering with RUNNER_TRACKING_ID in GitHub Actions Runners',
    prompt:
      'This rule detects processes spawned by GitHub Actions runners where "RUNNER_TRACKING_ID" is overridden from its default "github_*" value. Such tampering has been associated with attempts to evade runner tracking/cleanup on self-hosted runners, including behavior observed in the Shai-Hulud 2.0 npm worm campaign.\n\nAvailable data: logs-endpoint.events.*',
    description:
      'Detects processes spawned by GitHub Actions runners where RUNNER_TRACKING_ID is overridden from its default "github_*" value. Such tampering has been associated with attempts to evade runner tracking/cleanup on self-hosted runners.',
    query: `process where host.os.type in ("linux", "macos") and event.type == "start" and event.action == "exec" and
process.parent.name in ("Runner.Worker", "Runner.Listener") and process.env_vars like~ "RUNNER_TRACKING_ID*" and
not process.env_vars like~ "RUNNER_TRACKING_ID=github_*"`,
    threat: [
      { technique: 'T1059', tactic: 'TA0002' },
      {
        technique: 'T1195',
        tactic: 'TA0001',
        subtechnique: 'Compromise Software Dependencies and Development Tools',
      },
      { technique: 'T1562', tactic: 'TA0005', subtechnique: 'Disable or Modify Tools' },
    ],
    severity: 'medium',
    tags: [
      'Domain: Endpoint',
      'OS: Linux',
      'OS: macOS',
      'Use Case: Threat Detection',
      'Tactic: Execution',
      'Tactic: Initial Access',
      'Tactic: Defense Evasion',
      'Data Source: Elastic Defend',
      'Resources: Investigation Guide',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'execution',
    type: 'eql',
    language: 'eql',
    esqlQuery: `FROM logs-endpoint.events.* metadata _id, _version, _index
| WHERE host.os.type IN ("linux", "macos") AND event.type == "start" AND event.action == "exec"
    AND process.parent.name IN ("Runner.Worker", "Runner.Listener")
    AND TO_LOWER(process.env_vars) like "runner_tracking_id*"
    AND NOT TO_LOWER(process.env_vars) like "runner_tracking_id=github_*"`,
  },

  // Complex 4 — https://github.com/elastic/detection-rules/blob/main/rules/linux/execution_suspicious_pod_or_container_creation_command_execution.toml
  {
    id: 'suspicious-pod-container-creation-command',
    name: 'Pod or Container Creation with Suspicious Command-Line',
    prompt:
      'This rule detects the creation of pods or containers that execute suspicious commands often associated with persistence or privilege escalation techniques. Attackers may use container orchestration tools like kubectl or container runtimes like docker to create pods or containers that run shell commands with arguments that indicate attempts to establish persistence (e.g., modifying startup scripts, creating backdoors).\n\nAvailable data: logs-endpoint.events.*',
    description:
      'Detects the creation of pods or containers that execute suspicious commands often associated with persistence or privilege escalation techniques. Attackers may use container orchestration tools like kubectl or container runtimes like docker to create pods or containers that run shell commands with arguments that indicate attempts to establish persistence.',
    query: `process where host.os.type == "linux" and event.type == "start" and event.action in ("exec", "exec_event", "start", "ProcessRollup2", "executed", "process_started") and (
 (process.name == "kubectl" and process.args == "run" and process.args == "--restart=Never" and process.args == "--") or
 (process.name in ("docker", "nerdctl", "ctl") and process.args == "run")
) and 
process.args in ("bash", "dash", "sh", "tcsh", "csh", "zsh", "ksh", "fish") and
process.command_line like~ (
 "*atd*", "*cron*", "*/etc/rc.local*", "*/dev/tcp/*", "*/etc/init.d*", "*/etc/sudoers*", "*base64 *",
 "*/etc/profile*", "*/etc/ssh*", "*/home/*/.ssh/*", "*/root/.ssh*", "*~/.ssh/*", "*autostart*",
 "* ncat *", "* nc *", "* netcat *", "*socat*", "*/tmp/*", "*/dev/shm/*", "*/var/tmp/*"
)`,
    threat: [
      { technique: 'T1059', tactic: 'TA0002', subtechnique: 'Unix Shell' },
      { technique: 'T1609', tactic: 'TA0002' },
      { technique: 'T1611', tactic: 'TA0004' },
      { technique: 'T1053', tactic: 'TA0003', subtechnique: 'Cron' },
    ],
    severity: 'medium',
    tags: [
      'Domain: Endpoint',
      'Domain: Container',
      'OS: Linux',
      'Use Case: Threat Detection',
      'Tactic: Execution',
      'Tactic: Privilege Escalation',
      'Tactic: Persistence',
      'Data Source: Elastic Defend',
      'Data Source: Elastic Endgame',
      'Data Source: Auditd Manager',
      'Data Source: Crowdstrike',
      'Data Source: SentinelOne',
      'Resources: Investigation Guide',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'execution',
    type: 'eql',
    language: 'eql',
    esqlQuery: `FROM logs-endpoint.events.* metadata _id, _version, _index
| WHERE host.os.type == "linux" AND event.type == "start"
    AND event.action IN ("exec", "exec_event", "start", "ProcessRollup2", "executed", "process_started")
    AND (
      (process.name == "kubectl" AND process.args == "run" AND process.args == "--restart=Never" AND process.args == "--")
      OR
      (process.name IN ("docker", "nerdctl", "ctl") AND process.args == "run")
    )
    AND process.args IN ("bash", "dash", "sh", "tcsh", "csh", "zsh", "ksh", "fish")
    AND TO_LOWER(process.command_line) like (
      "*atd*", "*cron*", "*/etc/rc.local*", "*/dev/tcp/*", "*/etc/init.d*", "*/etc/sudoers*", "*base64 *",
      "*/etc/profile*", "*/etc/ssh*", "*/home/*/.ssh/*", "*/root/.ssh*", "*~/.ssh/*", "*autostart*",
      "* ncat *", "* nc *", "* netcat *", "*socat*", "*/tmp/*", "*/dev/shm/*", "*/var/tmp/*"
    )`,
  },

  // Complex 5 — https://github.com/elastic/detection-rules/blob/main/rules/linux/lateral_movement_kubeconfig_file_activity.toml
  {
    id: 'kubeconfig-file-creation-or-modification',
    name: 'Kubeconfig File Creation or Modification',
    prompt:
      'The kubeconfig file is a critical component in Kubernetes environments, containing configuration details for accessing and managing Kubernetes clusters. Attackers may attempt to get access to, create or modify kubeconfig files to gain unauthorized initial access to Kubernetes clusters or move laterally within the cluster.\n\nAvailable data: logs-endpoint.events.*',
    description:
      'The kubeconfig file is a critical component in Kubernetes environments, containing configuration details for accessing and managing Kubernetes clusters. Attackers may attempt to get access to, create or modify kubeconfig files to gain unauthorized initial access to Kubernetes clusters or move laterally within the cluster.',
    query: `file where host.os.type == "linux" and event.type != "deletion" and file.path like (
 "/root/.kube/config",
 "/home/*/.kube/config",
 "/etc/kubernetes/admin.conf",
 "/etc/kubernetes/super-admin.conf",
 "/etc/kubernetes/kubelet.conf",
 "/etc/kubernetes/controller-manager.conf",
 "/etc/kubernetes/scheduler.conf",
 "/var/lib/*/kubeconfig"
) and not (
 process.name in ("kubeadm", "kubelet", "vcluster", "minikube", "kind") or
 (process.name == "sed" and ?file.Ext.original.name like "sed*") or
 process.executable like (
 "/usr/local/bin/k3d", "/usr/local/aws-cli/*/dist/aws", "/usr/local/bin/ks", "/usr/local/bin/aws",
 "/usr/local/bin/kubectl"
 )
)`,
    threat: [
      { technique: 'T1550', tactic: 'TA0008' },
      { technique: 'T1550', tactic: 'TA0005' },
      { technique: 'T1078', tactic: 'TA0001' },
    ],
    severity: 'medium',
    tags: [
      'Domain: Endpoint',
      'Domain: Container',
      'Domain: Kubernetes',
      'OS: Linux',
      'Use Case: Threat Detection',
      'Tactic: Lateral Movement',
      'Tactic: Defense Evasion',
      'Tactic: Initial Access',
      'Data Source: Elastic Defend',
      'Data Source: Elastic Defend for Containers',
      'Resources: Investigation Guide',
    ],
    riskScore: 47,
    from: 'now-9m',
    category: 'lateral_movement',
    type: 'eql',
    language: 'eql',
    esqlQuery: `FROM logs-endpoint.events.* metadata _id, _version, _index
| WHERE host.os.type == "linux" AND event.type != "deletion"
    AND file.path like (
      "/root/.kube/config",
      "/home/*/.kube/config",
      "/etc/kubernetes/admin.conf",
      "/etc/kubernetes/super-admin.conf",
      "/etc/kubernetes/kubelet.conf",
      "/etc/kubernetes/controller-manager.conf",
      "/etc/kubernetes/scheduler.conf",
      "/var/lib/*/kubeconfig"
    )
    AND NOT (
      process.name IN ("kubeadm", "kubelet", "vcluster", "minikube", "kind") OR
      (process.name == "sed" AND file.Ext.original.name like "sed*") OR
      process.executable like (
        "/usr/local/bin/k3d", "/usr/local/aws-cli/*/dist/aws", "/usr/local/bin/ks",
        "/usr/local/bin/aws", "/usr/local/bin/kubectl"
      )
    )`,
  },
];
