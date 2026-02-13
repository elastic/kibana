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
osquery({ operation: "run_live_query", params: {
  query: "SELECT pid, name, path, cmdline, parent, uid, gid, state, start_time, cwd FROM processes ORDER BY start_time DESC LIMIT 100",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Step 2: Process Network Connections**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT p.pid, p.name, p.path, pos.local_address, pos.local_port, pos.remote_address, pos.remote_port, pos.state FROM processes p JOIN process_open_sockets pos ON p.pid = pos.pid WHERE pos.remote_address != '' AND pos.remote_address != '127.0.0.1' AND pos.remote_address != '::1'",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Step 3: Process File Handles**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT p.pid, p.name, pof.path, pof.fd FROM processes p JOIN process_open_files pof ON p.pid = pof.pid WHERE p.name = '<suspicious_process>'",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Step 4: Process Parent Chain (Linux/macOS)**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "WITH RECURSIVE process_tree AS (SELECT pid, name, parent, 0 as depth FROM processes WHERE name = '<suspicious_process>' UNION ALL SELECT p.pid, p.name, p.parent, pt.depth + 1 FROM processes p JOIN process_tree pt ON p.pid = pt.parent WHERE pt.depth < 10) SELECT * FROM process_tree",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

### Playbook 2: Persistence Mechanisms

Identify how an attacker may maintain access to the system.

**Linux Persistence**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT * FROM crontab",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT id, description, load_state, active_state, sub_state, user, path FROM systemd_units WHERE active_state = 'active'",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**macOS Persistence**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT name, path, args, status FROM launchd",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT * FROM startup_items",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Windows Persistence**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT name, path, data, type FROM registry WHERE key LIKE 'HKEY_LOCAL_MACHINE\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run%' OR key LIKE 'HKEY_CURRENT_USER\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run%'",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT name, display_name, path, start_type, status, user_account FROM services WHERE start_type = 'AUTO_START' OR start_type = 'DEMAND_START'",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT name, action, path, enabled, last_run_time, next_run_time FROM scheduled_tasks WHERE enabled = 1",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

### Playbook 3: Network Forensics

Investigate network activity and connections.

**Current Network Connections**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT local_address, local_port, remote_address, remote_port, state, pid FROM process_open_sockets WHERE state = 'ESTABLISHED' OR state = 'LISTEN'",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Listening Ports**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT lp.port, lp.protocol, lp.address, p.name, p.path FROM listening_ports lp LEFT JOIN processes p ON lp.pid = p.pid",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**DNS Cache (Windows)**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT name, type, record, ttl FROM dns_cache",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**ARP Table**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT address, mac, interface, permanent FROM arp_cache",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

### Playbook 4: User & Authentication Forensics

Investigate user activity and authentication events.

**Current Logged-in Users**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT type, user, tty, host, time, pid FROM logged_in_users",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**User Accounts**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT uid, gid, username, description, directory, shell FROM users",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Last Login Activity (Linux/macOS)**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT username, time, host, tty FROM last",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Shell History (Linux/macOS)**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT uid, command, history_file FROM shell_history WHERE command != ''",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**ES|QL: Authentication Events**
\`\`\`
platform.core.search({ query: "Find authentication events for user <username> on host <hostname> in the last 7 days", index: "logs-*" })
\`\`\`

### Playbook 5: File & Artifact Analysis

Investigate files, hashes, and filesystem artifacts.

**File Metadata by Path**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT path, filename, size, mode, uid, gid, atime, mtime, ctime, btime, type FROM file WHERE path = '<file_path>'",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**File Hash**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT path, md5, sha1, sha256 FROM hash WHERE path = '<file_path>'",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Recently Modified Files in Directory**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT path, filename, size, mtime, type FROM file WHERE directory = '<directory_path>' ORDER BY mtime DESC LIMIT 50",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Suspicious Temp Files**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT path, filename, size, mode, uid, mtime FROM file WHERE (directory = '/tmp' OR directory = '/var/tmp' OR directory LIKE '%\\\\Temp%') AND (filename LIKE '%.exe' OR filename LIKE '%.dll' OR filename LIKE '%.ps1' OR filename LIKE '%.sh' OR filename LIKE '%.py')",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

### Playbook 6: Browser Forensics

Investigate web browser activity for phishing, C2, or data exfiltration.

**Browser History**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT url, title, visit_count, datetime, hostname, domain, browser, profile_name FROM elastic_browser_history ORDER BY datetime DESC LIMIT 100",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Search for Specific Domain Access**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT url, title, visit_count, datetime, browser FROM elastic_browser_history WHERE url LIKE '%<suspicious_domain>%' OR hostname LIKE '%<suspicious_domain>%'",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

**Browser Extensions (Chrome)**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT name, identifier, version, description, author, path, permissions FROM chrome_extensions",
  agent_ids: ["<agent_id>"],
  confirm: true
}})
\`\`\`

### Playbook 7: IOC Hunting

Search for specific Indicators of Compromise across the environment.

**Hunt for File Hash**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT path, filename, sha256 FROM hash WHERE sha256 = '<malicious_hash>'",
  agent_all: true,
  confirm: true
}})
\`\`\`

**Hunt for Malicious Domain Access**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT url, title, datetime, browser FROM elastic_browser_history WHERE url LIKE '%<malicious_domain>%'",
  agent_all: true,
  confirm: true
}})
\`\`\`

**Hunt for Suspicious Process Name**
\`\`\`
osquery({ operation: "run_live_query", params: {
  query: "SELECT pid, name, path, cmdline, uid, start_time FROM processes WHERE name = '<suspicious_name>' OR cmdline LIKE '%<suspicious_pattern>%'",
  agent_all: true,
  confirm: true
}})
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

### Browser
- \`elastic_browser_history\` - Unified browser history
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
3. **Verify Schema**: Always check osquery table schema before running queries
4. **Wait for Results**: The osquery tool automatically polls - always fetch results
5. **Cross-Reference**: Validate findings across multiple data sources
6. **Preserve Evidence**: Note original timestamps and avoid modifying evidence
7. **Think Like an Attacker**: Follow the attack chain methodically`,
});
