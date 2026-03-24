/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import { createEntry } from '../../knowledge_base/entries/utils/create_entry';
import { documentEntry } from '../../knowledge_base/entries/trial_license_complete_tier/mocks/entries';

export const KB_ENTRIES = [
  {
    name: 'Host in NYC data center',
    text: 'Host "srv-win-east" sits in the New York City data center.',
  },
  {
    name: 'Network configuration',
    text: 'Here is the configuration of my network:\n```\nhostname Switch01\nip domain-lookup\nline con 0\n no password\n logging synchronous\n login\nenable password cisco\ninterface FastEthernet0/1\n switchport mode access\n switchport access vlan 1\n no shutdown\ninterface FastEthernet0/2\n switchport mode access\n switchport access vlan 1\n no shutdown\ninterface FastEthernet0/3\n switchport mode access\n switchport access vlan 1\n no shutdown\ninterface GigabitEthernet0/2\n switchport mode trunk\n switchport trunk allowed vlan all\n no shutdown\nno spanning-tree vlan 1\ncdp run\nline vty 0 4\n login\n transport input telnet\nno storm-control\nend\nwrite memory\n```',
  },
  {
    name: 'Threat Hunting playbook',
    text: '```\nThreat Hunting Playbook for Portscans on Windows Hosts Running SentinelOne:\nOverview: Port scanning is a technique used by attackers to identify open ports and services available on a networked device. By identifying open ports, attackers can determine potential vulnerabilities to exploit. Common tools used for port scanning include `nmap` and `PortQry`. Detecting port scanning activities is crucial for identifying potential reconnaissance activities by attackers and preventing subsequent attacks. Why Hunt for Portscans? 1. Early Detection of Reconnaissance: Port scans are often the first step in an attack. Detecting them early can help prevent further exploitation. 2. Identifying Misconfigurations: Port scans can reveal unintended open ports that may indicate misconfigurations. 3. Compliance and Security Posture: Regularly monitoring for port scans helps maintain a strong security posture and ensures compliance with security policies. ES|QL Query: ```esql FROM logs-* METADATA _id, _index, _version | WHERE process.name in ("nmap.exe", "PortQry.exe") and (process.command_line LIKE "*-p*" OR process.command_line LIKE "*-r*") | mv_expand process.args | WHERE (process.args LIKE "*-*" OR process.args LIKE "*:*") AND NOT process.args LIKE "-*" AND NOT process.args LIKE "?:*" AND NOT process.args LIKE "*.*.*.*-*" | DISSECT process.args "%{startp}:%{destp}" | DISSECT process.args "%{startp2}-%{destp2}" | GROK process.command_line "%{GREEDYDATA:content}%{IP:destination.ip}" | EVAL startp = to_integer(startp), destp = to_integer(destp), startp2 = to_integer(startp2), destp2 = to_integer(destp2) | EVAL portcount = CASE( process.name == "nmap.exe", destp2-startp2, destp-startp ) | WHERE portcount > 50 | KEEP @timestamp,_id,_index,_version,user.name,host.hostname,process.name,portcount,process.command_line,destination.ip | LIMIT 10000 ``` Saved Threat Hunting Timeline: [:mag_right: ES|QL - Port Scan]() SentinelOne Console: [SentinelOne Console]() Steps for Threat Hunting 1. Run the ES|QL Query: Execute the provided ES|QL query in Elastic Security to identify potential port scanning activities. 2. Analyze Results: Review the results for any suspicious activities. Pay close attention to the `process.name`, `user.name`, `host.hostname`, `portcount`, and `destination.ip`. 3. Investigate Further: - Process Command Line: Check the command line arguments for any unusual patterns or large port ranges. - User Context: Identify if the user associated with the process should be performing such activities. - Host Context: Determine if the host is expected to run port scanning tools. 4. Correlate with Other Data: Cross-reference with other logs and alerts to identify any related activities or anomalies. 5. Take Action: If malicious activity is confirmed, follow your incident response procedures to contain and mitigate the threat. By following this playbook, you can effectively hunt for and identify port scanning activities on your Windows hosts running SentinelOne, helping to secure your environment against potential threats.\n```',
  },
];

/**
 * Loads Knowledge Base Entries for running evaluations
 * @param supertest The supertest deps
 * @param log The tooling logger
 */
export const loadEvalKnowledgeBaseEntries = async (supertest: SuperTest.Agent, log: ToolingLog) => {
  for (const entry of KB_ENTRIES) {
    await createEntry({
      supertest,
      log,
      entry: {
        ...documentEntry,
        ...entry,
      },
    });
  }
};
