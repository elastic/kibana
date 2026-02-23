# Resolver Generator Script

This script makes it easy to create the endpoint metadata, alert, and event documents needed to test Resolver in Kibana.
The default behavior is to create 1 endpoint with 1 alert and a moderate number of events (random, typically on the order of 20).
A seed value can be provided as a string for the random number generator for repeatable behavior, useful for demos etc.
Use the `-d` option if you want to delete and remake the indices, otherwise it will add documents to existing indices.

Example command sequence to get ES and kibana running with sample data after installing ts-node:

`yarn es snapshot` -> starts ES

`npx yarn start --no-base-path` -> starts kibana. Note: you may need other configurations steps to start the security solution with endpoint support.

`cd x-pack/solutions/security/plugins/security_solution/scripts/endpoint`

`yarn test:generate` -> run the resolver_generator.ts script

To see Resolver generator CLI options, run `yarn test:generate --help`.

## Agent Skills demo environment

This demo script provisions an Ubuntu VM using Multipass, installs and enrolls Elastic Agent, and ensures both:
- Elastic Defend (`endpoint` integration)
- Osquery Manager (`osquery_manager` integration)

It is intended as a complete, reproducible environment for demonstrating Agent skills.

### Prerequisites

- A running local stack (Elasticsearch + Kibana) with Fleet enabled
- `docker` installed (the script can start Fleet Server via Docker)
- `multipass` installed (used to provision the Ubuntu VM)

### Run

From the Kibana repo root:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_agent_skills_demo.js --help
```

Example:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_agent_skills_demo.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200 \
  --scenario default
```

### Optional: automate UI with Playwright (demo flow)

After setup completes (VM enrolled + integrations installed), you can automate Kibana UI navigation using Playwright:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_agent_skills_demo.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200 \
  --scenario default \
  --runPlaywrightUi
```

To run headful (opens a browser window and keeps it open), add:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_agent_skills_demo.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200 \
  --scenario default \
  --runPlaywrightUi \
  --showBrowser
```

The Playwright UI script is: `x-pack/solutions/security/plugins/security_solution/scripts/endpoint/agent_skills_demo/ui/agent_skills_demo_ui.mjs`.

## REF7707-like benign lab environment (Linux-only, Multipass)

This lab script provisions a small Multipass topology and generates **benign** telemetry inspired by the Elastic Security Labs REF7707 report (domains, DNS lookups, downloads, execution, persistence-ish, SSH lateral-ish).

Key point: `/etc/hosts` does **not** generate DNS telemetry, so this lab sets up a DNS server VM and configures victims to use it to reliably populate `dns.question.name`.

Run:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_ref7707_lab.js --help
```

### Cleanup

- **Auto cleanup after demo**: pass `--cleanup`
- **Manual teardown of a VM**: pass `--teardownVm <vmName>`

## GCP VM Recovery (when agents go offline)

If your GCP VMs go offline (typically due to Tailscale session expiry), use the recovery script:

```bash
export TS_AUTHKEY="tskey-...."

# Recover all your VMs
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject YOUR_GCP_PROJECT

# Recover specific VMs by pattern
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject YOUR_GCP_PROJECT \
  --vmFilter='name~"^myprefix-"'

# Also start suspended VMs
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_recover_all.js \
  --gcpProject YOUR_GCP_PROJECT \
  --startSuspended
```

For single VM repair:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_gcp_vm_repair.js \
  --gcpProject YOUR_GCP_PROJECT \
  --vmName your-vm-name
```

See `gcp_fleet_vm/README.md` and `gcp_fleet_vm/AGENTS.md` for full documentation.

## Fixing host IP drift (Fleet Server + Elasticsearch output + multipass agents)

If your host LAN IP changes (or auto-detection picks the wrong one), multipass VMs and the Fleet Server Docker container may end up pointing at an unreachable IP.

Use this helper to:
- update Fleet Server host URLs in Fleet settings
- update Fleet Elasticsearch output hosts in Fleet settings
- restart the Fleet Server Docker container
- re-enroll Elastic Agent in all multipass VMs (so they switch to the new Fleet Server URL immediately)

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_update_fleet_host_ip.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200 \
  --hostIp 192.168.3.247
```

## Enabling remote access on Multipass VMs (RDP/SSH)

For demo purposes, you can enable remote access on all Multipass instances:
- **RDP**: installs `xrdp` + `xfce4` (port 3389)
- **SSH**: optionally enables password authentication (off by default)
- optionally resets the `ubuntu` user password

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_enable_remote_access.js --help
```

## Caldera MITRE test runner (plan + validate + optional execute)

This script helps you use Caldera to exercise a MITRE tactic/technique **only when** there is an enabled Elastic detection rule available for that ATT&CK mapping (and target OS).

Default mode is **plan**:
- lists Fleet agents in-scope for the selected OS (Fleet Server is never a target)
- checks detection rule coverage (and can install prebuilt rules if missing)

Execution is **explicit** via `--execute` and targets a single Fleet agent (`--fleetAgentId`).

Run:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_caldera_mitre_rule_validation.js --help
```

## Default Multipass VM sizing

The endpoint demo/dev scripts create Multipass VMs with a default of:
- **2 CPUs**
- **15G disk**
- **2G memory**

Most scripts allow overriding these by passing VM options down to the underlying VM creation helpers.

## Bridged networking (Multipass) for reaching LAN services (e.g. Caldera)

By default, new Multipass VMs created by these scripts will attempt to attach a **bridged** network
interface (in addition to the default NAT) so the VM can reach services on your LAN (for example,
Caldera running on another host).

Environment variables:
- **`KBN_MULTIPASS_BRIDGED=0`**: disable bridged networking (NAT only)
- **`KBN_MULTIPASS_BRIDGED_NETWORK=en0`**: select the host interface to bridge (defaults to auto-detect; `en0` is common on macOS)
