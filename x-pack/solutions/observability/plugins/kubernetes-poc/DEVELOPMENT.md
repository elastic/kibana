# Introduction 

You are an AI coding agent with expertise in monitoring Kubernetes clusters. The project you are working on is a POC for a curated Kubernetes UI for an Observability product. The goal of this project is to create the following flow (in development order):

1. **Kubernetes Cluster Listing Page** - A page displaying a list of all monitored Kubernetes clusters with key summary information. Features include:
   - Table or card-based view of clusters with essential metrics (node count, pod count, health status)
   - Filtering and search capabilities (by cluster name, cloud provider, region, etc.)
   - Sorting and pagination
   - Quick actions (view details, navigate to cluster overview)
   - This will establish foundational patterns for data fetching, filtering, and display before tackling more complex views

2. **Kubernetes Cluster Detail Flyout** - A detailed flyout/side panel that opens when selecting a cluster from the listing page. Features include:
   - Cluster metadata (name, cloud provider, region, version)
   - Key metrics summary (nodes, pods, namespaces, resource utilization)
   - Health status indicators
   - Quick navigation links (to overview page, nodes, pods, etc.)
   - Builds on patterns established in the listing page

3. **Kubernetes Overview** - A comprehensive dashboard page providing a high-level view of Kubernetes infrastructure health and resource utilization. The page prioritizes operational effectiveness with actionable insights. Key sections include:
  - **Cluster Health Status**: At-a-glance indicators for cluster availability, node readiness, control plane components (API server, etcd, scheduler, controller manager), and overall cluster state
  - **Resource Capacity & Utilization**: 
    - CPU and Memory usage across clusters/nodes with capacity thresholds and trending
    - Resource quota utilization by namespace (requests vs limits, over/under-provisioned workloads)
    - Storage usage (PV/PVC status, available capacity, storage class distribution)
    - Network metrics (ingress/egress traffic, service connectivity)
  - **Workload Health Summary**: 
    - Pod status breakdown (Running, Pending, Failed, CrashLoopBackOff, etc.) with trend indicators
    - Deployment/StatefulSet/DaemonSet readiness ratios (ready vs desired vs unavailable)
    - Recent pod restarts and failure rates
    - ReplicaSet status and scaling events
  - **Node Status**: Node readiness, conditions (MemoryPressure, DiskPressure, PIDPressure), taints, cordon status, and resource allocation per node
  - **Active Issues & Alerts**: 
    - Critical alerts prioritized by severity with actionable context
    - Recent events (last 1-24 hours) filtered by type (Warning, Error) and resource
    - Failed deployments, image pull errors, and scheduling failures
  - **Operational Context**:
    - Recent changes (deployments, scaling events, config updates) in timeline view
    - Namespace resource consumption ranking (top consumers of CPU/memory)
    - Container image inventory with security/vulnerability status
  - **Filtering & Navigation**: KQL search bar, cluster/node/namespace filters, time range selector, and tab navigation for different resource views (Overview, Nodes, Pods, Deployments, StatefulSets, DaemonSets, CronJobs, Jobs, Volumes, PV/PVC, Services, API Server)


## Current Status

**Last Updated:** 2025-12-11

### ✅ Completed
- [x] Plugin scaffolded with basic structure
- [x] Server-side route factory using `@kbn/server-route-repository`
- [x] Hello World API endpoint (`GET /internal/kubernetes_poc/hello_world`)
- [x] Client-side API client with type-safe route repository integration
- [x] React UI with Hello World page
- [x] Security configuration (authz) for routes
- [x] Plugin manifest configured with required dependencies
- [x] Removed unused `kibanaReact` bundle
- [x] Kubernetes Overview placeholder page with ObservabilityPageTemplate
- [x] Kubernetes Cluster Listing placeholder page with ObservabilityPageTemplate
- [x] Plugin context and `usePluginContext` hook for sharing ObservabilityPageTemplate
- [x] React Router routing for `/clusters` and `/overview` routes
- [x] Deep links for navigation system integration (overview, clusters)
- [x] Kubernetes entry added to Infrastructure section in Observability navigation tree
- [x] Plugin registered in i18nrc.json for translations

### 🚧 In Progress
- None currently

### 📋 Next Steps / TODO
- [ ] Implement Kubernetes Cluster Listing Page (data fetching and display)
- [ ] Add Kubernetes Cluster Detail Flyout (builds on listing page patterns)
- [ ] Implement Kubernetes Overview Page features (most complex, builds on established patterns) 

## Architecture

### Plugin Structure
```
x-pack/solutions/observability/plugins/kubernetes-poc/
├── common/              # Shared code (client & server)
├── public/              # Client-side code
│   ├── application/     # React components
│   │   ├── app.tsx      # Main app with React Router
│   │   └── pages/       # Page components
│   │       ├── cluster_listing/  # Cluster listing page
│   │       └── overview/         # Overview page
│   ├── context/         # React context providers
│   ├── hooks/           # Custom React hooks
│   └── services/        # API clients
└── server/              # Server-side code
    └── routes/          # API route handlers
```

### Key Patterns Used
- **Server Routes**: Using `@kbn/server-route-repository` for type-safe API routing
- **Route Factory**: `createKubernetesPocServerRoute` in `server/routes/create_kubernetes_poc_server_route.ts`
- **Route Repository**: Routes aggregated in `server/routes/index.ts`
- **API Client**: Type-safe client in `public/services/rest/create_call_api.ts`

### Dependencies
- **Required Plugins**: `data`, `observability`, `observabilityShared`
- **Required Bundles**: None (removed unused `kibanaReact`)

## Development Workflow

### Access Plugin
- **URL**: http://localhost:5601/app/kubernetesPoc
- **API Endpoint**: `GET /internal/kubernetes_poc/hello_world`

### Run Tests
```bash
# Unit tests
yarn test:jest x-pack/solutions/observability/plugins/kubernetes-poc --no-watchman
```

## API Endpoints

### Hello World
> **Note**: This is a temporary endpoint for initial plugin setup and should be removed once actual implementation for the project is added.

- **Endpoint**: `GET /internal/kubernetes_poc/hello_world`
- **Security**: Requires `kibana_read` privilege
- **Response**: 
  ```json
  {
    "message": "Hello World from kubernetes-poc plugin!",
    "timestamp": "2025-12-10T..."
  }
  ```

## Known Issues / Gotchas

1. **Security Configuration**: All routes must have `security.authz` configuration to avoid `Cannot read properties of undefined (reading 'authz')` errors
2. **Bundle Warnings**: Removed `kibanaReact` from `requiredBundles` since we're using `@kbn/react-kibana-context-render` directly
3. **Plugin Discovery**: Plugin must be bootstrapped (`yarn kbn bootstrap`) and Kibana restarted for changes to take effect

## Architecture Decisions

1. **Route Repository Pattern**: Chose `@kbn/server-route-repository` over traditional router for type safety and consistency with other Observability plugins
2. **No Navigation Registration**: Currently not registered with Observability navigation - can be added later if needed
3. **Minimal Dependencies**: Only required plugins are included to keep plugin lightweight

## Useful Commands

Verify **only the files you changed in this commit**:

1. **Branch validation:** Verify you're on the correct branch (`git branch --show-current`)
2. **Bootstrap check:** Run `yarn kbn bootstrap` if any dependencies changed
3. **Linting (scoped):** Run ESLint only on changed files - MUST pass with 0 errors

   ```bash
   # Lint changed files
   node scripts/eslint --fix $(git diff --name-only)
   ```

4. **Type checking (scoped):** Check types only for affected project(s) - MUST pass with 0 errors

   ```bash
   # Pass closest tsconfig.json file to your changed tests/helpers
   node scripts/type_check --project x-pack/solutions/observability/plugins/kubernetes-poc/tsconfig.json
   ```

5. **Unit tests (scoped):** Run tests only for affected code - MUST pass with 0 failures

   ```bash
   # Run tests for specific files/directories you changed
   yarn test:jest x-pack/solutions/observability/plugins/kubernetes-poc/path/to/changed/file.test.ts --no-watchman
   yarn test:jest x-pack/solutions/observability/plugins/kubernetes-poc --no-watchman

   # Run tests matching a pattern
   yarn test:jest --testPathPattern=kubernetes-poc --no-watchman
   ```

## References

### Data Format
- **OpenTelemetry (OTel) Data**: This plugin consumes Kubernetes metrics data in OpenTelemetry format
  - Data is collected via OpenTelemetry Collector receivers deployed on Kubernetes clusters
  - **Data Sources**:
    - `k8sclusterreceiver.otel` - Cluster-level metrics from kube-state-metrics
    - `kubeletstatsreceiver.otel` - Node and pod-level metrics from Kubelet stats API

- **k8sclusterreceiver**: [Documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sclusterreceiver/documentation.md)
  - Collects cluster-level metrics from the Kubernetes API server
  - Key metrics include:
    - Container resource limits/requests (`k8s.container.cpu_limit`, `k8s.container.cpu_request`, `k8s.container.memory_limit`, `k8s.container.memory_request`)
    - Container status (`k8s.container.ready`, `k8s.container.restarts`)
    - CronJob metrics (`k8s.cronjob.active_jobs`)
    - DaemonSet metrics (`k8s.daemonset.current_scheduled_nodes`, `k8s.daemonset.desired_scheduled_nodes`, `k8s.daemonset.misscheduled_nodes`, `k8s.daemonset.ready_nodes`)
    - Deployment metrics (`k8s.deployment.available`, `k8s.deployment.desired`)
    - HPA metrics (`k8s.hpa.current_replicas`, `k8s.hpa.desired_replicas`, `k8s.hpa.max_replicas`, `k8s.hpa.min_replicas`)
    - Job metrics (`k8s.job.active_pods`, `k8s.job.desired_successful_pods`, `k8s.job.failed_pods`, `k8s.job.max_parallel_pods`, `k8s.job.successful_pods`)
    - Namespace phase (`k8s.namespace.phase`)
    - Node conditions (`k8s.node.condition_*`)
    - Pod phase (`k8s.pod.phase`)
    - ReplicaSet metrics (`k8s.replicaset.available`, `k8s.replicaset.desired`)
    - ResourceQuota metrics (`k8s.resource_quota.hard_limit`, `k8s.resource_quota.used`)
    - StatefulSet metrics (`k8s.statefulset.current_pods`, `k8s.statefulset.desired_pods`, `k8s.statefulset.ready_pods`, `k8s.statefulset.updated_pods`)
  - Resource attributes: `k8s.cluster.name`, `k8s.namespace.name`, `k8s.node.name`, `k8s.pod.name`, `k8s.pod.uid`, `k8s.container.name`, `k8s.deployment.name`, `k8s.daemonset.name`, `k8s.statefulset.name`, `k8s.replicaset.name`, `k8s.job.name`, `k8s.cronjob.name`, `k8s.hpa.name`

- **kubeletstatsreceiver**: [Documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/documentation.md)
  - Collects node, pod, and container metrics from the Kubelet stats API
  - Key metrics include:
    - **Container metrics**: `container.cpu.time`, `container.cpu.usage`, `container.filesystem.available/capacity/usage`, `container.memory.available/rss/usage/working_set`, `container.memory.page_faults/major_page_faults`
    - **Node metrics**: `k8s.node.cpu.time`, `k8s.node.cpu.usage`, `k8s.node.filesystem.available/capacity/usage`, `k8s.node.memory.available/rss/usage/working_set`, `k8s.node.network.errors`, `k8s.node.network.io`
    - **Pod metrics**: `k8s.pod.cpu.time`, `k8s.pod.cpu.usage`, `k8s.pod.filesystem.available/capacity/usage`, `k8s.pod.memory.available/rss/usage/working_set`, `k8s.pod.network.errors`, `k8s.pod.network.io`
    - **Volume metrics**: `k8s.volume.available`, `k8s.volume.capacity`, `k8s.volume.inodes`, `k8s.volume.inodes.free`, `k8s.volume.inodes.used`
  - Optional utilization metrics: `k8s.container.cpu_limit_utilization`, `k8s.container.cpu_request_utilization`, `k8s.container.memory_limit_utilization`, `k8s.container.memory_request_utilization`, `k8s.pod.cpu_limit_utilization`, `k8s.pod.memory_limit_utilization`
  - Resource attributes: `k8s.cluster.name`, `k8s.namespace.name`, `k8s.node.name`, `k8s.pod.name`, `k8s.pod.uid`, `k8s.container.name`, `k8s.volume.name`, `k8s.volume.type`, `k8s.persistentvolumeclaim.name`

### Data Source & Setup
- **OpenTelemetry Collector on Kubernetes**: 
  - This plugin consumes data collected via OpenTelemetry Collector deployed on Kubernetes clusters
  - The collector should be configured with both `k8sclusterreceiver` and `kubeletstatsreceiver`
  - Data is exported to Elasticsearch in OTel format
  - **kube-state-metrics (KSM)**: Required for `k8sclusterreceiver` to collect cluster-level metrics

### Related Documentation
- **OpenTelemetry Collector Contrib**: [GitHub Repository](https://github.com/open-telemetry/opentelemetry-collector-contrib) - Contains the Kubernetes receivers
- **k8sclusterreceiver**: Collects cluster-level metrics (deployments, pods, nodes, etc.) from the Kubernetes API
- **kubeletstatsreceiver**: Collects resource utilization metrics (CPU, memory, filesystem, network) from the Kubelet stats API
- **kube-state-metrics**: Required component for `k8sclusterreceiver` to collect cluster-level metrics

## Notes

- Plugin follows the Observability plugin tier system (Tier 1: End User Plugin)
- Uses the same patterns as `observability_onboarding` plugin for consistency
- Route handler resources are defined in `server/routes/types.ts`
- Client-side API calls use the type-safe repository client pattern
- Data is sourced from Elasticsearch indices populated by OpenTelemetry Collector's Kubernetes receivers
- All data follows OpenTelemetry format - use OTel metric and attribute names when querying Elasticsearch

