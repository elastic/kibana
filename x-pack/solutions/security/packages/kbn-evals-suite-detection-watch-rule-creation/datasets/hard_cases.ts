/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hard cases for the Rule Creation Worker eval.
 *
 * Each case is a complex or ambiguous gap scenario adapted from
 * {@link ../../kbn-evals-suite-security-ai-rules/datasets/complex_pairs.ts}.
 * Differences: converted from single-prompt to structured gap inputs; reference
 * queries rewritten as ES|QL (originals were EQL or left blank).
 *
 * "Hard" here means one or more of:
 *   - Multi-technique: agent must choose the right level of specificity
 *   - Unusual data source: cloud or container logs, not standard endpoint
 *   - Sparse evidence: low confidence, agent must still produce a usable rule
 */

import type { RuleCreationExample } from './golden';

export const hardCases: RuleCreationExample[] = [
  // Hard 1 — T1195.002 (Supply Chain: Compromise Software Dependencies)
  // npm lifecycle hooks (preinstall/postinstall) used to run arbitrary commands.
  // Adapted from: kbn-evals-suite-security-ai-rules — nodejs-npm-pre-post-install-script
  {
    id: 'hard-t1195-002-npm-lifecycle-hook',
    input: {
      technique: 'T1195.002',
      gap_description:
        'No coverage for malicious npm package lifecycle scripts (preinstall/postinstall) ' +
        'that spawn child processes during npm install. Existing supply-chain rules focus on ' +
        'binary drops, not script-based execution triggered by the Node.js package manager.',
      evidence:
        'Threat intel on the Shai-Hulud worm campaign confirmed it propagated via npm ' +
        'postinstall hooks. Hunt on Linux/macOS endpoints found node processes spawning ' +
        'unexpected children during package installation on 6 developer workstations.',
      confidence: 0.8,
    },
    output: {
      mitreIds: ['T1195.002'],
      optionalMitreIds: ['T1195', 'T1059', 'T1204', 'T1543'],
      language: 'esql',
      esqlQuery: `FROM logs-endpoint.events.process-*
| WHERE host.os.type IN ("linux", "macos")
  AND event.type == "start"
  AND (
    (process.name == "node" AND process.args : "install")
    OR process.parent.name == "node"
  )
| STATS child_count = COUNT(*) BY host.id, process.parent.name, host.name
| WHERE process.parent.name == "node" AND child_count > 0`,
    },
  },

  // Hard 2 — T1562.008 (Impair Defenses: Disable or Modify Cloud Logs)
  // AWS Route 53 resolver query log config deleted — removes DNS visibility.
  // Adapted from: kbn-evals-suite-security-ai-rules — aws-route53-resolver-query-log-deletion
  {
    id: 'hard-t1562-008-aws-route53-log-deletion',
    input: {
      technique: 'T1562.008',
      gap_description:
        'No rule for deletion of AWS Route 53 Resolver query log configurations. ' +
        'Attackers delete these configs to remove DNS-level visibility before exfiltration ' +
        'or lateral movement. Existing cloud-log-tampering rules cover CloudTrail only.',
      evidence:
        'IR review of a compromised AWS account found DeleteResolverQueryLogConfig API calls ' +
        'immediately before C2 beacon traffic. No existing rule fired on this action.',
      confidence: 0.9,
    },
    output: {
      mitreIds: ['T1562.008'],
      optionalMitreIds: ['T1562'],
      language: 'esql',
      esqlQuery: `FROM logs-aws.cloudtrail-*
| WHERE event.provider == "route53resolver.amazonaws.com"
  AND event.action == "DeleteResolverQueryLogConfig"
  AND event.outcome == "success"
| STATS deletion_count = COUNT(*) BY cloud.account.id, user.name, source.ip
| WHERE deletion_count >= 1`,
    },
  },

  // Hard 3 — T1609 (Container Administration Command)
  // kubectl/docker used to run shells or persistence commands inside containers.
  // Adapted from: kbn-evals-suite-security-ai-rules — suspicious-pod-container-creation-command
  {
    id: 'hard-t1609-container-admin-command',
    input: {
      technique: 'T1609',
      gap_description:
        'No ES|QL rule detecting kubectl or docker used to run pods/containers with ' +
        'suspicious command-line arguments (bash, sh, curl, wget, cron modifications). ' +
        'Attackers use this to establish persistence or escape container boundaries.',
      evidence:
        'Red team exercise confirmed kubectl run with -- bash -c arguments is undetected ' +
        'across the container fleet. Observed on 2 Kubernetes nodes in staging environment.',
      confidence: 0.75,
    },
    output: {
      mitreIds: ['T1609'],
      optionalMitreIds: ['T1611', 'T1059', 'T1053'],
      language: 'esql',
      esqlQuery: `FROM logs-endpoint.events.process-*
| WHERE host.os.type == "linux"
  AND event.type == "start"
  AND process.name IN ("kubectl", "docker")
  AND process.command_line LIKE "*run*"
  AND (
    process.command_line LIKE "*bash*"
    OR process.command_line LIKE "*sh -c*"
    OR process.command_line LIKE "*wget*"
    OR process.command_line LIKE "*curl*"
  )
| STATS run_count = COUNT(*) BY host.name, user.name, process.command_line`,
    },
  },
  // Hard 4 — T1490 (Inhibit System Recovery) / T1070.004 (Indicator Removal: File Deletion)
  // Gap: shadow-copy deletion immediately before encryption is ransomware prep.
  // Sourced from: elastic/detection-rules — volume shadow copy deletion coverage.
  {
    id: 'hard-t1490-shadow-copy-deletion',
    input: {
      technique: 'T1490',
      gap_description:
        'No rule for deletion of Volume Shadow Copies via vssadmin or wmic. Ransomware ' +
        'operators destroy shadow copies to make encrypted files unrecoverable; existing ' +
        'ransomware rules trigger only after encryption starts.',
      evidence:
        'IR timeline shows "vssadmin delete shadows /all" 90 seconds before mass file ' +
        'encryption on a file server. No existing rule fired before the encryption event.',
      confidence: 0.9,
    },
    output: {
      mitreIds: ['T1490'],
      optionalMitreIds: ['T1070.004', 'T1486'],
      language: 'esql',
      esqlQuery: `FROM logs-endpoint.events.process-*
| WHERE host.os.type == "windows"
  AND event.type == "start"
  AND (
    process.command_line LIKE "*vssadmin*delete shadows*"
    OR process.command_line LIKE "*wmic*shadowcopy delete*"
  )`,
    },
  },

  // Hard 5 — T1136.001 (Create Account: Local Account), Windows
  // Gap: net user /add is trivially available and rarely alerted outside domain controllers.
  // Sourced from: elastic/detection-rules — windows local user creation coverage.
  {
    id: 'hard-t1136-001-local-account-creation',
    input: {
      technique: 'T1136.001',
      gap_description:
        'No ES|QL rule for local account creation on member servers via net user /add. ' +
        'Attackers establish persistence with a new local admin after initial access.',
      evidence:
        'Hunt found "net user svc_backup /add" followed by local-group membership changes on ' +
        'a member server; the account name matches no deployment manifest.',
      confidence: 0.85,
    },
    output: {
      mitreIds: ['T1136.001'],
      optionalMitreIds: ['T1136', 'T1098'],
      language: 'esql',
      esqlQuery: `FROM logs-endpoint.events.process-*
| WHERE host.os.type == "windows"
  AND event.type == "start"
  AND process.name IN ("net.exe", "net1.exe")
  AND process.command_line LIKE "*user*add*"`,
    },
  },
];
