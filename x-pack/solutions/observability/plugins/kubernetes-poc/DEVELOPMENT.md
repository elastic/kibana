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

**Last Updated:** 2025-12-10

### ✅ Completed
- [x] Plugin scaffolded with basic structure
- [x] Server-side route factory using `@kbn/server-route-repository`
- [x] Hello World API endpoint (`GET /internal/kubernetes_poc/hello_world`)
- [x] Client-side API client with type-safe route repository integration
- [x] React UI with Hello World page
- [x] Security configuration (authz) for routes
- [x] Plugin manifest configured with required dependencies
- [x] Removed unused `kibanaReact` bundle

### 🚧 In Progress
- None currently

### 📋 Next Steps / TODO
- [ ] Add Kubernetes Cluster Listing Page (establishes patterns for data fetching and display)
- [ ] Add Kubernetes Cluster Detail Flyout (builds on listing page patterns)
- [ ] Add Kubernetes Overview Page (most complex, builds on established patterns) 

## Architecture

### Plugin Structure
```
x-pack/solutions/observability/plugins/kubernetes-poc/
├── common/              # Shared code (client & server)
├── public/              # Client-side code
│   ├── application/     # React components
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
- **Elastic Common Schema (ECS)**: [ECS Field Reference](https://www.elastic.co/guide/server/current/exported-fields-ecs.html)
  - All data consumed by this plugin follows the ECS (Elastic Common Schema) format
  - ECS provides a common set of fields for storing event data in Elasticsearch
  - **Cluster Information Location**: Kubernetes cluster information is located in the `orchestrator.*` namespace
  - Key ECS fields relevant to Kubernetes data:
    - `@timestamp`: Date/time when the event originated (required for all events)
    - `orchestrator.*`: **Kubernetes cluster information** (clusters, nodes, namespaces, pods, deployments, etc.)
    - `cloud.*`: **Cloud provider annotations** (provider, region, availability zone, account ID, instance ID, etc.) - data is annotated with cloud metadata
    - `kubernetes.*`: Kubernetes-specific fields (pods, nodes, namespaces, etc.)
    - `host.*`: Host system information
    - `agent.*`: Agent information (Elastic Agent details)
    - `labels`: Custom key/value pairs (e.g., Kubernetes labels)
    - `tags`: List of keywords used to tag events
    - `message`: Log message content
  - When querying Elasticsearch, use ECS field names for consistency and compatibility
  - **Important**: 
    - Query `orchestrator.*` fields for cluster-level information (clusters, nodes, namespaces, workloads)
    - Use `cloud.*` fields for cloud provider metadata (useful for filtering and grouping by cloud provider, region, etc.)
- **Kubernetes Metricbeat Exported Fields**: [Kubernetes Metricbeat Field Reference](https://www.elastic.co/docs/reference/beats/metricbeat/exported-fields-kubernetes)
  - Reference for the specific field structure of Kubernetes metrics data collected by Metricbeat/Elastic Agent
  - Includes detailed field definitions for:
    - Node metrics (CPU, memory, pod capacity, status conditions)
    - Pod metrics (status, phase, ready state, resource usage)
    - Container metrics (CPU, memory, filesystem usage)
    - Deployment, StatefulSet, DaemonSet, ReplicaSet metrics
    - Service, Job, CronJob metrics
    - PersistentVolume and PersistentVolumeClaim metrics
    - ResourceQuota metrics
    - Volume filesystem metrics
  - Use this reference when querying `metrics-kubernetes.*` data streams

### Data Source & Setup
- **Elastic Kubernetes Monitoring Quickstart**: [Monitor your Kubernetes cluster with Elastic Agent](https://www.elastic.co/docs/solutions/observability/get-started/quickstart-monitor-kubernetes-cluster-with-elastic-agent)
  - This plugin consumes data collected via Elastic Agent deployed on Kubernetes clusters
  - The setup includes kube-state-metrics (KSM) for cluster-level metrics collection
  - Data streams: `logs-kubernetes.*` and `metrics-kubernetes.*`
  - All data is stored in ECS format

### Related Documentation
- **Kubernetes Integration**: Elastic's Kubernetes integration collects logs, metrics, and events from Kubernetes clusters
- **Kubernetes Metricbeat Fields**: [Exported Fields Reference](https://www.elastic.co/docs/reference/beats/metricbeat/exported-fields-kubernetes) - Detailed field structure for Kubernetes metrics
- **kube-state-metrics**: Required component for collecting cluster-level metrics (pods, nodes, deployments, etc.)
- **Elastic Agent on Kubernetes**: Installation and configuration via Helm charts

## Notes

- Plugin follows the Observability plugin tier system (Tier 1: End User Plugin)
- Uses the same patterns as `observability_onboarding` plugin for consistency
- Route handler resources are defined in `server/routes/types.ts`
- Client-side API calls use the type-safe repository client pattern
- Data is sourced from Elasticsearch indices populated by Elastic Agent's Kubernetes integration
- All data follows ECS (Elastic Common Schema) format - use ECS field names when querying Elasticsearch

