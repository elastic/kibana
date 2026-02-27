/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

/**
 * Skill for forensics analytics and deep endpoint investigation.
 * This skill provides knowledge and playbooks for conducting forensic investigations
 * using osquery, ES|QL, and other Elastic Security tools.
 *
 * Works in conjunction with the alert_triage skill — triage escalates here when
 * a true positive is confirmed and deep investigation is needed.
 */
export const FORENSICS_ANALYTICS_SKILL = defineSkillType({
  id: 'security.forensics_analytics',
  name: 'forensics_analytics',
  basePath: 'skills/security',
  description:
    'Deep forensic investigation capabilities including artifact collection, IOC hunting, and evidence analysis',
  content: `# Forensics Analytics

## Overview

This skill provides comprehensive forensic investigation capabilities for security incidents. It is typically invoked after the **alert_triage** skill confirms a true positive and escalates for deep investigation. Use this skill when you need to:
- Conduct deep endpoint investigations beyond initial alert triage
- **Query \\\`elastic_browser_history\\\`** — Elastic's custom osquery table for unified browser history across Chrome, Firefox, Edge, and Safari
- Collect and analyze forensic artifacts (files, processes, persistence, network)
- Hunt for Indicators of Compromise (IOCs) across the environment using **cross-endpoint \\\`elastic_browser_history\\\` sweeps**
- **Correlate threat intelligence** (VirusTotal enrichments) with endpoint evidence
- Build investigation timelines with correlated evidence
- **Determine the full blast radius** — discover compromised endpoints that have browser history but no network alerts
- Document findings for incident reports or legal proceedings

## CRITICAL: Execute Investigations — Don't Just Suggest

When conducting forensic analysis, you MUST:
1. **RUN the queries** — Execute osquery and ES|QL queries, don't just suggest them
2. **WAIT for results** — The osquery tool polls for up to 5 minutes automatically
3. **CORRELATE evidence** — Cross-reference findings across osquery, ES|QL, and threat intel
4. **DOCUMENT findings** — Create timelines and add notes to alerts/cases

## MANDATORY: Always Query \\\`elastic_browser_history\\\`

Every forensic investigation MUST include a query against the \\\`elastic_browser_history\\\` osquery table, regardless of the investigation type. This is Elastic's most powerful forensic capability:

**What makes \\\`elastic_browser_history\\\` unique:**
- It is a **custom Elastic osquery table** — not available in vanilla osquery
- It normalizes browser history from ALL installed browsers (Chrome, Firefox, Edge, Safari) into a **single unified schema**
- Standard osquery requires separate queries to each browser's native SQLite database (\\\`chrome_history\\\`, \\\`firefox_downloads\\\`, etc.) — this table eliminates that complexity
- It works on endpoints with **only Osquery installed** (no Elastic Defend required) — making it the only way to investigate browser activity on Osquery-only hosts
- A single query can sweep every browser on every endpoint simultaneously, revealing which users visited a malicious domain across the entire environment

**Why this is mandatory for every investigation:**
- Browser history is one of the most valuable forensic artifacts for establishing user activity timelines
- Phishing, C2 callbacks, data exfiltration, and social engineering all leave browser traces
- Even investigations that appear unrelated to browser activity often reveal browser-based initial access vectors
- For the RSA 2026 demo: this is how the forensic agent **discovers hidden compromised endpoints** that had no network alert — they only have browser history on disk

**Required steps for every investigation:**
1. If unsure of table name, search first: \\\`security.osquery.get_table_schema({ search: "browser", platform: "linux" })\\\` to find the correct table
2. Call \\\`security.osquery.get_table_schema({ tableName: "elastic_browser_history", agentId: "<agent_id>" })\\\` to discover the current column names
3. Query the table using the discovered schema to collect browser history evidence
4. Include the browser history findings in your investigation timeline and correlation analysis

## MANDATORY: Correlate with Threat Intelligence

When investigating domains, IPs, or file hashes, **always check for existing VirusTotal enrichments**:

\\\`\\\`\\\`
FROM logs-threatintel.virustotal-default
| WHERE threat.enrichments.indicator.domain == "<domain_under_investigation>"
| SORT @timestamp DESC
| LIMIT 5
\\\`\\\`\\\`

**How to use VirusTotal results in your investigation:**
- \\\`threat.enrichments[].virustotal.stats\\\` — detection ratio from VirusTotal scanners
- High detection count confirms the domain/IP/hash is known malicious
- Cross-reference the VirusTotal indicator with browser history — did a user visit this domain?
- Cross-reference with network events — which process initiated the connection? Was it a browser (phishing) or a background process (malware C2)?
- Include VirusTotal findings in the final report alongside osquery evidence

## Investigation Playbooks

### Playbook 1: Process Forensics

Investigate suspicious processes, their origins, and behaviors.

**Step 1: Current Running Processes**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT pid, name, path, cmdline, parent, uid, gid, state, start_time, cwd FROM processes ORDER BY start_time DESC LIMIT 100",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Step 2: Process Network Connections**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT p.pid, p.name, p.path, pos.local_address, pos.local_port, pos.remote_address, pos.remote_port, pos.state FROM processes p JOIN process_open_sockets pos ON p.pid = pos.pid WHERE pos.remote_address != '' AND pos.remote_address != '127.0.0.1' AND pos.remote_address != '::1'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Step 3: Process File Handles**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT p.pid, p.name, pof.path, pof.fd FROM processes p JOIN process_open_files pof ON p.pid = pof.pid WHERE p.name = '<suspicious_process>'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Step 4: Process Parent Chain (Linux/macOS)**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "WITH RECURSIVE process_tree AS (SELECT pid, name, parent, 0 as depth FROM processes WHERE name = '<suspicious_process>' UNION ALL SELECT p.pid, p.name, p.parent, pt.depth + 1 FROM processes p JOIN process_tree pt ON p.pid = pt.parent WHERE pt.depth < 10) SELECT * FROM process_tree",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

### Playbook 2: Persistence Mechanisms

Identify how an attacker may maintain access to the system.

**Linux Persistence**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT * FROM crontab",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT id, description, load_state, active_state, sub_state, user, path FROM systemd_units WHERE active_state = 'active'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**macOS Persistence**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT name, path, args, status FROM launchd",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT * FROM startup_items",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Windows Persistence**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT name, path, data, type FROM registry WHERE key LIKE 'HKEY_LOCAL_MACHINE\\\\\\\\SOFTWARE\\\\\\\\Microsoft\\\\\\\\Windows\\\\\\\\CurrentVersion\\\\\\\\Run%' OR key LIKE 'HKEY_CURRENT_USER\\\\\\\\SOFTWARE\\\\\\\\Microsoft\\\\\\\\Windows\\\\\\\\CurrentVersion\\\\\\\\Run%'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT name, display_name, path, start_type, status, user_account FROM services WHERE start_type = 'AUTO_START' OR start_type = 'DEMAND_START'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT name, action, path, enabled, last_run_time, next_run_time FROM scheduled_tasks WHERE enabled = 1",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

### Playbook 3: Network Forensics

Investigate network activity and connections.

**Current Network Connections**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT local_address, local_port, remote_address, remote_port, state, pid FROM process_open_sockets WHERE state = 'ESTABLISHED' OR state = 'LISTEN'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Listening Ports**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT lp.port, lp.protocol, lp.address, p.name, p.path FROM listening_ports lp LEFT JOIN processes p ON lp.pid = p.pid",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**DNS Cache (Windows)**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT name, type, record, ttl FROM dns_cache",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**ARP Table**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT address, mac, interface, permanent FROM arp_cache",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

### Playbook 4: User & Authentication Forensics

Investigate user activity and authentication events.

**Current Logged-in Users**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT type, user, tty, host, time, pid FROM logged_in_users",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**User Accounts**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT uid, gid, username, description, directory, shell FROM users",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Last Login Activity (Linux/macOS)**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT username, time, host, tty FROM last",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Shell History (Linux/macOS)**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT uid, command, history_file FROM shell_history WHERE command != ''",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**ES|QL: Authentication Events**
\\\`\\\`\\\`
platform.core.search({ query: "Find authentication events for user <username> on host <hostname> in the last 7 days", index: "logs-*" })
\\\`\\\`\\\`

### Playbook 5: File & Artifact Analysis

Investigate files, hashes, and filesystem artifacts.

**File Metadata by Path**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT path, filename, size, mode, uid, gid, atime, mtime, ctime, btime, type FROM file WHERE path = '<file_path>'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**File Hash**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT path, md5, sha1, sha256 FROM hash WHERE path = '<file_path>'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Recently Modified Files in Directory**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT path, filename, size, mtime, type FROM file WHERE directory = '<directory_path>' ORDER BY mtime DESC LIMIT 50",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Suspicious Temp Files**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT path, filename, size, mode, uid, mtime FROM file WHERE (directory = '/tmp' OR directory = '/var/tmp' OR directory LIKE '%\\\\\\\\Temp%') AND (filename LIKE '%.exe' OR filename LIKE '%.dll' OR filename LIKE '%.ps1' OR filename LIKE '%.sh' OR filename LIKE '%.py')",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

### Playbook 6: Browser Forensics via \\\`elastic_browser_history\\\`

Investigate web browser activity for phishing, C2, or data exfiltration using Elastic's custom \\\`elastic_browser_history\\\` osquery table. This table is a unique Elastic capability that provides **unified browser history across all installed browsers** (Chrome, Firefox, Edge, Safari) in a single normalized schema — no need to query each browser's SQLite database separately.

**CRITICAL: \\\`elastic_browser_history\\\` is a CUSTOM Elastic table. Column names vary by version and MUST be discovered first.**

**Step 1: Discover Table Schema (MANDATORY)**
Before running any query against \\\`elastic_browser_history\\\`, you MUST call \\\`security.osquery.get_table_schema\\\` with \\\`tableName: "elastic_browser_history"\\\` to discover the actual column names. Do NOT use the example column names below — they are placeholders only.

**Step 2: Browser History on Alert Source Endpoint**
Start by querying the endpoint that triggered the alert to confirm the user visited the domain:
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT <columns_from_schema> FROM elastic_browser_history WHERE <url_column> LIKE '%<domain_from_alert>%'",
  agentIds: ["<agent_id_from_alert>"]
})
\\\`\\\`\\\`

**Step 3: Correlate Browser Process with Alert**
The alert's \\\`process.name\\\` field tells you which browser initiated the connection. Verify that the browser history query returns entries from the same browser:
- \\\`process.name: chrome\\\` → expect Chrome browser history entries
- \\\`process.name: firefox\\\` → expect Firefox browser history entries
This correlation confirms the user browsed to the domain (not an automated/background process).

**Step 4: Browser Extensions (Chrome)**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT name, identifier, version, description, author, path, permissions FROM chrome_extensions",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

### Playbook 7: IOC Hunting

Search for specific Indicators of Compromise across the environment.

**Hunt for File Hash**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT path, filename, sha256 FROM hash WHERE sha256 = '<malicious_hash>'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Hunt for Malicious Domain Access**
First call \\\`security.osquery.get_table_schema({ tableName: "elastic_browser_history", agentId: "<agent_id>" })\\\`, then use the actual columns:
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT <columns_from_schema> FROM elastic_browser_history WHERE <url_column> LIKE '%<malicious_domain>%'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**Hunt for Suspicious Process Name**
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT pid, name, path, cmdline, uid, start_time FROM processes WHERE name = '<suspicious_name>' OR cmdline LIKE '%<suspicious_pattern>%'",
  agentIds: ["<agent_id>"]
})
\\\`\\\`\\\`

**ES|QL: Hunt for Network IOC**
\\\`\\\`\\\`
platform.core.search({
  query: "FROM logs-network_traffic.* | WHERE @timestamp >= NOW() - 30 days AND (destination.ip == '<malicious_ip>' OR dns.question.name LIKE '*<malicious_domain>*') | STATS count = COUNT(*) BY host.name, destination.ip, dns.question.name | SORT count DESC"
})
\\\`\\\`\\\`

### Playbook 8: Cross-Endpoint IOC Sweep via \\\`elastic_browser_history\\\`

This is the most important playbook for the RSA 2026 demo. It uses Elastic's custom \\\`elastic_browser_history\\\` osquery table to discover compromised endpoints that have NO network alerts — they only have browser history evidence on disk. This is the forensic capability that proves the agent can find hidden compromises that traditional alert-based detection misses.

**Why \\\`elastic_browser_history\\\` is unique:**
- Standard osquery has no built-in browser history table — you would need to query each browser's SQLite database separately (\\\`chrome_history\\\`, \\\`firefox_downloads\\\`, etc.)
- Elastic's custom \\\`elastic_browser_history\\\` table normalizes ALL browser history (Chrome, Firefox, Edge, Safari) into a single unified schema
- This means one query sweeps all browsers on all endpoints simultaneously
- Endpoints that have Osquery but NOT Elastic Defend can still be queried — browser history is accessible even without network monitoring

**Step 1: List ALL Agents and Identify Protection Levels**
\\\`\\\`\\\`
security.osquery.get_agents({})
\\\`\\\`\\\`
Examine the \\\`policy_name\\\` field for each agent. Group agents into:
- **Fully protected**: Agents on policies that include both Elastic Defend and Osquery (policy name typically contains "Defend")
- **Osquery only**: Agents on policies with only Osquery (no Elastic Defend) — these have reduced visibility and no endpoint protection

**Step 2: Discover Browser History Schema (pick any online agent)**
\\\`\\\`\\\`
security.osquery.get_table_schema({ tableName: "elastic_browser_history", agentId: "<any_online_agent_id>" })
\\\`\\\`\\\`

**Step 3: Query ALL Agents for the Malicious Domain**
Pass ALL online agent IDs in a single query:
\\\`\\\`\\\`
security.osquery.run_live_query({
  query: "SELECT <columns_from_schema> FROM elastic_browser_history WHERE <url_column> LIKE '%<malicious_domain>%'",
  agentAll: true
})
\\\`\\\`\\\`

**Step 4: Fetch and Correlate Results**
\\\`\\\`\\\`
security.osquery.get_results({ actionId: "<queries[0].action_id>" })
\\\`\\\`\\\`
Each result row includes an \\\`_agent_id\\\` field. Match each \\\`_agent_id\\\` back to the agent list from Step 1 to determine:
- Which additional endpoints visited the malicious domain
- Whether those endpoints have Elastic Defend or only Osquery

**Step 5: Correlate with VirusTotal Enrichment**
\\\`\\\`\\\`
FROM logs-threatintel.virustotal-default
| WHERE threat.enrichments.indicator.domain == "<malicious_domain>"
| SORT @timestamp DESC
| LIMIT 5
\\\`\\\`\\\`
Include the VirusTotal analysis results (detection stats, scan date) in your report to provide threat intelligence context alongside the endpoint forensic evidence.

**Step 6: Report Findings**
For each affected endpoint, report:
- Hostname and agent ID
- Policy name and protection level (Defend + Osquery vs Osquery only)
- The browser history evidence (URL, timestamp, browser type — Chrome or Firefox)
- Whether the alert's source process matches the browser history (e.g., alert shows \\\`process.name: chrome\\\`, browser history confirms Chrome visit)
- VirusTotal verdict for the domain (malicious/clean/unknown)
- **Highlight endpoints without Elastic Defend** — these have reduced visibility and no endpoint protection
- Recommend deploying Elastic Defend on unprotected endpoints for complete coverage

## REF7707 Threat Intelligence Reference

When investigating domains from the Elastic Security Labs REF7707 report ("Fragile Web"), these are the known typosquatting domains:

| Domain | Mimics | MITRE ATT&CK |
|---|---|---|
| \\\`poster.checkponit.com\\\` | Check Point | TA0001/T1566 Phishing |
| \\\`support.fortineat.com\\\` | Fortinet | TA0001/T1566 Phishing |
| \\\`update.hobiter.com\\\` | Hobiter | TA0001/T1566 Phishing |
| \\\`support.vmphere.com\\\` | VMware vSphere | TA0001/T1566 Phishing |
| \\\`cloud.autodiscovar.com\\\` | Autodiscover | TA0001/T1566 Phishing |
| \\\`digert.ictnsc.com\\\` | DigiCert/ICTSEC | TA0001/T1566 Phishing |

**Reference**: https://www.elastic.co/security-labs/fragile-web-ref7707

When any of these domains appear in an investigation, immediately classify the finding as high-confidence malicious and ensure the cross-endpoint sweep (Playbook 8) checks for ALL domains in the list, not just the one from the original alert.

## Key osquery Tables Reference

### Process Analysis
- \\\`processes\\\` - Running processes
- \\\`process_open_sockets\\\` - Network connections by process
- \\\`process_open_files\\\` - Files opened by processes
- \\\`process_memory_map\\\` - Memory mappings

### Persistence
- \\\`crontab\\\` - Cron jobs (Linux)
- \\\`systemd_units\\\` - Systemd services (Linux)
- \\\`launchd\\\` - Launch daemons (macOS)
- \\\`startup_items\\\` - Startup items (macOS)
- \\\`services\\\` - Windows services
- \\\`scheduled_tasks\\\` - Windows scheduled tasks
- \\\`registry\\\` - Windows registry (check Run keys)

### Network
- \\\`process_open_sockets\\\` - Process network connections
- \\\`listening_ports\\\` - Open listening ports
- \\\`arp_cache\\\` - ARP table
- \\\`dns_cache\\\` - DNS cache (Windows)
- \\\`interface_addresses\\\` - Network interfaces
- \\\`routes\\\` - Routing table

### Users & Auth
- \\\`users\\\` - User accounts
- \\\`logged_in_users\\\` - Currently logged-in users
- \\\`last\\\` - Login history (Linux/macOS)
- \\\`shell_history\\\` - Command history
- \\\`user_groups\\\` - Group memberships

### Files & Filesystem
- \\\`file\\\` - File metadata
- \\\`hash\\\` - File hashes (md5, sha1, sha256)
- \\\`mounts\\\` - Mounted filesystems
- \\\`disk_encryption\\\` - Encryption status

### Browser (CUSTOM — MUST get schema first)
- \\\`elastic_browser_history\\\` - Unified browser history (**custom Elastic table — ALWAYS call security.osquery.get_table_schema before querying**)
- \\\`chrome_extensions\\\` - Chrome extensions
- \\\`firefox_addons\\\` - Firefox add-ons

## Investigation Workflow

### 1. Scope Definition
- Identify affected systems and time frame
- Document initial IOCs and hypotheses
- **Check VirusTotal enrichments** for known threat intel on the IOCs
- Create a timeline in Security Timelines

### 2. Evidence Collection
- Run osquery queries to collect volatile data first (processes, connections)
- Collect persistence mechanisms
- Gather file and hash information
- Pull user activity and authentication logs
- **ALWAYS query \\\`elastic_browser_history\\\`** — discover schema first via \\\`security.osquery.get_table_schema\\\`, then collect browser history for every endpoint under investigation

### 3. Analysis & Correlation
- Correlate osquery findings with ES|QL log analysis
- Cross-reference browser history from \\\`elastic_browser_history\\\` with process, network, and authentication artifacts
- **Match alert's \\\`process.name\\\` against browser history** to confirm user-initiated access
- **Cross-reference with VirusTotal enrichments** in \\\`logs-threatintel.virustotal-default\\\`
- Build timeline of attacker activity
- Identify lateral movement paths
- Document attack chain (MITRE ATT&CK mapping)

### 4. IOC Extraction & Hunting
- Extract IOCs (hashes, IPs, domains, filenames)
- Hunt for IOCs across all endpoints using cross-endpoint sweep (Playbook 8)
- For REF7707 domains, sweep for ALL known typosquatting variants, not just the triggering domain
- Identify scope of compromise

### 5. Documentation
- Create/update investigation timeline
- Add findings to case
- Generate incident report including:
  - VirusTotal verdict
  - List of affected endpoints with protection levels
  - Recommended remediation (deploy Elastic Defend on unprotected endpoints)

## Best Practices

1. **Volatile First**: Collect volatile data (memory, connections, processes) before non-volatile (files, logs)
2. **Always Collect Browser History**: Query \\\`elastic_browser_history\\\` in every investigation — browser artifacts reveal phishing, C2, exfiltration, and initial access vectors that other telemetry misses
3. **Always Check Threat Intel**: Query \\\`logs-threatintel.virustotal-default\\\` for existing enrichments before starting deep analysis — known malicious IOCs accelerate the investigation
4. **Correlate Process to Browser**: Match the alert's \\\`process.name\\\` (chrome, firefox) with browser history entries to confirm user-initiated access vs automated/malware activity
5. **Document Everything**: Use timelines and case notes to document each step
6. **Verify Schema**: ALWAYS call \\\`security.osquery.get_table_schema\\\` before querying any \\\`elastic_*\\\` custom table — never guess column names
7. **Wait for Results**: The osquery tool automatically polls — always fetch results
8. **Cross-Reference**: Validate findings across multiple data sources (osquery + ES|QL + VirusTotal)
9. **Preserve Evidence**: Note original timestamps and avoid modifying evidence
10. **Think Like an Attacker**: Follow the attack chain methodically — typosquatting domains suggest phishing as the initial access vector`,
});
