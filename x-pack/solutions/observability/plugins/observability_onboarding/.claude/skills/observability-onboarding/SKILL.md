---
name: observability-onboarding
description: Guides users through onboarding their systems (Kubernetes, hosts, Docker) into Elastic Observability by auto-detecting the local environment, installing the right collector, and verifying data flow. Use when asked to onboard, set up observability, or ship data to Elastic.
allowed-tools: Bash, Read, Glob, Grep
---

# Elastic Observability Onboarding

This skill guides users through setting up Elastic Observability on their systems. It auto-detects the local environment, proposes an installation plan, installs the Elastic Distribution of OpenTelemetry Collector (EDOT), and verifies data is flowing into Elasticsearch.

## Prerequisites

The following environment variables MUST be set before this skill can run:

- `ES_ONBOARDING_KEY` — An Elasticsearch API key with ingest privileges (base64-encoded)
- `ES_HOST` — The Elasticsearch endpoint URL (e.g. `https://my-deployment.es.us-east-1.aws.elastic.cloud:443`)

If either variable is missing, stop immediately and tell the user:

> Missing required environment variables. Go to your Kibana "Add Data" page, click
> "AI-guided onboarding", and copy the environment variable commands shown there.

You also need `KIBANA_URL` (optional) for generating direct links back to Kibana dashboards. If not set, skip the Kibana link generation.

## Phase 1: Discovery [medium freedom]

Ask the user what they want to monitor. Then detect the local environment by running these checks (ignore failures — missing tools just means that system type is not present):

### Kubernetes detection

```bash
kubectl version --client --short 2>/dev/null && kubectl get nodes -o wide 2>/dev/null
```

If kubectl is available and can reach a cluster, note the cluster name, node count, and Kubernetes version.

### Docker detection

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' 2>/dev/null
```

Note running containers, their images, and status.

### Host service detection

```bash
# Linux services
systemctl list-units --type=service --state=running --no-pager 2>/dev/null | head -30

# Common log paths
ls -la /var/log/nginx/ /var/log/apache2/ /var/log/httpd/ /var/log/mysql/ /var/log/postgresql/ 2>/dev/null
```

### OS detection

```bash
uname -s -r -m
cat /etc/os-release 2>/dev/null || sw_vers 2>/dev/null
```

### Summary

Present findings to the user:

> Based on what I found on your system:
> - **OS**: Ubuntu 22.04 (x86_64)
> - **Kubernetes**: v1.28 cluster with 3 nodes
> - **Running services**: nginx, postgresql
> - **Docker containers**: redis, rabbitmq
>
> I recommend setting up [specific approach]. Shall I proceed?

## Phase 2: Planning [medium freedom]

Based on discovery, propose ONE of these installation paths. Read the corresponding reference for detailed instructions:

| Environment | Collector | Reference |
|---|---|---|
| Kubernetes cluster | EDOT Collector via Helm | `references/kubernetes.md` |
| Linux/macOS host | EDOT Collector via package manager or binary | `references/hosts.md` |
| Docker containers | EDOT Collector as container | `references/docker.md` |

If multiple environments are detected (e.g. host with Docker AND k8s), recommend the most encompassing option (k8s > Docker > host).

Present the plan to the user and wait for confirmation before proceeding. The plan should include:
1. What will be installed
2. What data will be collected (logs, metrics, traces)
3. Where config files will be placed
4. What services/integrations will be detected

## Phase 3: Execution [low freedom]

Read the appropriate reference file for step-by-step instructions. The general pattern is:

1. **Install EDOT Collector** using the method from the reference
2. **Generate config** using the OTel collector config template from `references/otel-config.md`, substituting:
   - `${ES_HOST}` — from environment variable
   - `${ES_ONBOARDING_KEY}` — from environment variable
   - Receivers appropriate for the detected environment
3. **Write config** to the appropriate location
4. **Start the collector** and verify it starts without errors

After starting the collector, wait 10 seconds and check the collector logs for errors:

```bash
# For systemd-managed installs
journalctl -u elastic-otel-collector --no-pager -n 20 2>/dev/null

# For Docker installs
docker logs edot-collector --tail 20 2>/dev/null

# For Kubernetes installs
kubectl logs -l app.kubernetes.io/name=opentelemetry-collector -n elastic-otel --tail 20 2>/dev/null
```

If errors are found, diagnose and fix them before proceeding.

## Phase 4: Verification [low freedom]

Poll Elasticsearch to confirm data is flowing. Use the API key from the environment:

```bash
curl -s -X POST "${ES_HOST}/logs-*,metrics-*/_search" \
  -H "Authorization: ApiKey ${ES_ONBOARDING_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "size": 0,
    "query": {
      "range": {
        "@timestamp": {
          "gte": "now-2m"
        }
      }
    }
  }' | python3 -c "import sys,json; r=json.load(sys.stdin); print(f'Documents found: {r[\"hits\"][\"total\"][\"value\"]}')"
```

Retry up to 6 times with 20-second intervals (2 minutes total). If data arrives, report success. If not after 2 minutes, check collector logs again and suggest troubleshooting steps.

## Phase 5: Next Steps [high freedom]

Once data is confirmed, tell the user:

> Your data is flowing into Elasticsearch! Here's where to go next:

For **Kubernetes**:
- Kibana → Observability → Infrastructure → Kubernetes cluster overview
- Kibana → Observability → Logs Explorer (filter by `kubernetes.namespace`)

For **Hosts**:
- Kibana → Observability → Infrastructure → Hosts inventory
- Kibana → Observability → Logs Explorer

For **Docker**:
- Kibana → Observability → Infrastructure → Hosts → container metrics
- Kibana → Observability → Logs Explorer (filter by `container.name`)

If `KIBANA_URL` is set, provide direct links.

Suggest additional actions:
- Set up alerts for resource usage
- Create SLOs for service availability
- Explore pre-built dashboards for detected integrations

## Common Mistakes

- **Do NOT install Elastic Agent** — this skill uses the EDOT Collector (OpenTelemetry-based), not the classic Elastic Agent.
- **Do NOT ask for Elasticsearch credentials** — they come from the environment variables set by the Kibana UI.
- **Do NOT modify system packages** without user confirmation.
- **Do NOT proceed** with installation if the user has not confirmed the plan.
