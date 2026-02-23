# GCP Fleet Server + Elastic Agent VM Provisioning (Tailscale)

This tooling provisions:
- A **Fleet Server** either on a GCP Ubuntu VM or **locally in Docker**
- A configurable number of **Elastic Agent** VMs on GCP (Ubuntu + optional Windows)
- Optional **Caldera agents** (sandcat) on the same VMs

It uses **Tailscale** so that a **local-only Elasticsearch** (and optionally local Caldera) can be reached from GCP VMs without exposing your laptop to the public internet.

## Prerequisites
- **Tailscale** installed and connected on your local machine
- A **Tailscale auth key** for unattended VM join (ephemeral/reusable with minimal permissions recommended)
- **gcloud** installed and authenticated:
  - `gcloud auth login`
  - `gcloud auth application-default login`
- Local Kibana + Elasticsearch running
- Elasticsearch reachable from the tailnet (not just `localhost`)
  - You should be able to hit `http://<your-tailscale-ip>:9200` from another tailnet node.

## Run

```bash
export TS_AUTHKEY="tskey-...."   # or pass --tailscaleAuthKey
export TS_HOSTNAME="macbook-pro-patryk.tail9bbcc.ts.net"  # optional (MagicDNS). If not set, the script auto-detects it via `tailscale status --json`.

node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_fleet_vm.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200 \
  --gcpProject YOUR_GCP_PROJECT \
  --gcpZone us-central1-a \
  --ubuntuAgentCount 2 \
  --windowsAgentCount 1
```

By default, created VM names are prefixed with your local username (sanitized) **and** a short random run suffix to avoid collisions between different users (and between repeated runs).

### Fleet Server locally (Docker)
If you want Fleet Server to run locally (and be reachable from GCP VMs via Tailscale):

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_fleet_vm.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200 \
  --gcpProject YOUR_GCP_PROJECT \
  --gcpZone us-central1-a \
  --fleetServerMode local-docker \
  --fleetServerPort 8220 \
  --ubuntuAgentCount 1
```

If you prefer using MagicDNS explicitly, you can also pass:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_fleet_vm.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://macbook-pro-patryk.tail9bbcc.ts.net:9200 \
  --localTailscaleHostname macbook-pro-patryk.tail9bbcc.ts.net \
  --gcpProject YOUR_GCP_PROJECT \
  --gcpZone us-central1-a
```

### Optional: Caldera agents
- Start Caldera locally via `dev_tools/caldera/`
- Configure `dev_tools/caldera/conf/local.yml` to use your **Tailscale IP/DNS** for `app.contact.*` (see `dev_tools/caldera/conf/local.yml.example`)

Then run:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_fleet_vm.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200 \
  --gcpProject YOUR_GCP_PROJECT \
  --gcpZone us-central1-a \
  --ubuntuAgentCount 2 \
  --enableCaldera
```

### Deploy Caldera to existing Ubuntu VM(s) (no provisioning)
If you already have Ubuntu VM(s) running on GCP and just want to install/start sandcat:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_fleet_vm.js \
  --gcpProject YOUR_GCP_PROJECT \
  --gcpZone us-central1-a \
  --deployCalderaToExistingUbuntu \
  --calderaTargetUbuntuVms existing-ubuntu-vm-1,existing-ubuntu-vm-2 \
  --calderaUrl http://macbook-pro-patryk.tail9bbcc.ts.net:8888
```

## Teardown
Add `--cleanup` to delete the created VMs after provisioning completes.

## Recovery (when agents go offline)

If your GCP VMs go offline (typically due to Tailscale session expiry after ~24-48 hours), use the recovery script to bring them back online:

### Recover all your VMs

```bash
export TS_AUTHKEY="tskey-...."

node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject YOUR_GCP_PROJECT
```

This will:
1. Discover all your GCP VMs (filtered by username by default)
2. Check and re-authenticate Tailscale if needed
3. Restart Elastic Agent on each VM
4. Verify Fleet status and report results

### Recover specific VMs

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject YOUR_GCP_PROJECT \
  --vmFilter='name~"^myprefix-"'
```

### Start suspended VMs and recover

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject YOUR_GCP_PROJECT \
  --startSuspended
```

### Recovery CLI options

| Flag | Description | Default |
|------|-------------|---------|
| `--gcpProject` | GCP project ID | (required) |
| `--gcpZone` | GCP zone | us-central1-a |
| `--vmFilter` | GCP filter pattern | `name~"^<username>-"` |
| `--tailscaleAuthKey` | Auth key for re-auth | `$TS_AUTHKEY` |
| `--kibanaUrl` | Kibana URL for Fleet check | http://127.0.0.1:5601 |
| `--concurrency` | VMs to repair in parallel | 4 |
| `--startSuspended` | Start suspended VMs first | false |
| `--skipAgentRestart` | Only repair Tailscale | false |

### Repair single VM

For a single VM, use the dedicated repair script:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_repair.js \
  --gcpProject YOUR_GCP_PROJECT \
  --vmName your-vm-name \
  --tailscaleAuthKey "$TS_AUTHKEY"
```

## REF7707 lab (optional)
REF7707-specific infra provisioning is intentionally **not** part of this script (to keep it generic). Use:

- `x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_ref7707_gcp_infra.js`
- then `x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_ref7707_caldera_operation.js`

## Notes on secrets
This script:
- Does **not** write secrets into the repository workspace
- Generates VM startup scripts in a temp directory and deletes them after VM creation

However, secrets used for unattended provisioning (Tailscale auth key, enrollment token, service token) will still be present in **GCE instance metadata** while instances exist.

## Elastic Agent versions (snapshots vs releases)
The script resolves the **exact Elastic Agent download URL** at runtime:
- For **release** versions, it uses `artifacts.elastic.co`.
- For **`*-SNAPSHOT`** versions, it fetches the snapshot `manifest_url` and uses the URL embedded in the manifest (so the build id is always correct).


