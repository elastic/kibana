---
name: observability-onboarding
description: Guides users through onboarding their systems (Kubernetes, hosts, Docker) into Elastic Observability by auto-detecting the local environment, installing the right collector, and verifying data flow. Use when asked to onboard, set up observability, or ship data to Elastic.
allowed-tools: Bash, Read, Glob, Grep
---

# Elastic Observability Onboarding

This skill guides users through setting up Elastic Observability on their systems. It auto-detects the local environment, proposes an installation plan, installs the Elastic Distribution of OpenTelemetry Collector (EDOT), and verifies data is flowing into Elasticsearch.

## Prerequisites

The following environment variables MUST be set before this skill can run:

- `ES_SHIPPER_KEY` — Elasticsearch API key for the collector to **write** data (base64-encoded). Has `create_index`, `auto_configure`, `write` on log/metric indices and `monitor`, `manage_ilm` cluster privileges.
- `ES_VERIFICATION_KEY` — Elasticsearch API key for **reading** data to verify ingestion (base64-encoded). Read-only, expires after 1 hour.
- `ES_HOST` — The Elasticsearch endpoint URL (e.g. `https://my-deployment.es.us-east-1.aws.elastic.cloud:443`)
- `ELASTIC_STACK_VERSION` — The Elastic Stack version to install (e.g. `9.0.0`)

If any of these variables is missing, stop immediately and tell the user:

> Missing required environment variables. Go to your Kibana "Add Data" page, click
> "AI-guided onboarding", and copy the environment variable commands shown there.

**Important**: Use `ES_SHIPPER_KEY` when configuring the collector (in `otel.yml` / Kubernetes secrets). Use `ES_VERIFICATION_KEY` when querying Elasticsearch to check whether data has arrived.

You also need `KIBANA_URL` (optional) for generating direct links back to Kibana dashboards. If not set, skip the Kibana link generation.

## Phase 1: Discovery [medium freedom]

Do NOT ask the user what they want to onboard — just detect it automatically. Run all of the checks below in parallel (ignore failures — missing tools just means that system type is not present):

### Kubernetes detection

```bash
kubectl version --client -o yaml 2>/dev/null
kubectl get nodes -o wide 2>/dev/null
```

Run both commands independently (do not chain with `&&`). The first checks whether kubectl is installed; the second checks whether it can reach a cluster. Either can fail without affecting the other. If kubectl is installed but cannot reach a cluster, note that and ask the user if they want to configure a kubeconfig.

### Docker detection

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' 2>/dev/null
```

Note running containers, their images, and status.

### Host service detection

```bash
systemctl list-units --type=service --state=running --no-pager 2>/dev/null | head -30

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

Based on discovery, propose ONE of these installation paths:

| Environment | Collector | Approach |
|---|---|---|
| Kubernetes cluster | EDOT Collector via Helm (opentelemetry-kube-stack) | Helm chart with k8s receivers |
| Linux/macOS host | EDOT Collector via elastic-agent distro tarball | Download, extract, configure, run `./otelcol` |
| Docker containers | Same as host (run `./otelcol` with Docker socket access) | Download distro, mount Docker paths |

If multiple environments are detected (e.g. host with Docker AND k8s), recommend the most encompassing option (k8s > Docker > host).

Present the plan to the user and wait for confirmation before proceeding. The plan should include:
1. What will be installed
2. What data will be collected (logs, metrics, traces)
3. Where config files will be placed
4. What services/integrations will be detected

## Phase 3: Execution [low freedom]

### Kubernetes

Uses the `open-telemetry/opentelemetry-kube-stack` Helm chart with Elastic-provided values.
The EDOT version to install comes from the `ELASTIC_STACK_VERSION` environment variable.

```bash
helm repo add open-telemetry 'https://open-telemetry.github.io/opentelemetry-helm-charts' --force-update

kubectl create namespace opentelemetry-operator-system

kubectl create secret generic elastic-secret-otel \
  --namespace opentelemetry-operator-system \
  --from-literal=elastic_endpoint="${ES_HOST}" \
  --from-literal=elastic_api_key="${ES_SHIPPER_KEY}"

helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \
  --namespace opentelemetry-operator-system \
  --values "https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v${ELASTIC_STACK_VERSION}/deploy/helm/edot-collector/kube-stack/values.yaml" \
  --version '0.12.4'
```

Wait for pods to be ready:

```bash
kubectl get pods -n opentelemetry-operator-system -w --timeout=120s
```

### Host (Linux)

Download the elastic-agent distribution (which includes the EDOT `otelcol` binary and sample OTel configs):

```bash
arch=$(if [[ $(uname -m) == "arm" || $(uname -m) == "aarch64" ]]; then echo "arm64"; else echo $(uname -m); fi)

curl --output elastic-distro-${ELASTIC_STACK_VERSION}-linux-$arch.tar.gz \
  --url https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${ELASTIC_STACK_VERSION}-linux-$arch.tar.gz \
  --proto '=https' --tlsv1.2 -fL

mkdir -p elastic-distro-${ELASTIC_STACK_VERSION}-linux-$arch
tar -xvf elastic-distro-${ELASTIC_STACK_VERSION}-linux-$arch.tar.gz \
  -C "elastic-distro-${ELASTIC_STACK_VERSION}-linux-$arch" --strip-components=1
cd elastic-distro-${ELASTIC_STACK_VERSION}-linux-$arch
```

Configure using the bundled sample config (includes logs + host metrics):

```bash
rm ./otel.yml
cp ./otel_samples/platformlogs_hostmetrics.yml ./otel.yml
mkdir -p ./data/otelcol

sed -i 's#${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml
sed -i 's#${env:ELASTIC_ENDPOINT}#'"${ES_HOST}"'#g' ./otel.yml
sed -i 's/${env:ELASTIC_API_KEY}/'"${ES_SHIPPER_KEY}"'/g' ./otel.yml
```

Start the collector:

```bash
sudo ./otelcol --config otel.yml
```

### Host (macOS)

Same approach but with different architecture mapping:

```bash
arch=$(if [[ $(uname -m) == "arm64" ]]; then echo "aarch64"; else echo $(uname -m); fi)

curl --output elastic-distro-${ELASTIC_STACK_VERSION}-darwin-$arch.tar.gz \
  --url https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${ELASTIC_STACK_VERSION}-darwin-$arch.tar.gz \
  --proto '=https' --tlsv1.2 -fL

mkdir -p "elastic-distro-${ELASTIC_STACK_VERSION}-darwin-$arch"
tar -xvf elastic-distro-${ELASTIC_STACK_VERSION}-darwin-$arch.tar.gz \
  -C "elastic-distro-${ELASTIC_STACK_VERSION}-darwin-$arch" --strip-components=1
cd elastic-distro-${ELASTIC_STACK_VERSION}-darwin-$arch
```

Configure (note: macOS `sed -i` requires `''`):

```bash
rm ./otel.yml
cp ./otel_samples/platformlogs_hostmetrics.yml ./otel.yml
mkdir -p ./data/otelcol

sed -i '' 's#${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml
sed -i '' 's#${env:ELASTIC_ENDPOINT}#'"${ES_HOST}"'#g' ./otel.yml
sed -i '' 's/${env:ELASTIC_API_KEY}/'"${ES_SHIPPER_KEY}"'/g' ./otel.yml
```

Start the collector (no sudo needed on macOS):

```bash
./otelcol --config otel.yml
```

### Docker environments

For hosts running Docker containers, use the same host installation as above (Linux or macOS).
The bundled `platformlogs_hostmetrics.yml` config will collect host metrics and system logs.
Docker container logs are written to `/var/lib/docker/containers/` which the filelog receiver will pick up from the host filesystem.

If the user only wants to monitor Docker containers and not the host, they can additionally configure
a `filelog` receiver for `/var/lib/docker/containers/*/*.log` in the `otel.yml` after extraction.

After starting the collector, wait 10 seconds and check for errors in the output.

## Phase 4: Verification [low freedom]

Poll Elasticsearch to confirm data is flowing. Use the **verification key** (`ES_VERIFICATION_KEY`), not the shipper key:

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${ES_HOST}/logs-*,metrics-*/_search" \
  -H "Authorization: ApiKey ${ES_VERIFICATION_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"size":0,"query":{"range":{"@timestamp":{"gte":"now-2m"}}}}'
```

Do NOT pipe the output through `python3` or `jq` — just read the raw JSON response yourself. Check:
- `HTTP_STATUS:200` means the request succeeded.
- `hits.total.value > 0` means data is flowing.
- Any `4xx`/`5xx` status or `"error"` in the body means something is wrong — read the error message and troubleshoot.

Retry up to 6 times with 20-second intervals (2 minutes total). If data arrives, report success. If not after 2 minutes, check collector logs again and suggest troubleshooting steps.

## Phase 5: Next Steps [high freedom]

Once data is confirmed, tell the user where to go:

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

## Localhost / Network Connectivity

If `ES_HOST` points to `localhost` or `127.0.0.1`, warn the user that the collector must be able to reach that address from wherever it runs. Common pitfalls:

- **Kubernetes pods**: `localhost` inside a pod refers to the pod itself, not the host machine. The user needs to use the host's real IP, a NodePort service, or a Kubernetes service name instead.
- **Docker containers**: If the collector runs inside a container, `localhost` refers to the container's own network namespace. Use `host.docker.internal` (macOS/Windows) or the host's real IP.
- **Remote machines**: If the user SSHed into a server to run the skill, `localhost` on that server won't reach an Elasticsearch running on their laptop.

Ask the user to confirm connectivity if `ES_HOST` contains `localhost` or `127.0.0.1` before proceeding with installation.

## Common Mistakes

- **Do NOT install Elastic Agent in managed mode** — this skill uses the EDOT Collector (`otelcol` binary) bundled in the elastic-agent distribution, running it standalone with an OTel config, not as a managed Elastic Agent.
- **Do NOT ask for Elasticsearch credentials** — they come from the environment variables set by the Kibana UI.
- **Do NOT modify system packages** without user confirmation.
- **Do NOT proceed** with installation if the user has not confirmed the plan.
- **Do NOT fabricate download URLs** — the elastic-agent distro is at `artifacts.elastic.co/downloads/beats/elastic-agent/`, and the bundled OTel sample configs are in `./otel_samples/` inside the extracted archive.
- **Do NOT write OTel configs from scratch** — always use the bundled `otel_samples/platformlogs_hostmetrics.yml` (or `platformlogs.yml` for logs only) and substitute the placeholders with `sed`.
