# GCP Fleet VM - Agent Instructions

This document provides instructions for AI agents working with the GCP Fleet VM provisioning scripts.

## Overview

These scripts provision Fleet Server and Elastic Agent VMs on Google Cloud Platform (GCP), connected to a local Kibana/Elasticsearch instance via Tailscale VPN.

## Prerequisites

1. **GCP CLI**: `gcloud` installed and authenticated (`gcloud auth login`)
2. **Tailscale**: Installed, authenticated, and connected to your tailnet
3. **Local Stack**: Kibana (5601) and Elasticsearch (9200) running locally
4. **Environment Variables**:
   - `TS_AUTHKEY`: Tailscale auth key (reusable, not ephemeral)

## Script Location

Main script: `x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_fleet_vm.js`

## Basic Usage

### Deploy Fleet Server + Agent VMs on GCP

```bash
export TS_AUTHKEY="tskey-auth-..."

node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_fleet_vm.js \
  --gcpProject elastic-security-dev \
  --gcpZone us-central1-a \
  --namePrefix "yourname-test" \
  --ubuntuAgentCount 2
```

### Deploy with Local Docker Fleet Server

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_fleet_vm.js \
  --gcpProject elastic-security-dev \
  --gcpZone us-central1-a \
  --fleetServerMode local-docker \
  --namePrefix "yourname-test" \
  --ubuntuAgentCount 2
```

## Agent Policies Created

### GCP VM agents
- Default policy for enrolled agents
- Add integrations as needed (Elastic Defend, Osquery, etc.)

### GCP VM agents - Osquery Only
- Created when `--osqueryOnlyAgentCount > 0`
- Contains only Osquery Manager integration
- For lightweight telemetry collection

### GCP Fleet Server
- Policy for Fleet Server agent
- Contains Fleet Server integration

## CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--gcpProject` | GCP project ID | (required) |
| `--gcpZone` | GCP zone | us-central1-a |
| `--tailscaleAuthKey` | Tailscale auth key | `$TS_AUTHKEY` |
| `--localTailscaleHostname` | Your Tailscale MagicDNS hostname | (auto-detect) |
| `--fleetServerMode` | `gcp` or `local-docker` | gcp |
| `--fleetServerPort` | Fleet Server listen port | 8220 |
| `--fleetServerName` | Fleet Server VM name | (auto-generated) |
| `--namePrefix` | Prefix for agent VM names | (required) |
| `--ubuntuAgentCount` | Number of Ubuntu agent VMs | 1 |
| `--windowsAgentCount` | Number of Windows agent VMs | 0 |
| `--osqueryOnlyAgentCount` | Number of Osquery-only Ubuntu VMs | 0 |
| `--agentMachineType` | GCP machine type for agents | e2-medium |
| `--fleetServerMachineType` | GCP machine type for Fleet Server | e2-medium |
| `--version` | Elastic Agent version | (auto-detect from Kibana) |
| `--enableCaldera` | Deploy Caldera sandcat agents | false |
| `--calderaUrl` | Caldera server URL | (auto-detect via Tailscale) |

## How It Works

1. **Tailscale Setup**: Each VM joins your Tailscale network during startup
2. **Fleet Output Configuration**: Elasticsearch output is set to your local ES via Tailscale IP
3. **Fleet Server**: Either deployed on GCP or run locally in Docker
4. **Agent Enrollment**: VMs download and install Elastic Agent, enrolling to Fleet Server
5. **Caldera (optional)**: Sandcat agent deployed for adversary emulation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Local Machine                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Kibana:5601 │  │   ES:9200   │  │ Caldera:8888 (opt)  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                   Tailscale VPN                              │
└──────────────────────────┼───────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Fleet Server│ │  Agent VM 1 │ │  Agent VM 2 │
    │   (GCP)     │ │   (GCP)     │ │   (GCP)     │
    └─────────────┘ └─────────────┘ └─────────────┘
```

## Recovery Script

When agents go offline (typically due to Tailscale session expiry), use the recovery script to bring them back online:

### Recover All Your VMs
```bash
export TS_AUTHKEY="tskey-auth-..."

node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject elastic-security-dev
```

### Recover VMs Matching a Pattern
```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject elastic-security-dev \
  --vmFilter='name~"^patryk-ref7707"'
```

### Also Start Suspended VMs
```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject elastic-security-dev \
  --startSuspended
```

### Recovery Script Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--gcpProject` | GCP project ID | (required or `$GCP_PROJECT`) |
| `--gcpZone` | GCP zone | us-central1-a |
| `--vmFilter` | GCP filter pattern | `name~"^<username>-"` |
| `--tailscaleAuthKey` | Tailscale auth key | `$TS_AUTHKEY` |
| `--kibanaUrl` | Kibana URL for Fleet check | http://127.0.0.1:5601 |
| `--concurrency` | VMs to repair in parallel | 4 |
| `--startSuspended` | Start suspended/terminated VMs | false |
| `--skipAgentRestart` | Only repair Tailscale | false |

### What the Recovery Script Does

1. **Discovers VMs**: Lists all GCP VMs matching the filter pattern
2. **Starts Suspended VMs** (optional): If `--startSuspended`, starts any suspended/terminated VMs
3. **Repairs Tailscale**: Checks if Tailscale is logged out and re-authenticates with the auth key
4. **Restarts Elastic Agent**: Restarts the agent service to reconnect to Fleet
5. **Verifies Status**: Queries Fleet API to confirm agents are back online

### Repair Single VM

For a single VM, use the dedicated repair script:
```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_repair.js \
  --gcpProject elastic-security-dev \
  --vmName patryk-ref7707-ubuntu-1 \
  --tailscaleAuthKey "$TS_AUTHKEY"
```

## Common Operations

### Check Enrolled Agents
```bash
curl -s -u elastic:changeme "http://127.0.0.1:5601/api/fleet/agents" \
  -H "elastic-api-version: 2023-10-31" | jq '.items[] | {hostname: .local_metadata.host.hostname, status}'
```

### Get Agent Policy Details
```bash
curl -s -u elastic:changeme "http://127.0.0.1:5601/api/fleet/agent_policies/<POLICY_ID>" \
  -H "elastic-api-version: 2023-10-31" | jq '.item.package_policies[] | {name, package: .package.name}'
```

### SSH to GCP VM via Tailscale
```bash
# Using Tailscale hostname
ssh yourname-test-ubuntu-1

# Or via gcloud
gcloud compute ssh yourname-test-ubuntu-1 --project elastic-security-dev --zone us-central1-a
```

### Check Agent Status on VM
```bash
ssh yourname-test-ubuntu-1 sudo elastic-agent status
```

## Troubleshooting

### "TS_AUTHKEY not set"
Export the environment variable:
```bash
export TS_AUTHKEY="tskey-auth-..."
```

### Agent Version Not Found (404)
Specify a valid version:
```bash
--version 8.17.0
```
Or for snapshots:
```bash
--version 9.3.0-SNAPSHOT
```

### Fleet Server VM Not Enrolling
1. Check startup script logs:
   ```bash
   gcloud compute ssh <fleet-server-name> --command "sudo tail -100 /var/log/google-startup-scripts.log"
   ```
2. Verify Tailscale connectivity:
   ```bash
   gcloud compute ssh <fleet-server-name> --command "sudo tailscale status"
   ```
3. Check elastic-agent status:
   ```bash
   gcloud compute ssh <fleet-server-name> --command "sudo systemctl status elastic-agent"
   ```

### Elasticsearch Not Reachable
Ensure your local Elasticsearch is accessible via Tailscale:
```bash
curl -u elastic:changeme "http://$(tailscale ip -4):9200"
```

### Fleet Settings Pointing to Wrong URL
Update Fleet Server hosts in Kibana:
```bash
# Get current settings
curl -s -u elastic:changeme "http://127.0.0.1:5601/api/fleet/fleet_server_hosts" \
  -H "elastic-api-version: 2023-10-31" | jq '.items[]'

# Update default host
curl -X PUT "http://127.0.0.1:5601/api/fleet/fleet_server_hosts/<HOST_ID>" \
  -u elastic:changeme \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -H "elastic-api-version: 2023-10-31" \
  -d '{"host_urls": ["https://<fleet-server-tailscale-hostname>:8220"]}'
```

## Cleanup

### Delete Specific VMs
```bash
gcloud compute instances delete yourname-test-ubuntu-1 yourname-test-ubuntu-2 \
  --project elastic-security-dev --zone us-central1-a --quiet
```

### Delete All VMs with Prefix
```bash
gcloud compute instances list --project elastic-security-dev \
  --filter="name~'^yourname-test'" --format="value(name,zone)" | \
  while read name zone; do
    gcloud compute instances delete "$name" --project elastic-security-dev --zone "$zone" --quiet
  done
```

### Stop Local Docker Fleet Server
```bash
docker stop $(docker ps -q --filter "name=fleet-server")
```

## Integration with REF7707 Lab

For full REF7707 lab setup (includes DNS/Web infrastructure + Caldera operation):
See `../ref7707_lab/AGENTS.md`
