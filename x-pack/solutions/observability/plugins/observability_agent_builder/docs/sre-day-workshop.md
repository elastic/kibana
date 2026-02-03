# SRE Day Workshop - Observability Setup

This document describes how to set up observability for a Kubernetes cluster running the Google Online Boutique microservices demo, sending data to an Elastic deployment.

## Overview

- **GKE Cluster:** `gke_elastic-observability_us-central1-a_sre-llms`
- **Application:** Google Online Boutique (11 microservices + load generator)
- **Observability Stack:** OpenTelemetry Collector → Elastic Observability

---

## Prerequisites

### 1. Install Required Tools (macOS), follow the guide https://gist.github.com/flash1293/1979842aac05eb86d8d3865f2ff467dd 


```bash
# Install kubectl
brew install kubectl

# Install gcloud CLI
brew install google-cloud-sdk

# Install GKE auth plugin
gcloud components install gke-gcloud-auth-plugin

# Install Helm
brew install helm

# Configure GKE auth plugin
echo 'export USE_GKE_GCLOUD_AUTH_PLUGIN=True' >> ~/.zshrc
source ~/.zshrc
```

### 2. Configure Kubernetes Access

```bash
export KUBECONFIG=/path/to/llms.kubeconfig
(this file you can find in the setup for the workshop)
# Verify connection
kubectl get nodes
kubectl get pods
```

---

## Step 1: Deploy Kibana from PR

### 1.1 Opened a PR https://github.com/elastic/kibana/pull/251517 

1. Create PR on GitHub
2. Add label: `ci:project-deploy-observability`
3. Wait for Buildkite deployment

**Docs:** https://studious-disco-k66oojq.pages.github.io/user-guide/kibana-pr-quick-start/

### 1.4 Deployment Details

After deployment, you received creds here `https://github.com/elastic/observability-test-environments/issues/175110#issuecomment-3842623326`

---

## Step 2: Install OpenTelemetry Collector on GKE
I followed the instructions which are in the kibana Add Data page: 
Add Data - Kubernatis - Elastic Distribution for OTel Collector;
So next steps were given in Kibana: 

### 2.1 Add Helm Repository

```bash
helm repo add open-telemetry 'https://open-telemetry.github.io/opentelemetry-helm-charts' --force-update
```

### 2.2 Create Namespace

```bash
kubectl create namespace opentelemetry-operator-system
```

### 2.3 Create Secret with Elastic Credentials

Get the endpoint and API key from Kibana onboarding page (Observability → Add data → Monitor Kubernetes with EDOT Collector).

```bash
kubectl create secret generic elastic-secret-otel \
  --namespace opentelemetry-operator-system \
  --from-literal=elastic_endpoint='https://<endpoint>.elastic-cloud.com:443' \
  --from-literal=elastic_api_key='<api-key>'
```

### 2.4 Install OpenTelemetry Kube-Stack

```bash
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \
  --namespace opentelemetry-operator-system \
  --values 'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.3.0/deploy/helm/edot-collector/kube-stack/values.yaml' \
  --version '0.12.4'
```

### 2.5 Verify Installation

```bash
# Check pods are running
kubectl get pods -n opentelemetry-operator-system

# Expected output:
# - opentelemetry-kube-stack-daemon-collector (DaemonSet - one per node)
# - opentelemetry-kube-stack-cluster-stats-collector
# - opentelemetry-kube-stack-gateway-collector
# - opentelemetry-kube-stack-opentelemetry-operator
```

---

## Step 4: Verify Data in Kibana

### 4.1 Check Logs

1. Go to **Observability → Logs → Stream**
2. Filter: `kubernetes.namespace.name: "default"`

### 4.2 Check Infrastructure Metrics

1. Go to **Observability → Infrastructure → Inventory**
2. Select **Kubernetes Pods**

### 4.3 Useful Queries

```
# All logs from Online Boutique
kubernetes.namespace.name: "default"

# Logs from specific service
kubernetes.pod.name: frontend*

# Error logs
log.level: error OR message: *error*

# OTel collector logs
kubernetes.namespace.name: "opentelemetry-operator-system"
```

---

## Troubleshooting

### Check Collector Logs

```bash
kubectl logs -n opentelemetry-operator-system -l app.kubernetes.io/component=opentelemetry-collector --tail=50
```

### Restart Collectors After Config Change

```bash
kubectl rollout restart daemonset opentelemetry-kube-stack-daemon-collector -n opentelemetry-operator-system
kubectl rollout restart deployment opentelemetry-kube-stack-gateway-collector -n opentelemetry-operator-system
```

### Update Credentials

```bash
# Delete old secret
kubectl delete secret elastic-secret-otel -n opentelemetry-operator-system
(I had to do it because I creayted first otel from oblt deployment and not from the PR)
# Create new secret
kubectl create secret generic elastic-secret-otel \
  --namespace opentelemetry-operator-system \
  --from-literal=elastic_endpoint='<endpoint>' \
  --from-literal=elastic_api_key='<api-key>'

```

---

## Online Boutique Services Reference

| Service | Language | Port |
|---------|----------|------|
| frontend | Go | 8080 |
| cartservice | .NET | 7070 |
| checkoutservice | Go | 5050 |
| currencyservice | Node.js | 7000 |
| emailservice | Python | 8080 |
| paymentservice | Node.js | 50051 |
| productcatalogservice | Go | 3550 |
| recommendationservice | Python | 8080 |
| shippingservice | Go | 50051 |
| adservice | Java | 9555 |
| redis-cart | Redis | 6379 |

---

## Useful kubectl Commands

```bash
# See all pods
kubectl get pods

# View pod logs
kubectl logs <pod-name>

# See all services
kubectl get services

# Get frontend external URL
kubectl get svc frontend-external

# Describe a pod (for debugging)
kubectl describe pod <pod-name>

# Watch pods in real-time
kubectl get pods -w

# See pods across all namespaces
kubectl get pods -A
```

---

## Quick Reference: Kubernetes & Helm Terminology

### Kubernetes Core Concepts

| Term | Description |
|------|-------------|
| **Pod** | Smallest deployable unit; one or more containers running together |
| **Deployment** | Manages pod replicas and rolling updates |
| **Service** | Exposes pods to network traffic (ClusterIP, LoadBalancer, NodePort) |
| **Namespace** | Virtual cluster for isolating resources (e.g., `default`, `opentelemetry-operator-system`) |
| **DaemonSet** | Ensures a pod runs on every node (used by OTel collectors) |
| **ConfigMap** | Stores configuration data as key-value pairs |
| **Secret** | Stores sensitive data (passwords, API keys) |
| **Node** | A worker machine in the cluster |

### Helm Terminology

| Term | Description |
|------|-------------|
| **Chart** | A package containing templates + default values (like a recipe) |
| **Release** | An installed instance of a chart in the cluster |
| **Values** | Configuration inputs that customize the chart |
| **Repository** | Chart source (like a package registry, e.g., `open-telemetry`) |

### Common Helm Commands

```bash
# Add a chart repository
helm repo add <name> <url>

# Update repository cache
helm repo update

# Search for charts
helm search repo <keyword>

# Install a chart (creates a release)
helm install <release-name> <chart> --namespace <ns>

# Upgrade an existing release
helm upgrade <release-name> <chart> --namespace <ns>

# Install or upgrade (idempotent)
helm upgrade --install <release-name> <chart> --namespace <ns>

# List installed releases
helm list -A

# Uninstall a release
helm uninstall <release-name> --namespace <ns>

# Show chart values (see what can be configured)
helm show values <chart>
```

### How Helm Works with OTel Collector

```
helm repo add open-telemetry ...     → Adds chart source (local config)
                    ↓
helm upgrade --install ...           → Deploys to Kubernetes cluster
                    ↓
Creates in cluster:
  - DaemonSet (collectors on each node)
  - Deployment (gateway, operator)
  - Services (internal networking)
  - ConfigMaps (collector configuration)
  - ServiceAccount + RBAC (permissions)
```
