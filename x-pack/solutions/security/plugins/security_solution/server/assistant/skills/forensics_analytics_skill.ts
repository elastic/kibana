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
 */
export const FORENSICS_ANALYTICS_SKILL = defineSkillType({
  id: 'security.forensics_analytics',
  name: 'forensics_analytics',
  basePath: 'skills/security',
  description:
    'Deep forensic investigation capabilities including artifact collection, IOC hunting, and evidence analysis',
  content: `# Forensics Analytics

## Overview

This skill provides comprehensive forensic investigation capabilities for security incidents. Use this skill when you need to:
- Conduct deep endpoint investigations beyond initial alert triage
- Collect and analyze forensic artifacts (files, processes, persistence, network)
- Hunt for Indicators of Compromise (IOCs) across the environment
- Build investigation timelines with correlated evidence
- Document findings for incident reports or legal proceedings

## CRITICAL: Execute Investigations - Don't Just Suggest

When conducting forensic analysis, you MUST:
1. **RUN the queries** - Execute osquery and ES|QL queries, don't just suggest them
2. **WAIT for results** - The osquery tool polls for up to 5 minutes automatically
3. **DOCUMENT findings** - Create timelines and add notes to alerts/cases
4. **CORRELATE evidence** - Cross-reference findings across multiple data sources

## Investigation Playbooks

### Playbook 1: Process Forensics

Investigate suspicious processes, their origins, and behaviors.

**Step 1: Current Running Processes**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT pid, name, path, cmdline, parent, uid, gid, state, start_time, cwd FROM processes ORDER BY start_time DESC LIMIT 100",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Step 2: Process Network Connections**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT p.pid, p.name, p.path, pos.local_address, pos.local_port, pos.remote_address, pos.remote_port, pos.state FROM processes p JOIN process_open_sockets pos ON p.pid = pos.pid WHERE pos.remote_address != '' AND pos.remote_address != '127.0.0.1' AND pos.remote_address != '::1'",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Step 3: Process File Handles**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT p.pid, p.name, pof.path, pof.fd FROM processes p JOIN process_open_files pof ON p.pid = pof.pid WHERE p.name = '<suspicious_process>'",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Step 4: Process Parent Chain (Linux/macOS)**
\`\`\`
security.osquery.run_live_query({
  query: "WITH RECURSIVE process_tree AS (SELECT pid, name, parent, 0 as depth FROM processes WHERE name = '<suspicious_process>' UNION ALL SELECT p.pid, p.name, p.parent, pt.depth + 1 FROM processes p JOIN process_tree pt ON p.pid = pt.parent WHERE pt.depth < 10) SELECT * FROM process_tree",
  agentIds: ["<agent_id>"]
})
\`\`\`

### Playbook 2: Persistence Mechanisms

Identify how an attacker may maintain access to the system.

**Linux Persistence**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT * FROM crontab",
  agentIds: ["<agent_id>"]
})
\`\`\`

\`\`\`
security.osquery.run_live_query({
  query: "SELECT id, description, load_state, active_state, sub_state, user, path FROM systemd_units WHERE active_state = 'active'",
  agentIds: ["<agent_id>"]
})
\`\`\`

**macOS Persistence**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT name, path, args, status FROM launchd",
  agentIds: ["<agent_id>"]
})
\`\`\`

\`\`\`
security.osquery.run_live_query({
  query: "SELECT * FROM startup_items",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Windows Persistence**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT name, path, data, type FROM registry WHERE key LIKE 'HKEY_LOCAL_MACHINE\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run%' OR key LIKE 'HKEY_CURRENT_USER\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run%'",
  agentIds: ["<agent_id>"]
})
\`\`\`

\`\`\`
security.osquery.run_live_query({
  query: "SELECT name, display_name, path, start_type, status, user_account FROM services WHERE start_type = 'AUTO_START' OR start_type = 'DEMAND_START'",
  agentIds: ["<agent_id>"]
})
\`\`\`

\`\`\`
security.osquery.run_live_query({
  query: "SELECT name, action, path, enabled, last_run_time, next_run_time FROM scheduled_tasks WHERE enabled = 1",
  agentIds: ["<agent_id>"]
})
\`\`\`

### Playbook 3: Network Forensics

Investigate network activity and connections.

**Current Network Connections**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT local_address, local_port, remote_address, remote_port, state, pid FROM process_open_sockets WHERE state = 'ESTABLISHED' OR state = 'LISTEN'",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Listening Ports**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT lp.port, lp.protocol, lp.address, p.name, p.path FROM listening_ports lp LEFT JOIN processes p ON lp.pid = p.pid",
  agentIds: ["<agent_id>"]
})
\`\`\`

**DNS Cache (Windows)**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT name, type, record, ttl FROM dns_cache",
  agentIds: ["<agent_id>"]
})
\`\`\`

**ARP Table**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT address, mac, interface, permanent FROM arp_cache",
  agentIds: ["<agent_id>"]
})
\`\`\`

### Playbook 4: User & Authentication Forensics

Investigate user activity and authentication events.

**Current Logged-in Users**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT type, user, tty, host, time, pid FROM logged_in_users",
  agentIds: ["<agent_id>"]
})
\`\`\`

**User Accounts**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT uid, gid, username, description, directory, shell FROM users",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Last Login Activity (Linux/macOS)**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT username, time, host, tty FROM last",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Shell History (Linux/macOS)**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT uid, command, history_file FROM shell_history WHERE command != ''",
  agentIds: ["<agent_id>"]
})
\`\`\`

**ES|QL: Authentication Events**
\`\`\`
platform.core.search({ query: "Find authentication events for user <username> on host <hostname> in the last 7 days", index: "logs-*" })
\`\`\`

### Playbook 5: File & Artifact Analysis

Investigate files, hashes, and filesystem artifacts.

**File Metadata by Path**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT path, filename, size, mode, uid, gid, atime, mtime, ctime, btime, type FROM file WHERE path = '<file_path>'",
  agentIds: ["<agent_id>"]
})
\`\`\`

**File Hash**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT path, md5, sha1, sha256 FROM hash WHERE path = '<file_path>'",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Recently Modified Files in Directory**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT path, filename, size, mtime, type FROM file WHERE directory = '<directory_path>' ORDER BY mtime DESC LIMIT 50",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Suspicious Temp Files**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT path, filename, size, mode, uid, mtime FROM file WHERE (directory = '/tmp' OR directory = '/var/tmp' OR directory LIKE '%\\\\Temp%') AND (filename LIKE '%.exe' OR filename LIKE '%.dll' OR filename LIKE '%.ps1' OR filename LIKE '%.sh' OR filename LIKE '%.py')",
  agentIds: ["<agent_id>"]
})
\`\`\`

### Playbook 6: Browser Forensics

Investigate web browser activity for phishing, C2, or data exfiltration.

**CRITICAL: \`elastic_browser_history\` is a CUSTOM Elastic table. Column names vary by version and MUST be discovered first.**

**Step 1: Discover Table Schema (MANDATORY)**
Before running any query against \`elastic_browser_history\`, you MUST call \`security.osquery.get_table_schema\` with \`tableName: "elastic_browser_history"\` to discover the actual column names. Do NOT use the example column names below — they are placeholders only.

**Step 2: Browser History**
Use ONLY the columns returned by get_table_schema. Example pattern (replace columns with actual schema):
\`\`\`
security.osquery.run_live_query({
  query: "SELECT <columns_from_schema> FROM elastic_browser_history ORDER BY <timestamp_column> DESC LIMIT 100",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Step 3: Search for Specific Domain Access**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT <columns_from_schema> FROM elastic_browser_history WHERE <url_column> LIKE '%<suspicious_domain>%'",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Step 4: Browser Extensions (Chrome)**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT name, identifier, version, description, author, path, permissions FROM chrome_extensions",
  agentIds: ["<agent_id>"]
})
\`\`\`

### Playbook 7: IOC Hunting

Search for specific Indicators of Compromise across the environment.

**Hunt for File Hash**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT path, filename, sha256 FROM hash WHERE sha256 = '<malicious_hash>'",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Hunt for Malicious Domain Access**
First call \`security.osquery.get_table_schema({ tableName: "elastic_browser_history", agentId: "<agent_id>" })\`, then use the actual columns:
\`\`\`
security.osquery.run_live_query({
  query: "SELECT <columns_from_schema> FROM elastic_browser_history WHERE <url_column> LIKE '%<malicious_domain>%'",
  agentIds: ["<agent_id>"]
})
\`\`\`

**Hunt for Suspicious Process Name**
\`\`\`
security.osquery.run_live_query({
  query: "SELECT pid, name, path, cmdline, uid, start_time FROM processes WHERE name = '<suspicious_name>' OR cmdline LIKE '%<suspicious_pattern>%'",
  agentIds: ["<agent_id>"]
})
\`\`\`

**ES|QL: Hunt for Network IOC**
\`\`\`
platform.core.search({
  query: "FROM logs-network_traffic.* | WHERE @timestamp >= NOW() - 30 days AND (destination.ip == '<malicious_ip>' OR dns.question.name LIKE '*<malicious_domain>*') | STATS count = COUNT(*) BY host.name, destination.ip, dns.question.name | SORT count DESC"
})
\`\`\`

## Key osquery Tables Reference

### Process Analysis
- \`processes\` - Running processes
- \`process_open_sockets\` - Network connections by process
- \`process_open_files\` - Files opened by processes
- \`process_memory_map\` - Memory mappings

### Persistence
- \`crontab\` - Cron jobs (Linux)
- \`systemd_units\` - Systemd services (Linux)
- \`launchd\` - Launch daemons (macOS)
- \`startup_items\` - Startup items (macOS)
- \`services\` - Windows services
- \`scheduled_tasks\` - Windows scheduled tasks
- \`registry\` - Windows registry (check Run keys)

### Network
- \`process_open_sockets\` - Process network connections
- \`listening_ports\` - Open listening ports
- \`arp_cache\` - ARP table
- \`dns_cache\` - DNS cache (Windows)
- \`interface_addresses\` - Network interfaces
- \`routes\` - Routing table

### Users & Auth
- \`users\` - User accounts
- \`logged_in_users\` - Currently logged-in users
- \`last\` - Login history (Linux/macOS)
- \`shell_history\` - Command history
- \`user_groups\` - Group memberships

### Files & Filesystem
- \`file\` - File metadata
- \`hash\` - File hashes (md5, sha1, sha256)
- \`mounts\` - Mounted filesystems
- \`disk_encryption\` - Encryption status

### Browser (CUSTOM - MUST get schema first)
- \`elastic_browser_history\` - Unified browser history (**custom Elastic table — ALWAYS call security.osquery.get_table_schema before querying**)
- \`chrome_extensions\` - Chrome extensions
- \`firefox_addons\` - Firefox add-ons

## Investigation Workflow

### 1. Scope Definition
- Identify affected systems and time frame
- Document initial IOCs and hypotheses
- Create a timeline in Security Timelines

### 2. Evidence Collection
- Run osquery queries to collect volatile data first (processes, connections)
- Collect persistence mechanisms
- Gather file and hash information
- Pull user activity and authentication logs

### 3. Analysis & Correlation
- Correlate osquery findings with ES|QL log analysis
- Build timeline of attacker activity
- Identify lateral movement paths
- Document attack chain (MITRE ATT&CK mapping)

### 4. IOC Extraction & Hunting
- Extract IOCs (hashes, IPs, domains, filenames)
- Hunt for IOCs across all endpoints
- Identify scope of compromise

### 5. Documentation
- Create/update investigation timeline
- Add findings to case
- Generate incident report

## Best Practices

1. **Volatile First**: Collect volatile data (memory, connections, processes) before non-volatile (files, logs)
2. **Document Everything**: Use timelines and case notes to document each step
3. **Verify Schema**: ALWAYS call \`security.osquery.get_table_schema\` before querying any \`elastic_*\` custom table — never guess column names
4. **Wait for Results**: The osquery tool automatically polls - always fetch results
5. **Cross-Reference**: Validate findings across multiple data sources
6. **Preserve Evidence**: Note original timestamps and avoid modifying evidence
7. **Think Like an Attacker**: Follow the attack chain methodically`,
});
