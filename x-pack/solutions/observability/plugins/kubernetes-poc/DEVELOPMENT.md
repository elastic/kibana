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

**Last Updated:** 2025-12-15

### ✅ Completed
- [x] Plugin scaffolded with basic structure
- [x] Server-side route factory using `@kbn/server-route-repository`
- [x] Client-side API client with type-safe route repository integration
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
- [x] Cluster Listing API endpoint (`GET /internal/kubernetes_poc/cluster_listing`)
- [x] Cluster Listing table with EuiDataGrid and custom cell renderers
- [x] Custom cell renderers for health status, cloud provider, pod statuses, and utilization metrics
- [x] Cluster overview cards with Lens visualizations (Total Clusters, Healthy/Unhealthy Clusters, CPU Usage by Cluster)
- [x] Add Kubernetes Cluster Detail Flyout (builds on listing page patterns)
- [x] Add Workload Resources Table to Cluster Detail Flyout (requires backend API endpoint for per-node data with status, kubelet version, and resource utilization)
- [x] Convert single metric cards to Lens-powered metric visualizations (MemoryTotalCard, DiskSizeCard, NamespacesCard, and all kubernetes overview metric cards)


### 📋 Next Steps / TODO
- [ ] Implement Kubernetes Overview Page features (most complex, builds on established patterns)

## Architecture

### Plugin Structure
```
x-pack/solutions/observability/plugins/kubernetes-poc/
├── common/              # Shared code (client & server)
├── public/              # Client-side code
│   ├── application/     # React components
│   │   ├── app.tsx      # Main app with React Router
│   │   ├── components/  # Reusable components
│   │   │   ├── cluster_overview_cards/  # Lens-based metric cards
│   │   │   ├── cluster_table/           # Cluster listing table
│   │   │   └── kubernetes_page_template/ # Page template wrapper
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
- **Lens Embeddable**: Using `LensEmbeddableComponent` for ES|QL-powered visualizations

### Lens Embeddable Pattern

The plugin uses Lens embeddables for rendering ES|QL-powered visualizations. Key configuration:

```typescript
// Access Lens via plugin context
const { plugins } = usePluginContext();
const LensComponent = plugins.lens.EmbeddableComponent;

// Define attributes with ES|QL query
const attributes: TypedLensByValueInput['attributes'] = {
  title: 'My Chart',
  visualizationType: 'lnsMetric', // or 'lnsXY'
  type: 'lens',
  references: [],
  state: {
    visualization: { /* visualization-specific config */ },
    query: { esql: 'FROM index | STATS count = COUNT(*)' },
    filters: [],
    datasourceStates: {
      textBased: {
        layers: {
          layer_0: {
            columns: [
              {
                columnId: 'metric_0',
                fieldName: 'count',
                label: 'Total Count',      // Custom display label
                customLabel: true,          // Enable custom label
                meta: { type: 'number' },
                params: { format: { id: 'percent' } }, // Optional formatter
              },
            ],
          },
        },
      },
    },
  },
};

// Render with minimal chrome
<LensComponent
  id="uniqueId"
  attributes={attributes}
  timeRange={timeRange}
  viewMode="view"
  noPadding
  withDefaultActions={false}
  disableTriggers
  showInspector={false}
/>
```

**Key Column Properties**:
- `fieldName`: The ES|QL result column name
- `label`: Custom display label (requires `customLabel: true`)
- `params.format.id`: Value formatter (`'percent'`, `'number'`, `'bytes'`, etc.)

**Metric Visualization Config**:
- `metricAccessor`: Column ID for the primary metric value
- `maxAccessor` (optional): Column ID for the maximum value (used for progress bars)
- `showBar` (optional): Display a progress bar (default: false)
- `progressDirection` (optional): `'vertical'` or `'horizontal'` for progress bars
- `color` (optional): Hex color for the metric value (e.g., `'#00BFB3'` for green)
- `subtitle` (optional): Secondary text displayed below the metric title (e.g., "Total", "Healthy")

### Dependencies
- **Required Plugins**: `data`, `dataViews`, `lens`, `observability`, `observabilityShared`, `unifiedSearch`
- **Required Bundles**: None (removed unused `kibanaReact`)

## Development Workflow

### Exploring Metrics with Local Kibana MCP Server

The Local Kibana MCP (Model Context Protocol) server provides tools for exploring available metrics and testing ES|QL queries directly from an AI assistant like Cursor.

#### Available MCP Tools

| Tool | Description |
|------|-------------|
| `platform_core_execute_esql` | Execute ES|QL queries and get results |
| `platform_core_list_indices` | List available indices, aliases, and datastreams |
| `platform_core_get_index_mapping` | Get field mappings for an index |
| `platform_core_index_explorer` | Find relevant indices by natural language query |
| `platform_core_generate_esql` | Generate ES|QL from natural language |

#### Example: Discovering Available Fields

To explore what fields are available in the metrics data, run a simple query and examine the columns:

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.node.name IS NOT NULL
| LIMIT 1
```

This returns all available columns/fields for documents matching the filter.

#### Example: Finding Specific Metric Fields

To check if a specific metric exists (e.g., allocatable CPU):

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.node.name IS NOT NULL AND k8s.node.allocatable_cpu IS NOT NULL
| STATS avg_value = AVG(k8s.node.allocatable_cpu) BY k8s.cluster.name
| LIMIT 10
```

If the field doesn't exist, you'll get an "Unknown column" error.

#### Example: Exploring Metric Values

To understand what values a metric contains:

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.pod.phase IS NOT NULL
| STATS count = COUNT(*) BY k8s.pod.phase
```

#### Tips for Metric Exploration

1. **Remote cluster prefix**: Kubernetes metrics are on a remote cluster, so use `remote_cluster:metrics-*` as the source
2. **Filter by resource type**: Use `WHERE k8s.node.name IS NOT NULL` or similar to filter to specific resource types
3. **Check data sources**: Different metrics come from different receivers:
   - `k8sclusterreceiver.otel` - Cluster-level metrics (allocatable resources, conditions, workload counts)
   - `kubeletstatsreceiver.otel` - Runtime metrics (CPU/memory usage, filesystem, network)
4. **Use STATS to aggregate**: When exploring, aggregate by cluster/node/pod to see representative values
5. **Counter vs Gauge metrics**: Some metrics like `k8s.node.cpu.time` are counters and can't be averaged directly

## API Endpoints

### Cluster Listing

- **Endpoint**: `GET /internal/kubernetes_poc/cluster_listing`
- **Security**: Requires `kibana_read` privilege
- **Description**: Returns a list of all monitored Kubernetes clusters with health status, node counts, pod statuses, and resource utilization.
- **Response**:
  ```json
  {
    "clusters": [
      {
        "clusterName": "production-cluster",
        "healthStatus": "healthy",
        "cloudProvider": "gcp",
        "totalNodes": 12,
        "failedPods": 2,
        "runningPods": 150,
        "cpuUtilization": 45.23,
        "memoryUtilization": 62.18
      }
    ]
  }
  ```

## ES|QL Query Catalog

This section catalogs the ES|QL queries used for each visual element in the UI. Queries are developed and validated here before implementation.

> **Note**: Queries use `?_tstart` and `?_tend` as named parameters for time range filtering, which should be passed from the UI's time picker.

### Performance Optimization: WHERE Clause Rules

To ensure good query performance, all ES|QL queries follow these WHERE clause rules:

1. **BY clause fields MUST exist**: Any field used in a `BY` clause must have `IS NOT NULL` in the WHERE clause, as these fields must exist in every document being aggregated.

2. **Metrics/STATS fields are optional**: Fields used in STATS aggregations (e.g., `SUM`, `AVG`, `COUNT_DISTINCT`) should be combined with `OR` conditions since not all metrics exist in every document.

**Pattern**:
```esql
FROM remote_cluster:metrics-*
| WHERE <by_field_1> IS NOT NULL
  AND <by_field_2> IS NOT NULL
  AND (
    <metric_field_1> IS NOT NULL
    OR <metric_field_2> IS NOT NULL
    OR <metric_field_3> IS NOT NULL
  )
| STATS ... BY <by_field_1>, <by_field_2>
```

This pattern filters out irrelevant documents early, significantly improving query performance on large datasets.

### Cluster Listing Page - Overview Cards

#### Total Clusters (Metric Card)
Total number of monitored clusters displayed as a Lens metric visualization.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND (
    k8s.node.name IS NOT NULL
    OR k8s.pod.uid IS NOT NULL
  )
| STATS cluster_count = COUNT_DISTINCT(k8s.cluster.name)
```

**Visualization**: `lnsMetric` with vertical progress bar
**Metrics Used**: None (count of distinct attribute values)
**Dimensions**: `k8s.cluster.name`
**Performance Note**: The `OR` condition filters to documents that have either node or pod data, avoiding scanning irrelevant metrics documents.

---

#### Healthy/Unhealthy Clusters (Metric Cards)
Counts clusters by health status displayed as Lens metric visualizations with progress bars. A cluster is considered "unhealthy" if any node has `condition_ready` <= 0.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND k8s.node.condition_ready IS NOT NULL
| STATS
    total_nodes = COUNT_DISTINCT(k8s.node.name),
    ready_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready > 0
  BY k8s.cluster.name
| EVAL health_status = CASE(ready_nodes < total_nodes, "unhealthy", "healthy")
| STATS
    healthy_count = COUNT(*) WHERE health_status == "healthy",
    total_count = COUNT(*)
```

**Visualization**: `lnsMetric` with vertical progress bar (max = total_count)
**Metrics Used**: `k8s.node.condition_ready` (from k8sclusterreceiver)
**Dimensions**: `k8s.cluster.name`, `k8s.node.name`
**Performance Note**: Both `k8s.cluster.name` and `k8s.node.name` are required in WHERE since they're used in BY clause. The `k8s.node.condition_ready` filter ensures we only scan node condition documents.

---

#### CPU Usage by Cluster (Line Chart with Change Point Annotations)
Shows CPU utilization percentage over time for each cluster as a multi-series line chart with change point annotations.

**Main Query** (for time series data):
```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.cpu.usage IS NOT NULL OR k8s.node.allocatable_cpu IS NOT NULL)
| STATS
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu)
  BY timestamp = TBUCKET(1 minute), k8s.cluster.name
| EVAL value = sum_cpu_usage / sum_allocatable_cpu
| KEEP timestamp, k8s.cluster.name, value
```

**Change Point Detection Query** (for annotations):
```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.cpu.usage IS NOT NULL OR k8s.node.allocatable_cpu IS NOT NULL)
| STATS
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu)
  BY timestamp = TBUCKET(1 minute)
| EVAL value = sum_cpu_usage / sum_allocatable_cpu
| CHANGE_POINT value ON timestamp AS type, pvalue
| WHERE type IS NOT NULL
| KEEP timestamp, type, pvalue
```

**Visualization**: Custom `@elastic/charts` line chart with `LineAnnotation` for change points
**Metrics Used**: `k8s.node.cpu.usage` (from kubeletstatsreceiver), `k8s.node.allocatable_cpu` (from k8sclusterreceiver)
**Dimensions**: `k8s.cluster.name`, `k8s.node.name`, `timestamp` (bucketed by 1 minute via TBUCKET)
**Output**: `value` - CPU usage as ratio of allocatable
**Change Point Output**: `type` (spike, dip, step_change, trend_change, distribution_change), `pvalue` (statistical significance)

---

### Cluster Listing Page - Table

#### Cluster Count
Total number of monitored clusters.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND (
    k8s.node.name IS NOT NULL
    OR k8s.pod.uid IS NOT NULL
  )
| STATS cluster_count = COUNT_DISTINCT(k8s.cluster.name)
```

**Metrics Used**: None (count of distinct attribute values)
**Dimensions**: `k8s.cluster.name`
**Performance Note**: The `OR` condition filters to documents that have either node or pod data.

---

#### Cluster Listing Table
Main data for the cluster listing table view with CPU/memory utilization percentages.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND cloud.provider IS NOT NULL
  AND (
    k8s.node.name IS NOT NULL
    OR k8s.pod.uid IS NOT NULL
    OR k8s.pod.phase IS NOT NULL
    OR k8s.node.cpu.usage IS NOT NULL
    OR k8s.node.memory.usage IS NOT NULL
    OR k8s.node.allocatable_cpu IS NOT NULL
    OR k8s.node.allocatable_memory IS NOT NULL
    OR k8s.node.condition_ready IS NOT NULL
  )
| STATS
    total_nodes = COUNT_DISTINCT(k8s.node.name),
    ready_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready > 0,
    total_pods = COUNT_DISTINCT(k8s.pod.uid),
    running_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 1,
    failed_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 3,
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_memory_usage = SUM(k8s.node.memory.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu),
    sum_allocatable_memory = SUM(k8s.node.allocatable_memory)
  BY k8s.cluster.name, cloud.provider
| EVAL health_status = CASE(ready_nodes < total_nodes, "unhealthy", "healthy")
| EVAL cpu_utilization = ROUND(sum_cpu_usage / sum_allocatable_cpu * 100, 2)
| EVAL memory_utilization = ROUND(sum_memory_usage / TO_DOUBLE(sum_allocatable_memory) * 100, 2)
| KEEP k8s.cluster.name, health_status, cloud.provider, total_nodes,
       failed_pods, running_pods,
       cpu_utilization, memory_utilization
```

**Metrics Used**:
- `k8s.node.condition_ready` (from k8sclusterreceiver)
- `k8s.pod.phase` (from k8sclusterreceiver) - values: 1=Running, 2=Pending, 3=Failed
- `k8s.node.cpu.usage`, `k8s.node.memory.usage` (from kubeletstatsreceiver)
- `k8s.node.allocatable_cpu`, `k8s.node.allocatable_memory` (from k8sclusterreceiver)

**Dimensions**: `k8s.cluster.name`, `cloud.provider`, `k8s.node.name`, `k8s.pod.uid`

**Output Columns**:
| Column | Description |
|--------|-------------|
| `k8s.cluster.name` | Cluster name |
| `health_status` | "healthy" or "unhealthy" based on node readiness |
| `cloud.provider` | Cloud provider (gcp, aws, azure, etc.) |
| `total_nodes` | Total node count |
| `failed_pods` | Count of pods in Failed phase |
| `running_pods` | Count of pods in Running phase |
| `cpu_utilization` | CPU usage as % of allocatable (e.g., 25.56) |
| `memory_utilization` | Memory usage as % of allocatable (e.g., 29.08) |

**Known Gaps**:
- Kubernetes version (`k8s.cluster.version`) not available in OTel data
- Pod usage percentage not calculated (`k8s.node.allocatable_pods` not available)

---

### Cluster Detail Flyout

> **Note**: Queries in this section filter by a specific cluster using `k8s.cluster.name == "<cluster_name>"`. In implementation, this will be parameterized.

#### Disk Size Total (Metric Card)
Total disk capacity across all nodes in the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "<cluster_name>"
  AND k8s.node.name IS NOT NULL
  AND k8s.node.filesystem.capacity IS NOT NULL
| STATS
    disk_capacity = MAX(k8s.node.filesystem.capacity)
  BY k8s.node.name
| STATS total_disk_bytes = SUM(disk_capacity)
```

**Visualization**: `lnsMetric` (use bytes formatter)
**Metrics Used**: `k8s.node.filesystem.capacity` (from kubeletstatsreceiver)
**Dimensions**: `k8s.node.name`
**Output**: `total_disk_bytes` - Total disk capacity in bytes (Lens formats to human-readable)

---

#### Memory Total (Metric Card)
Total allocatable memory across all nodes in the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "<cluster_name>"
  AND k8s.node.name IS NOT NULL
  AND k8s.node.allocatable_memory IS NOT NULL
| STATS
    node_memory = MAX(k8s.node.allocatable_memory)
  BY k8s.node.name
| STATS total_memory_bytes = SUM(node_memory)
```

**Visualization**: `lnsMetric` (use bytes formatter)
**Metrics Used**: `k8s.node.allocatable_memory` (from k8sclusterreceiver)
**Dimensions**: `k8s.node.name`
**Output**: `total_memory_bytes` - Total allocatable memory in bytes (Lens formats to human-readable)

---

#### Namespaces Total (Metric Card)
Total number of namespaces in the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "<cluster_name>"
  AND k8s.namespace.name IS NOT NULL
| STATS namespace_count = COUNT_DISTINCT(k8s.namespace.name)
```

**Visualization**: `lnsMetric`
**Metrics Used**: None (count of distinct attribute values)
**Dimensions**: `k8s.namespace.name`
**Output**: `namespace_count` - Total number of namespaces

---

#### Pods Total, Healthy, Unhealthy (Metric Card)
Pod counts by health status for the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "<cluster_name>"
  AND k8s.pod.uid IS NOT NULL
  AND k8s.pod.phase IS NOT NULL
| STATS
    total_pods = COUNT_DISTINCT(k8s.pod.uid),
    healthy_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 2,
    unhealthy_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 4
```

**Visualization**: `lnsMetric`
**Metrics Used**: `k8s.pod.phase` (from k8sclusterreceiver)
**Dimensions**: `k8s.pod.uid`
**Output**:
- `total_pods` - Total pod count
- `healthy_pods` - Running pods (phase = 2)
- `unhealthy_pods` - Failed pods (phase = 4)

**Pod Phase Values**:
| Value | Phase |
|-------|-------|
| 1 | Pending |
| 2 | Running (healthy) |
| 3 | Succeeded |
| 4 | Failed (unhealthy) |

---

#### Memory Util Time Series (Line Chart)
Memory usage over time for the cluster.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "<cluster_name>"
  AND k8s.node.name IS NOT NULL
  AND k8s.node.memory.usage IS NOT NULL
| STATS memory_usage_bytes = SUM(k8s.node.memory.usage)
  BY timestamp = TBUCKET(1 minute)
```

**Visualization**: `lnsXY` line chart (use bytes formatter on Y-axis)
**Metrics Used**: `k8s.node.memory.usage` (from kubeletstatsreceiver)
**Dimensions**: `timestamp` (bucketed by 1 minute via TBUCKET)
**Output**: `memory_usage_bytes` - Memory usage in bytes over time (Lens formats to human-readable)

---

#### Pods Util Time Series (Line Chart)
Pod utilization percentage over time for the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "<cluster_name>"
  AND k8s.pod.uid IS NOT NULL
  AND k8s.pod.phase IS NOT NULL
| STATS
    pod_count = COUNT_DISTINCT(k8s.pod.uid),
    node_count = COUNT_DISTINCT(k8s.node.name)
  BY timestamp = BUCKET(@timestamp, 1 minute)
| EVAL max_pods = node_count * 110
| EVAL pod_utilization = TO_DOUBLE(pod_count) / TO_DOUBLE(max_pods)
| KEEP timestamp, pod_utilization
```

**Visualization**: `lnsXY` line chart (use percent formatter on Y-axis)
**Metrics Used**: `k8s.pod.phase` (from k8sclusterreceiver)
**Dimensions**: `k8s.pod.uid`, `k8s.node.name`, `timestamp` (bucketed by 1 minute)
**Output**: `pod_utilization` - Pod utilization as ratio of capacity (Lens formats to percent)

**Note**: Uses `FROM` instead of `TS` because `COUNT_DISTINCT` on keyword fields is not supported in time series mode. Uses fallback of 110 pods/node (Kubernetes default) since `k8s.node.allocatable_pods` is not available in OTel data.

---

#### CPU Util Time Series (Line Chart)
CPU utilization percentage over time for the cluster.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "<cluster_name>"
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.cpu.usage IS NOT NULL OR k8s.node.allocatable_cpu IS NOT NULL)
| STATS
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu)
  BY timestamp = TBUCKET(1 minute)
| EVAL cpu_utilization = sum_cpu_usage / sum_allocatable_cpu
| KEEP timestamp, cpu_utilization
```

**Visualization**: `lnsXY` line chart (use percent formatter on Y-axis)
**Metrics Used**: `k8s.node.cpu.usage` (from kubeletstatsreceiver), `k8s.node.allocatable_cpu` (from k8sclusterreceiver)
**Dimensions**: `k8s.node.name`, `timestamp` (bucketed by 1 minute via TBUCKET)
**Output**: `cpu_utilization` - CPU usage as ratio of allocatable (Lens formats to percent)

---

#### Network Traffic Time Series (Line Chart)
Network inbound/outbound traffic rate over time for the cluster.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "<cluster_name>"
  AND k8s.node.name IS NOT NULL
  AND k8s.node.network.io IS NOT NULL
| STATS
    inbound = SUM(RATE(k8s.node.network.io)) WHERE direction == "receive",
    outbound = SUM(RATE(k8s.node.network.io)) WHERE direction == "transmit"
  BY timestamp = TBUCKET(1 minute)
```

**Visualization**: `lnsXY` line chart with two series (use bytes formatter on Y-axis)
**Metrics Used**: `k8s.node.network.io` (counter_long from kubeletstatsreceiver)
**Dimensions**: `direction`, `timestamp` (bucketed by 1 minute via TBUCKET)
**Output**: `inbound`, `outbound` - Network I/O rate in bytes/second (Lens formats to human-readable)

**Note**: Uses `TS` command with `RATE()` function to calculate the rate of change for counter metrics.

---

#### Nodes Total, Healthy, Unhealthy (Metric Card)
Node counts by health status for the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "<cluster_name>"
  AND k8s.node.name IS NOT NULL
  AND k8s.node.condition_ready IS NOT NULL
| STATS
    total_nodes = COUNT_DISTINCT(k8s.node.name),
    healthy_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready > 0,
    unhealthy_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready <= 0
```

**Visualization**: `lnsMetric`
**Metrics Used**: `k8s.node.condition_ready` (from k8sclusterreceiver)
**Dimensions**: `k8s.node.name`
**Output**:
- `total_nodes` - Total node count
- `healthy_nodes` - Nodes with condition_ready > 0
- `unhealthy_nodes` - Nodes with condition_ready <= 0

---

#### Workload Resources Table
Table showing per-workload resource usage, aggregated by workload name, type, and namespace.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "<cluster_name>"
  AND k8s.namespace.name IS NOT NULL
  AND (
    k8s.deployment.name IS NOT NULL
    OR k8s.statefulset.name IS NOT NULL
    OR k8s.daemonset.name IS NOT NULL
    OR k8s.job.name IS NOT NULL
    OR k8s.cronjob.name IS NOT NULL
  )
  AND (
    k8s.pod.cpu.usage IS NOT NULL
    OR k8s.pod.memory.usage IS NOT NULL
  )
| STATS
    sum_cpu_usage = SUM(k8s.pod.cpu.usage),
    sum_memory_usage = SUM(k8s.pod.memory.usage),
    pod_count = COUNT_DISTINCT(k8s.pod.uid)
  BY k8s.deployment.name, k8s.statefulset.name, k8s.daemonset.name, k8s.job.name, k8s.cronjob.name, k8s.namespace.name
| EVAL workload_name = COALESCE(k8s.deployment.name, k8s.statefulset.name, k8s.daemonset.name, k8s.job.name, k8s.cronjob.name)
| EVAL workload_type = CASE(
    k8s.deployment.name IS NOT NULL, "Deployment",
    k8s.statefulset.name IS NOT NULL, "StatefulSet",
    k8s.daemonset.name IS NOT NULL, "DaemonSet",
    k8s.job.name IS NOT NULL, "Job",
    k8s.cronjob.name IS NOT NULL, "CronJob",
    "Unknown"
  )
| EVAL avg_cpu_usage = sum_cpu_usage / TO_DOUBLE(pod_count)
| EVAL avg_memory_usage = sum_memory_usage / TO_DOUBLE(pod_count)
| KEEP workload_name, workload_type, k8s.namespace.name, avg_cpu_usage, avg_memory_usage
| WHERE workload_name IS NOT NULL
| SORT workload_name ASC, k8s.namespace.name ASC
```

**Visualization**: Table (EuiDataGrid)
**Metrics Used**:
- `k8s.pod.cpu.usage`, `k8s.pod.memory.usage` (from kubeletstatsreceiver)
- `k8s.deployment.name`, `k8s.statefulset.name`, `k8s.daemonset.name`, `k8s.job.name`, `k8s.cronjob.name` (from k8sclusterreceiver)
- `k8s.namespace.name` (from k8sclusterreceiver)
- `k8s.pod.uid` (from k8sclusterreceiver)

**Output Columns**:
| Column | Description |
|--------|-------------|
| `workload_name` | Workload name (deployment, statefulset, daemonset, job, or cronjob) |
| `workload_type` | Type of workload (Deployment, StatefulSet, DaemonSet, Job, CronJob) |
| `k8s.namespace.name` | Kubernetes namespace |
| `avg_cpu_usage` | Average CPU usage per pod in cores |
| `avg_memory_usage` | Average memory usage per pod in bytes |

**Notes**: 
- Aggregates by workload instead of by node. Uses COALESCE to determine the workload name from the available workload type fields.
- The query includes `SORT` to ensure consistent ordering for client-side pagination.
- Client-side pagination is used (all results are fetched and paginated in the browser). For clusters with many workloads, consider adding server-side pagination in the future.

---

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
  
5. **Pre-commit:** Auto fix formating a ESlint errors

   ```bash
   node scripts/precommit_hook --fix
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

## Change Point Detection with CHANGE_POINT

The plugin uses the ES|QL `CHANGE_POINT` command to detect anomalies in time series data and display them as annotations on line charts.

### CHANGE_POINT Syntax

```esql
CHANGE_POINT value [ON key] [AS type_name, pvalue_name]
```

**Parameters**:
- `value`: The column with the metric to analyze for change points (must be numeric)
- `key`: The column to order values by (defaults to `@timestamp` if not specified)
- `type_name`: Output column name for change point type (defaults to `type`)
- `pvalue_name`: Output column name for p-value (defaults to `pvalue`)

### Change Point Types

| Type | Description |
|------|-------------|
| `spike` | Sudden increase in value |
| `dip` | Sudden decrease in value |
| `step_change` | Sustained shift to a new level |
| `trend_change` | Change in the direction or rate of change |
| `distribution_change` | Change in the statistical distribution |
| `stationary` | No significant change detected |
| `non_stationary` | Data is naturally varying (no anomaly) |

### Example Query

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "my-cluster"
  AND k8s.node.name IS NOT NULL
  AND k8s.node.cpu.usage IS NOT NULL
| STATS value = SUM(k8s.node.cpu.usage) BY timestamp = TBUCKET(1 minute)
| CHANGE_POINT value ON timestamp AS type, pvalue
| WHERE type IS NOT NULL
| KEEP timestamp, value, type, pvalue
```

### Implementation Pattern

The plugin uses a two-query approach:
1. **Main Query**: Fetches time series data for visualization
2. **Change Point Query**: Detects anomalies using `CHANGE_POINT` and filters for significant changes

Change points are rendered as vertical dashed lines with markers using `@elastic/charts` `LineAnnotation` component.

### Impact Classification

Change points are classified by impact based on p-value:
- **High** (p-value < 0.01): Highly significant change (red marker)
- **Medium** (p-value < 0.05): Moderately significant change (yellow marker)
- **Low** (p-value >= 0.05): Less significant change (gray marker)

---

## Finding ES|QL Documentation via Semantic Code Search

The Kibana codebase contains built-in ES|QL documentation that can be queried using the Semantic Code Search MCP tools. This is useful for discovering available functions, commands, and their syntax.

### Quick Lookup Examples

| Question | Semantic Search Query |
|----------|----------------------|
| What functions does TS command support? | `"Which functions does the TS time series command support?"` with `filePath: *kbn-language-documentation*` |
| How does a specific function work? | `"How does RATE function work in ESQL?"` with `filePath: *generated*` |
| What commands are available? | `"What source and processing commands are available?"` with `filePath: *kbn-language-documentation*` |

### Documentation Locations

| Path | Content |
|------|---------|
| `src/platform/packages/private/kbn-language-documentation/src/sections/generated/` | Auto-generated docs for functions, commands, operators |
| `timeseries_aggregation_functions.tsx` | TS command functions (RATE, AVG_OVER_TIME, DELTA, etc.) |
| `scalar_functions.tsx` | Scalar functions (ABS, CASE, ROUND, etc.) |
| `source_commands.tsx` | Source commands (FROM, TS, ROW, SHOW) |
| `processing_commands.tsx` | Processing commands (WHERE, EVAL, STATS, etc.) |

### Example: Finding TS Functions

```
semantic_code_search:
  query: "Which functions does the TS time series command support?"
  kql: "filePath: *kbn-language-documentation* and content: TS"
```

Returns documentation showing 20 time series functions: `RATE`, `AVG_OVER_TIME`, `SUM_OVER_TIME`, `DELTA`, `INCREASE`, `IRATE`, etc.

## Notes

- Plugin follows the Observability plugin tier system (Tier 1: End User Plugin)
- Uses the same patterns as `observability_onboarding` plugin for consistency
- Route handler resources are defined in `server/routes/types.ts`
- Client-side API calls use the type-safe repository client pattern
- Data is sourced from Elasticsearch indices populated by OpenTelemetry Collector's Kubernetes receivers
- All data follows OpenTelemetry format - use OTel metric and attribute names when querying Elasticsearch
