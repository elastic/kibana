# Kubernetes Onboarding

## Prerequisites

- `kubectl` configured and connected to the target cluster
- `helm` v3 installed
- Cluster admin or equivalent permissions to create namespaces and deploy DaemonSets

## Installation Steps

### 1. Add the Elastic Helm repo

```bash
helm repo add elastic https://helm.elastic.co
helm repo update
```

### 2. Create namespace

```bash
kubectl create namespace elastic-otel 2>/dev/null || true
```

### 3. Create the API key secret

```bash
kubectl create secret generic elastic-credentials \
  --namespace elastic-otel \
  --from-literal=api-key="${ES_ONBOARDING_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 4. Install EDOT Collector via Helm

```bash
helm install elastic-otel elastic/elastic-otel \
  --namespace elastic-otel \
  --set "exporters.elasticsearch.endpoint=${ES_HOST}" \
  --set "exporters.elasticsearch.apiKey.secretName=elastic-credentials" \
  --set "exporters.elasticsearch.apiKey.secretKey=api-key" \
  --set "receivers.filelog.enabled=true" \
  --set "receivers.k8s_cluster.enabled=true" \
  --set "receivers.k8s_events.enabled=true" \
  --set "receivers.kubeletstats.enabled=true" \
  --set "receivers.hostmetrics.enabled=true"
```

If the Helm chart is not available or the user wants more control, fall back to a raw manifest approach using the config from `otel-config.md` with Kubernetes-specific receivers.

### 5. Verify pods are running

```bash
kubectl get pods -n elastic-otel -w --timeout=120s
```

Wait until all pods show `Running` status.

## Collected Data

- **Logs**: Container stdout/stderr via filelog receiver, Kubernetes events
- **Metrics**: Node metrics (CPU, memory, disk, network), pod metrics, container metrics, kubelet stats
- **Cluster metadata**: Namespace, deployment, replica set, pod relationships

## Troubleshooting

- If pods are in `CrashLoopBackOff`, check logs: `kubectl logs -l app.kubernetes.io/name=opentelemetry-collector -n elastic-otel --previous`
- If no data appears, verify the ES endpoint is reachable from within the cluster: `kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- curl -s -o /dev/null -w "%{http_code}" "${ES_HOST}"`
- For RBAC issues, ensure the service account has cluster-reader permissions
