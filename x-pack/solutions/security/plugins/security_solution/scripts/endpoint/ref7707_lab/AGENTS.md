# REF7707 Lab - Agent Instructions

This document provides instructions for AI agents working with the REF7707 lab scripts.

## Overview

The REF7707 lab simulates attack telemetry inspired by the REF7707 APT campaign. It provisions infrastructure on GCP and supports two adversary emulation tools:

- **Caldera**: Network-based adversary emulation with agent orchestration
- **Cortado**: Local Red Team Automations (RTAs) that simulate attacker behaviors to trigger detection rules

## Prerequisites

Before running any scripts, ensure:

1. **GCP CLI**: `gcloud` is installed and authenticated
2. **Tailscale**: Installed and connected to your tailnet
3. **Local Kibana/Elasticsearch**: Running on localhost (default ports 5601/9200)
4. **Caldera** (optional): Running locally on port 8888 (for adversary operations)
5. **Cortado** (optional): Can be installed on VMs for Red Team Automations (see [Cortado section](#cortado-red-team-automations))
6. **Environment Variables**:
   - `TS_AUTHKEY`: Tailscale auth key (reusable, not ephemeral)

## Script Locations

All scripts are in: `x-pack/solutions/security/plugins/security_solution/scripts/endpoint/`

| Script | Purpose |
|--------|---------|
| `run_ref7707_gcp_setup.js` | One-shot setup: Fleet Server + Agent VMs + DNS telemetry + REF7707 infra |
| `run_ref7707_caldera_operation.js` | Run Caldera adversary operation against enrolled agents |
| `run_gcp_fleet_vm.js` | Deploy Fleet Server and agent VMs (without REF7707 infra) |
| `run_ref7707_gcp_infra.js` | Deploy only REF7707 DNS/Web infrastructure |

## Quick Start: Full REF7707 Lab Setup

### Step 1: Deploy Everything on GCP

```bash
export TS_AUTHKEY="tskey-auth-..."
export GCP_PROJECT="elastic-security-dev"

node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_ref7707_gcp_setup.js \
  --gcpProject "$GCP_PROJECT" \
  --gcpZone us-central1-a \
  --tailscaleAuthKey "$TS_AUTHKEY" \
  --namePrefix "yourname-ref7707" \
  --ubuntuAgentCount 2 \
  --osqueryOnlyAgentCount 2
```

This creates:
- Fleet Server VM on GCP
- 2 Ubuntu VMs with full integrations (Elastic Defend + Osquery + Network Packet Capture + Caldera sandcat)
- 2 Ubuntu VMs with Osquery-only policy (Osquery + Caldera sandcat)
- DNS VM (dnsmasq for REF7707 lab domains)
- Web VM (serves benign REF7707 artifacts)

### Step 2: Run Caldera Operation

The setup script prints the exact command to run. Example:

```bash
export CALDERA_API_KEY="ADMIN123"  # Default Caldera API key

node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_ref7707_caldera_operation.js \
  --calderaUrl "http://your-tailscale-host:8888" \
  --calderaApiKey "$CALDERA_API_KEY" \
  --domain "poster.checkponit.lab" \
  --dnsIp <dns-vm-tailscale-ip> \
  --webIp <web-vm-tailscale-ip> \
  --webPort 8080
```

## Agent Policy Configuration

### GCP VM agents (Full)
- **Integrations**: Elastic Defend, Osquery Manager, Network Packet Capture (DNS)
- **Use case**: Full endpoint protection and telemetry

### GCP VM agents - Osquery Only
- **Integrations**: Osquery Manager only
- **Use case**: Lightweight agents for osquery-based investigations (browser history, system info)
- **Note**: Caldera sandcat is still deployed for adversary emulation

## Adding Integrations Manually

If you need to add integrations to an existing policy:

### Add Elastic Defend
```bash
curl -X POST "http://127.0.0.1:5601/api/fleet/package_policies" \
  -u elastic:changeme \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -H "elastic-api-version: 2023-10-31" \
  -d '{
    "name": "Elastic Defend",
    "policy_id": "<POLICY_ID>",
    "package": {"name": "endpoint", "version": "<VERSION>"}
  }'
```

### Add Osquery Manager
```bash
curl -X POST "http://127.0.0.1:5601/api/fleet/package_policies" \
  -u elastic:changeme \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -H "elastic-api-version: 2023-10-31" \
  -d '{
    "name": "Osquery Manager",
    "policy_id": "<POLICY_ID>",
    "package": {"name": "osquery_manager", "version": "<VERSION>"}
  }'
```

## Deploying Caldera Sandcat Manually

If sandcat wasn't deployed during initial setup:

```bash
# SSH to the VM via Tailscale hostname
ssh <vm-tailscale-hostname>

# Download and install sandcat
CALDERA_URL="http://<your-tailscale-ip>:8888"
sudo mkdir -p /opt/sandcat
sudo curl -fsS -X POST -H "file: sandcat.go" -H "platform: linux" \
  "$CALDERA_URL/file/download" -o /opt/sandcat/sandcat
sudo chmod +x /opt/sandcat/sandcat

# Create systemd service
sudo tee /etc/systemd/system/sandcat.service << EOF
[Unit]
Description=Caldera Sandcat Agent
After=network-online.target

[Service]
Type=simple
ExecStart=/opt/sandcat/sandcat -server $CALDERA_URL -group ref7707 -paw %H
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now sandcat.service
```

## Verifying Setup

### Check Fleet Agents
```bash
curl -s -u elastic:changeme "http://127.0.0.1:5601/api/fleet/agents" \
  -H "elastic-api-version: 2023-10-31" | jq '.items[] | {hostname: .local_metadata.host.hostname, status, policy_id}'
```

### Check Caldera Agents
```bash
curl -s "http://127.0.0.1:8888/api/v2/agents" -H "KEY: ADMIN123" | jq '.[] | {paw, group, platform}'
```

### Check Tailscale Status
```bash
tailscale status | grep ref7707
```

## Recovery (When Agents Go Offline)

If your GCP VMs go offline (typically due to Tailscale session expiry after ~24-48 hours), use the recovery script:

### Recover All REF7707 Lab VMs

```bash
export TS_AUTHKEY="tskey-auth-..."

node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject elastic-security-dev \
  --vmFilter='name~"^yourname-ref7707" OR name~"^yourname-fleet"'
```

### Also Start Suspended VMs

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject elastic-security-dev \
  --vmFilter='name~"^yourname-ref7707"' \
  --startSuspended
```

### What the Recovery Script Does

1. **Discovers VMs**: Lists all GCP VMs matching the filter pattern
2. **Checks Tailscale**: Verifies connectivity and re-authenticates if logged out
3. **Restarts Elastic Agent**: Restarts the agent service on each VM
4. **Verifies Fleet Status**: Queries Kibana API to confirm agents are online
5. **Reports Summary**: Shows final status with ✅/❌ indicators

### Recovery CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--gcpProject` | GCP project ID | (required) |
| `--vmFilter` | GCP filter pattern | `name~"^<username>-"` |
| `--tailscaleAuthKey` | Auth key for re-auth | `$TS_AUTHKEY` |
| `--startSuspended` | Start suspended VMs first | false |
| `--concurrency` | VMs to repair in parallel | 4 |

See `../gcp_fleet_vm/AGENTS.md` for full recovery documentation.

## Troubleshooting

### Fleet Server Not Enrolling
1. Check Kibana Fleet settings point to correct Fleet Server URL
2. Verify Tailscale connectivity between Fleet Server and Elasticsearch
3. Check VM startup script logs: `sudo tail -100 /var/log/google-startup-scripts.log`

### Caldera Sandcat Not Connecting
1. Verify Caldera is running: `docker ps | grep caldera`
2. Check sandcat service: `ssh <vm> sudo systemctl status sandcat`
3. Verify Tailscale connectivity to Caldera server

### Agent Version Mismatch
Use `--version` flag to specify exact agent version:
```bash
--version 9.3.0-SNAPSHOT
```

### DNS Resolution Issues on DNS VM
If dnsmasq fails to start (port 53 conflict with systemd-resolved):
```bash
ssh <dns-vm>
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved
sudo rm -f /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
sudo systemctl restart dnsmasq
```

## Cleanup

Delete all GCP VMs with a specific prefix:
```bash
gcloud compute instances list --project elastic-security-dev \
  --filter="name~'^yourname-ref7707'" --format="value(name,zone)" | \
  while read name zone; do
    gcloud compute instances delete "$name" --project elastic-security-dev --zone "$zone" --quiet
  done
```

## CLI Flags Reference

### run_ref7707_gcp_setup.js

| Flag | Description | Default |
|------|-------------|---------|
| `--gcpProject` | GCP project ID | (required) |
| `--gcpZone` | GCP zone | us-central1-a |
| `--tailscaleAuthKey` | Tailscale auth key | `$TS_AUTHKEY` |
| `--namePrefix` | Prefix for VM names | (required) |
| `--ubuntuAgentCount` | Ubuntu VMs with full integrations | 1 |
| `--osqueryOnlyAgentCount` | Ubuntu VMs with Osquery-only policy | 0 |
| `--windowsAgentCount` | Windows agent VMs | 0 |
| `--enableCaldera` | Deploy Caldera sandcat | true |
| `--enableDnsTelemetry` | Enable Network Packet Capture DNS | true |
| `--version` | Elastic Agent version | (auto-detect) |

### run_ref7707_caldera_operation.js

| Flag | Description | Default |
|------|-------------|---------|
| `--calderaUrl` | Caldera server URL | http://127.0.0.1:8888 |
| `--calderaApiKey` | Caldera API key | (required) |
| `--group` | Target agent group | ref7707 |
| `--domain` | REF7707 lab domain | poster.checkponit.lab |
| `--dnsIp` | DNS VM Tailscale IP | (recommended) |
| `--webIp` | Web VM Tailscale IP | (recommended) |
| `--webPort` | Web server port | 8080 |
| `--waitMs` | Max wait time for operation | 600000 (10min) |

## Cortado (Red Team Automations)

Cortado is an Elastic tool for running Red Team Automations (RTAs) that simulate attacker behaviors to test and validate detection rules.

### Installing Cortado on a GCP VM

Cortado requires Python 3.12+. On Ubuntu VMs:

```bash
# SSH to the VM
gcloud compute ssh <vm-name> --project=<project> --zone=<zone>

# Install Python 3.12 (Ubuntu 22.04)
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt-get update
sudo apt-get install -y python3.12 python3.12-venv python3.12-dev

# Create virtual environment and install Cortado
python3.12 -m venv ~/cortado-venv
source ~/cortado-venv/bin/activate
pip install --upgrade pip
pip install git+https://github.com/elastic/cortado.git

# Install required dependencies
pip install structlog typer pyyaml click tomli elasticsearch ecs-logging
```

### Verifying Installation

```bash
source ~/cortado-venv/bin/activate
cortado --help
```

### Listing Available RTAs

```bash
# List all RTAs (697+ available)
cortado print-rtas

# Output as JSON
cortado print-rtas --as-json
```

### Running RTAs Programmatically

Create a Python script to run multiple Linux RTAs:

```python
#!/usr/bin/env python3
from cortado.rtas import get_registry, CodeRta

registry = get_registry()

# Get all Linux RTAs that have executable code
linux_rtas = [(name, rta) for name, rta in registry.items() 
              if "linux" in rta.platforms and isinstance(rta, CodeRta)]

print(f"Found {len(linux_rtas)} executable Linux RTAs")

# Run RTAs
for name, rta in linux_rtas[:50]:  # Run first 50
    try:
        rta.code_func()
        print(f"[+] {name}")
    except Exception as e:
        print(f"[-] {name}: {str(e)[:50]}")
```

Run it:
```bash
source ~/cortado-venv/bin/activate
python3 run_rtas.py
```

### Quick One-Liner to Run RTAs

```bash
source ~/cortado-venv/bin/activate && python3 -c "
from cortado.rtas import get_registry, CodeRta
registry = get_registry()
for name, rta in list(registry.items())[:30]:
    if 'linux' in rta.platforms and isinstance(rta, CodeRta):
        try:
            rta.code_func()
            print(f'[+] {name}')
        except: pass
"
```

### Expected Outcomes

Running Cortado RTAs generates process events that trigger prebuilt detection rules such as:

- Base64 Decoded Payload Piped to Interpreter
- Timestomping using Touch Command
- Sudo Command Enumeration Detected
- SUID/SGUID Enumeration Detected
- Process Discovery via Built-In Applications
- Suspicious /proc/maps Discovery
- File Deletion via Shred
- Process Capability Enumeration
- Linux Telegram API Request
- Potential THC Tool Downloaded
- SSH Authorized Keys File Activity
- And many more...

### Prerequisites for Alert Generation

1. **Elastic Agent with Elastic Defend**: Must be installed and healthy on the VM
2. **Prebuilt Rules Installed**: Install prebuilt detection rules in Kibana
3. **Rules Enabled**: Enable Linux-related prebuilt rules

#### Install and Enable Prebuilt Rules

```bash
# Install prebuilt rules
curl -X PUT "http://localhost:5601/api/detection_engine/rules/prepackaged" \
  -u elastic:changeme -H "kbn-xsrf: true" -H "elastic-api-version: 2023-10-31"

# Enable all Linux prebuilt rules (correct query syntax)
curl -X POST "http://localhost:5601/api/detection_engine/rules/_bulk_action" \
  -u elastic:changeme \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -H "elastic-api-version: 2023-10-31" \
  -d '{
    "action": "enable",
    "query": "alert.attributes.tags:\"OS: Linux\""
  }'
```

**Note**: The bulk action typically enables 400+ Linux rules. Rules run on intervals (usually 1 hour), so alerts may not appear immediately after running RTAs.

#### Check Alert Count

```bash
curl -s -u elastic:changeme "http://localhost:5601/api/detection_engine/signals/search" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {"match_all": {}},
    "size": 0,
    "aggs": {
      "by_rule": {"terms": {"field": "kibana.alert.rule.name", "size": 50}},
      "unique_rules": {"cardinality": {"field": "kibana.alert.rule.name"}}
    }
  }' | jq '{total: .hits.total.value, unique_rules: .aggregations.unique_rules.value}'
```

### Troubleshooting Cortado

#### ModuleNotFoundError
If you see missing module errors, install the dependencies:
```bash
pip install structlog typer pyyaml click tomli elasticsearch ecs-logging
```

#### Python Version Error
Cortado requires Python 3.12+. Check your version:
```bash
python3 --version
# If < 3.12, install Python 3.12 using the deadsnakes PPA
```

#### RTAs Not Generating Alerts
1. **Check Elastic Agent status**: `sudo elastic-agent status`
2. **Verify Fleet connectivity**: Agent should show "HEALTHY" status
3. **Check recent events in Elasticsearch**:
```bash
curl -s -u elastic:changeme "http://localhost:9200/.ds-logs-endpoint.events.process-default-*/_search" \
  -H "Content-Type: application/json" \
  -d '{"query": {"term": {"host.name": "<vm-hostname>"}}, "size": 1, "sort": [{"@timestamp": "desc"}]}' \
  | jq '.hits.hits[0]._source["@timestamp"]'
```

If the latest event timestamp is old, the agent may have connectivity issues. Try restarting:
```bash
sudo systemctl restart elastic-agent
```

#### Elastic Defend (Endpoint) Not Collecting Process Events

If `elastic-agent status` shows endpoint as "FAILED" or "STOPPED":

```bash
# Check endpoint status
sudo /opt/Elastic/Endpoint/elastic-endpoint status

# If failed, restart the entire agent
sudo systemctl restart elastic-agent

# Wait 60 seconds for endpoint to initialize
sleep 60

# Verify endpoint is healthy
sudo elastic-agent status
```

**Important**: Even when Fleet shows agent as "online", the endpoint component may be in a failed state. Always verify with `elastic-agent status` on the VM.

#### Alerts Not Appearing in Kibana UI

If alerts exist in Elasticsearch but don't appear in Kibana:
1. **Timezone**: Alerts use UTC timestamps. "Today" in Kibana may differ from your local time
2. **Time filter**: Adjust to "Last 24 hours" or "Last 1 hour"
3. **Space filter**: Ensure you're in the correct Kibana space
4. **Refresh**: Detection rules run on intervals (typically 1 hour). New events won't generate alerts until the next rule execution

### Expected Results from Cortado RTAs

Running all Linux RTAs (~129 available, ~92 executable) typically generates:

| Metric | Expected Value |
|--------|----------------|
| RTAs executed | 80-95 |
| RTAs failed (permission/timeout) | 30-40 |
| Alerts generated | 100+ |
| Unique detection rules triggered | 15-25 |

**Top alerting rules from Cortado RTAs:**
- Base64 Decoded Payload Piped to Interpreter (~25-30 alerts)
- Potential Reverse Shell Activity via Terminal (~5-10 alerts)
- File Transfer or Listener Established via Netcat (~5-8 alerts)
- Executable Masquerading as Kernel Process (~3-5 alerts)
- Potential Hex Payload Execution via Command-Line (~3-5 alerts)
- Linux Telegram API Request (~2-4 alerts)
- Potential THC Tool Downloaded (~2-4 alerts)

### Quick Command: Generate 100+ Alerts

To generate 100+ alerts on a VM with Cortado installed:

```bash
# 1. Enable Linux detection rules
curl -X POST "http://localhost:5601/api/detection_engine/rules/_bulk_action" \
  -u elastic:changeme \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -H "elastic-api-version: 2023-10-31" \
  -d '{"action": "enable", "query": "alert.attributes.tags:\"OS: Linux\""}'

# 2. SSH to VM and run all Linux RTAs
ssh <vm-hostname> 'source ~/cortado-venv/bin/activate && python3 -c "
from cortado.rtas import get_registry, CodeRta
registry = get_registry()
linux_rtas = [(n, r) for n, r in registry.items() if \"linux\" in r.platforms and isinstance(r, CodeRta)]
executed = 0
for name, rta in linux_rtas:
    try:
        rta.code_func()
        executed += 1
    except: pass
print(f\"Executed {executed} RTAs\")
"'

# 3. Check alert count (after waiting for rules to run)
curl -s -u elastic:changeme "http://localhost:5601/api/detection_engine/signals/search" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -H "elastic-api-version: 2023-10-31" \
  -d '{"query": {"range": {"@timestamp": {"gte": "now-1h"}}}, "size": 0}' | jq '.hits.total.value'
```

## Detection Rules

To create a detection rule for REF7707 DNS lookups:

```bash
curl -X POST "http://127.0.0.1:5601/api/detection_engine/rules" \
  -u elastic:changeme \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -H "elastic-api-version: 2023-10-31" \
  -d '{
    "name": "REF7707 Lab - Malicious Domain DNS Query",
    "description": "Detects DNS queries to REF7707 lab domains",
    "type": "query",
    "query": "dns.question.name:(poster.checkponit.lab OR support.fortineat.lab OR update.hobiter.lab)",
    "index": ["logs-*", "packetbeat-*"],
    "severity": "high",
    "risk_score": 73,
    "enabled": true,
    "interval": "5m",
    "from": "now-6m"
  }'
```
