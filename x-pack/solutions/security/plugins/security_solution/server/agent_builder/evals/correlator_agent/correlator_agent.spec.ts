/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../evaluate';

/**
 * Correlator Agent eval suite.
 *
 * Validates that the correlator agent:
 *  - Identifies cross-host campaign patterns from related alerts
 *  - Links alerts via shared network infrastructure (C2 correlation)
 *  - Identifies coordinated campaigns from temporal clustering
 *  - Maps attack chains to MITRE ATT&CK techniques
 *  - Identifies entity clusters (host, user, network)
 */
evaluate.describe(
  'Correlator Agent',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate(
      'given related alerts across 3 hosts should identify cross-host campaign pattern',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'correlator-agent: cross-host-campaign',
            description:
              'Validates the correlator agent identifies a cross-host campaign pattern when related alerts span multiple hosts.',
            examples: [
              {
                input: {
                  question:
                    'Correlate the following alerts: 1) Host "web-prod-01" triggered "Suspicious PowerShell Execution" at 2024-03-15T14:00:00Z with source process powershell.exe downloading a payload from 185.220.101.42. 2) Host "db-prod-03" triggered "Unusual Outbound Connection" at 2024-03-15T14:05:00Z connecting to 185.220.101.42 on port 443. 3) Host "app-prod-02" triggered "Credential Dumping Detected" at 2024-03-15T14:12:00Z with Mimikatz signatures found in memory. All three hosts are in the same VLAN (10.0.50.0/24) and share the same Active Directory domain "corp.example.com".',
                },
                output: {
                  criteria: [
                    'The response MUST identify a cross-host campaign pattern linking all three hosts (web-prod-01, db-prod-03, app-prod-02)',
                    'The response MUST reference the shared C2 IP (185.220.101.42) as a common indicator connecting at least two of the hosts',
                    'The response MUST note the temporal proximity of the alerts (all within ~12 minutes) as evidence of coordinated activity',
                    'The response MUST identify the network relationship (same VLAN 10.0.50.0/24) as a lateral movement corridor',
                    'The response MUST produce a correlation summary or campaign identifier grouping the alerts together',
                  ],
                  toolCalls: [
                    {
                      id: 'security.alerts',
                      criteria: [
                        'The alerts tool should be called to retrieve details about the related alerts across the three hosts',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Correlate' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'given alerts with shared C2 infrastructure should link via network correlation',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'correlator-agent: shared-c2-infrastructure',
            description:
              'Validates the correlator agent links alerts via shared command-and-control infrastructure when multiple hosts communicate with the same C2 endpoints.',
            examples: [
              {
                input: {
                  question:
                    'Correlate the following alerts: Host "endpoint-42" triggered "Beacon Activity Detected" connecting to domain "update-service.malware-infra.net" (resolving to 198.51.100.10) every 60 seconds with jitter. Host "endpoint-77" triggered "Suspicious DNS Query" resolving "cdn-relay.malware-infra.net" (resolving to 198.51.100.11) which is in the same /24 subnet as the first C2. Host "endpoint-15" triggered "Encrypted Channel to Known Bad IP" connecting to 198.51.100.10 on port 8443. All three endpoints are in different departments but the C2 infrastructure shares the same ASN and domain registrar.',
                },
                output: {
                  criteria: [
                    'The response MUST identify the shared C2 infrastructure (malware-infra.net domain family and 198.51.100.0/24 subnet) as the linking factor',
                    'The response MUST group all three endpoints (endpoint-42, endpoint-77, endpoint-15) as part of the same campaign based on network indicators',
                    'The response MUST highlight the infrastructure overlap (same ASN, same domain registrar, same /24 subnet)',
                    'The response MUST provide a confidence assessment for the correlation',
                    'The response MUST recommend network-level IOC blocking across the shared infrastructure',
                  ],
                  toolCalls: [
                    {
                      id: 'security.threat_intel_enrich',
                      criteria: [
                        'The threat intelligence enrichment tool should be called to check the C2 IPs or domains against known threat intelligence',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Correlate' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'given temporal clustering of alerts should identify coordinated campaign',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'correlator-agent: temporal-clustering',
            description:
              'Validates the correlator agent identifies a coordinated campaign from temporal clustering of alerts across the environment.',
            examples: [
              {
                input: {
                  question:
                    'Correlate the following burst of alerts that occurred within a 3-minute window: At 2024-03-15T09:00:00Z, 5 hosts simultaneously triggered "Ransomware File Encryption Detected" alerts. The hosts are: "file-server-01", "file-server-02", "backup-server-01", "nas-01", "workstation-admin-05". Each alert shows rapid file renaming with .encrypted extension. Prior to this burst, at 2024-03-15T08:45:00Z, "workstation-admin-05" triggered "Suspicious RDP Lateral Movement" to each of the other 4 hosts. At 2024-03-15T08:30:00Z, "workstation-admin-05" triggered "Credential Theft via LSASS Memory Access".',
                },
                output: {
                  criteria: [
                    'The response MUST identify this as a coordinated ransomware campaign with a clear attack chain timeline',
                    'The response MUST identify "workstation-admin-05" as the initial compromise point (patient zero) based on the credential theft alert preceding the lateral movement',
                    'The response MUST note the temporal clustering of the 5 simultaneous ransomware alerts as evidence of automated/scripted deployment',
                    'The response MUST reconstruct the attack timeline: credential theft (08:30) -> lateral movement (08:45) -> ransomware deployment (09:00)',
                    'The response MUST flag the severity as critical given the scope (5 hosts including backup infrastructure)',
                  ],
                  toolCalls: [
                    {
                      id: 'security.alerts',
                      criteria: [
                        'The alerts tool should be called to retrieve the full cluster of alerts across the affected hosts',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Correlate' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'should map attack chain to MITRE ATT&CK techniques',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'correlator-agent: mitre-attack-mapping',
            description:
              'Validates the correlator agent maps correlated alerts to a MITRE ATT&CK attack chain with proper technique identification.',
            examples: [
              {
                input: {
                  question:
                    'Correlate and map the following attack chain to MITRE ATT&CK: 1) "Phishing Email Delivered" - user "jdoe" received a macro-enabled Word document at 2024-03-15T10:00:00Z. 2) "Malicious Macro Execution" - Word.exe spawned cmd.exe on host "ws-jdoe-01" at 2024-03-15T10:02:00Z. 3) "PowerShell Download Cradle" - powershell.exe downloaded a second-stage payload from evil.com at 2024-03-15T10:03:00Z. 4) "Persistence via Registry Run Key" - a new Run key was added pointing to the downloaded payload at 2024-03-15T10:04:00Z. 5) "Credential Dumping" - Mimikatz-like activity detected dumping LSASS at 2024-03-15T10:10:00Z. 6) "Lateral Movement via WMI" - wmic.exe was used to execute commands on "dc-prod-01" at 2024-03-15T10:15:00Z.',
                },
                output: {
                  criteria: [
                    'The response MUST map at least 4 distinct MITRE ATT&CK techniques from the attack chain',
                    'The response MUST include Initial Access technique (T1566 - Phishing or sub-technique)',
                    'The response MUST include Execution technique (T1059 - Command and Scripting Interpreter or T1204 - User Execution)',
                    'The response MUST include Persistence technique (T1547.001 - Registry Run Keys)',
                    'The response MUST include Credential Access technique (T1003 - OS Credential Dumping)',
                    'The response MUST present the techniques in attack-chain order showing the progression from initial access through lateral movement',
                  ],
                },
                metadata: { query_intent: 'Correlate' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'should identify entity clusters (host, user, network)',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'correlator-agent: entity-clusters',
            description:
              'Validates the correlator agent identifies entity clusters by grouping related hosts, users, and network indicators.',
            examples: [
              {
                input: {
                  question:
                    'Correlate the following alerts and identify entity clusters: Alert 1: User "admin-smith" logged into "dc-prod-01" from IP 10.0.1.50 and ran "net group domain admins /domain". Alert 2: User "admin-smith" logged into "exchange-01" from IP 10.0.1.50 and exported mailbox data. Alert 3: User "svc-backup" (a service account also used by admin-smith per HR records) logged into "backup-server-01" from IP 10.0.1.50 and initiated an unscheduled backup deletion. Alert 4: An outbound connection from "dc-prod-01" to external IP 203.0.113.77 transferred 2GB of data. Alert 5: DNS queries from "exchange-01" to "exfil.attacker-domain.com" resolving to 203.0.113.77. Identify all entity clusters (user, host, network) and their relationships.',
                },
                output: {
                  criteria: [
                    'The response MUST identify a user entity cluster linking "admin-smith" and "svc-backup" as related entities (same operator)',
                    'The response MUST identify a host entity cluster grouping "dc-prod-01", "exchange-01", and "backup-server-01" as compromised hosts',
                    'The response MUST identify a network entity cluster linking source IP 10.0.1.50 and exfiltration endpoint 203.0.113.77 / exfil.attacker-domain.com',
                    'The response MUST map the relationships between clusters (e.g., user cluster accessed host cluster, host cluster communicated with network cluster)',
                    'The response MUST produce a structured entity graph or relationship summary showing at least 3 entity types with their connections',
                  ],
                  toolCalls: [
                    {
                      id: 'security.entity_store_query',
                      criteria: [
                        'The entity store query tool should be called to enrich entity profiles for the involved hosts and/or users',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Correlate' },
              },
            ],
          },
        });
      }
    );
  }
);
