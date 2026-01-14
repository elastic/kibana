# ES|QL Query Catalog

Quick reference for all ES|QL queries used in the Kubernetes POC plugin visualizations. Queries are extracted directly from the source code.

> **Note**: Queries using `${clusterName}` are parameterized and filter to a specific cluster.

---

## Kubernetes Overview Page

### Clusters Card
Total, healthy, and unhealthy cluster counts.

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

### Nodes Card
Total node count across all clusters.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
| STATS total_nodes = COUNT_DISTINCT(k8s.node.name)
```

### Pods Card
Total pod count across all clusters.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.pod.uid IS NOT NULL
| STATS total_pods = COUNT_DISTINCT(k8s.pod.uid)
```

### Containers Card
Total container count across all clusters.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.container.name IS NOT NULL
| STATS container_count = COUNT_DISTINCT(k8s.container.name)
```

### Namespaces Card
Total namespace count across all clusters.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.namespace.name IS NOT NULL
| STATS namespace_count = COUNT_DISTINCT(k8s.namespace.name)
```

### Deployments Card
Total deployment count across all clusters.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.deployment.name IS NOT NULL
| STATS deployment_count = COUNT_DISTINCT(k8s.deployment.name)
```

### DaemonSets Card
Total daemonset count across all clusters.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.daemonset.name IS NOT NULL
| STATS daemonset_count = COUNT_DISTINCT(k8s.daemonset.name)
```

### StatefulSets Card
Total statefulset count across all clusters.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.statefulset.name IS NOT NULL
| STATS statefulset_count = COUNT_DISTINCT(k8s.statefulset.name)
```

### ReplicaSets Card
Total replicaset count across all clusters.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.replicaset.name IS NOT NULL
| STATS replicaset_count = COUNT_DISTINCT(k8s.replicaset.name)
```

### Jobs Card
Total job count across all clusters.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.job.name IS NOT NULL
| STATS job_count = COUNT_DISTINCT(k8s.job.name)
```

---

## Cluster Listing Page

### Cluster Count Card
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

### Healthy Clusters Card
Count of healthy clusters with progress bar.

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

### Unhealthy Clusters Card
Count of unhealthy clusters with progress bar.

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
    unhealthy_count = COUNT(*) WHERE health_status == "unhealthy",
    total_count = COUNT(*)
```

### CPU Util Trend by Cluster Chart
CPU utilization over time grouped by cluster.

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

### CPU Util Change Point Detection
Detects anomalies in CPU usage patterns.

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

### Memory Util Trend by Cluster Chart
Memory utilization over time grouped by cluster.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.memory.usage IS NOT NULL OR k8s.node.allocatable_memory IS NOT NULL)
| STATS 
    sum_memory_usage = SUM(k8s.node.memory.usage),
    sum_allocatable_memory = SUM(k8s.node.allocatable_memory)
  BY timestamp = TBUCKET(1 minute), k8s.cluster.name
| EVAL value = sum_memory_usage / TO_DOUBLE(sum_allocatable_memory)
| KEEP timestamp, k8s.cluster.name, value
```

### Memory Util Change Point Detection
Detects anomalies in memory usage patterns.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.memory.usage IS NOT NULL OR k8s.node.allocatable_memory IS NOT NULL)
| STATS 
    sum_memory_usage = SUM(k8s.node.memory.usage),
    sum_allocatable_memory = SUM(k8s.node.allocatable_memory)
  BY timestamp = TBUCKET(1 minute)
| EVAL value = sum_memory_usage / TO_DOUBLE(sum_allocatable_memory)
| CHANGE_POINT value ON timestamp AS type, pvalue
| WHERE type IS NOT NULL
| KEEP timestamp, type, pvalue
```

### Volume Util Trend by Cluster Chart
Volume utilization over time grouped by cluster.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.filesystem.usage IS NOT NULL OR k8s.node.filesystem.capacity IS NOT NULL)
| STATS 
    sum_filesystem_usage = SUM(k8s.node.filesystem.usage),
    sum_filesystem_capacity = SUM(k8s.node.filesystem.capacity)
  BY timestamp = TBUCKET(1 minute), k8s.cluster.name
| EVAL volume_utilization = sum_filesystem_usage / TO_DOUBLE(sum_filesystem_capacity)
| KEEP timestamp, k8s.cluster.name, volume_utilization
```

### Cluster Listing Table (Server-side)
Main data for the cluster listing table.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND cloud.provider IS NOT NULL
  AND (
    k8s.node.name IS NOT NULL
    OR k8s.namespace.name IS NOT NULL
    OR k8s.pod.uid IS NOT NULL
    OR k8s.pod.phase IS NOT NULL
    OR k8s.node.cpu.usage IS NOT NULL
    OR k8s.node.memory.usage IS NOT NULL
    OR k8s.node.allocatable_cpu IS NOT NULL
    OR k8s.node.allocatable_memory IS NOT NULL
    OR k8s.node.condition_ready IS NOT NULL
    OR k8s.node.filesystem.usage IS NOT NULL
    OR k8s.node.filesystem.capacity IS NOT NULL
  )
| STATS
    total_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready IS NOT NULL,
    ready_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready > 0 AND k8s.node.condition_ready IS NOT NULL,
    total_namespaces = COUNT_DISTINCT(k8s.namespace.name),
    total_pods = COUNT_DISTINCT(k8s.pod.uid),
    running_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 2,
    failed_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 4,
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_memory_usage = SUM(k8s.node.memory.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu),
    sum_allocatable_memory = SUM(k8s.node.allocatable_memory),
    sum_filesystem_usage = SUM(k8s.node.filesystem.usage),
    sum_filesystem_capacity = SUM(k8s.node.filesystem.capacity)
  BY k8s.cluster.name, cloud.provider
| EVAL health_status = CASE(ready_nodes < total_nodes, "unhealthy", "healthy")
| EVAL cpu_utilization = ROUND(sum_cpu_usage / sum_allocatable_cpu * 100, 2)
| EVAL memory_utilization = ROUND(sum_memory_usage / TO_DOUBLE(sum_allocatable_memory) * 100, 2)
| EVAL volume_utilization = ROUND(sum_filesystem_usage / TO_DOUBLE(sum_filesystem_capacity) * 100, 2)
| KEEP k8s.cluster.name, health_status, cloud.provider, total_nodes, total_namespaces,
       failed_pods, running_pods,
       cpu_utilization, memory_utilization, volume_utilization
```

---

## Cluster Detail Flyout

### Memory Total Card
Total allocatable memory across all nodes in the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.allocatable_memory IS NOT NULL
| STATS 
    node_memory = MAX(k8s.node.allocatable_memory)
  BY k8s.node.name
| STATS total_memory_bytes = SUM(node_memory)
```

### Disk Size Card
Total disk capacity across all nodes in the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.filesystem.capacity IS NOT NULL
| STATS 
    disk_capacity = MAX(k8s.node.filesystem.capacity)
  BY k8s.node.name
| STATS total_disk_bytes = SUM(disk_capacity)
```

### Namespaces Card
Namespace counts by health status for the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
  AND k8s.namespace.name IS NOT NULL
  AND k8s.namespace.phase IS NOT NULL
  AND cloud.provider IS NOT NULL
| STATS
    total_namespaces = COUNT_DISTINCT(k8s.namespace.name),
    healthy_namespaces = COUNT_DISTINCT(k8s.namespace.name) WHERE k8s.namespace.phase == 1,
    unhealthy_namespaces = COUNT_DISTINCT(k8s.namespace.name) WHERE k8s.namespace.phase != 1
```

### Nodes Card
Node counts by health status for the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
  AND k8s.node.name IS NOT NULL
  AND k8s.node.condition_ready IS NOT NULL
| STATS
    total_nodes = COUNT_DISTINCT(k8s.node.name),
    healthy_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready > 0,
    unhealthy_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready <= 0
```

### Pods Card
Pod counts by health status for the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
  AND k8s.pod.uid IS NOT NULL
  AND k8s.pod.phase IS NOT NULL
| STATS
    total_pods = COUNT_DISTINCT(k8s.pod.uid),
    healthy_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 2,
    unhealthy_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 4
```

### Containers Card
Container counts by health status for the cluster.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
  AND k8s.container.name IS NOT NULL
  AND k8s.container.ready IS NOT NULL
| STATS
    total_containers = COUNT_DISTINCT(k8s.container.name),
    healthy_containers = COUNT_DISTINCT(k8s.container.name) WHERE k8s.container.ready > 0,
    unhealthy_containers = COUNT_DISTINCT(k8s.container.name) WHERE k8s.container.ready <= 0
```

### CPU Util Chart
CPU utilization over time with change point detection.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.cpu.usage IS NOT NULL OR k8s.node.allocatable_cpu IS NOT NULL)
| STATS 
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu)
  BY timestamp = TBUCKET(1 minute)
| EVAL value = sum_cpu_usage / sum_allocatable_cpu
| CHANGE_POINT value ON timestamp AS type, pvalue
| KEEP timestamp, value, type, pvalue
```

### Memory Util Chart
Memory usage over time with change point detection.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.memory.usage IS NOT NULL
| STATS value = SUM(k8s.node.memory.usage)
  BY timestamp = TBUCKET(1 minute)
| CHANGE_POINT value ON timestamp AS type, pvalue
| KEEP timestamp, value, type, pvalue
```

### Pods Util Chart
Pod utilization over time with change point detection.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.pod.uid IS NOT NULL
  AND k8s.pod.phase IS NOT NULL
| STATS 
    pod_count = COUNT_DISTINCT(k8s.pod.uid),
    node_count = COUNT_DISTINCT(k8s.node.name)
  BY timestamp = BUCKET(@timestamp, 1 minute)
| EVAL max_pods = node_count * 110
| EVAL value = TO_DOUBLE(pod_count) / TO_DOUBLE(max_pods)
| CHANGE_POINT value ON timestamp AS type, pvalue
| KEEP timestamp, value, type, pvalue
| SORT timestamp ASC
```

### Volume Util Chart
Volume/filesystem usage over time with change point detection.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.filesystem.usage IS NOT NULL
| STATS value = SUM(k8s.node.filesystem.usage)
  BY timestamp = TBUCKET(1 minute)
| CHANGE_POINT value ON timestamp AS type, pvalue
| KEEP timestamp, value, type, pvalue
```

### Network Traffic Chart
Network inbound/outbound traffic rate over time.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.network.io IS NOT NULL
| STATS 
    inbound = SUM(RATE(k8s.node.network.io)) WHERE direction == "receive",
    outbound = SUM(RATE(k8s.node.network.io)) WHERE direction == "transmit"
  BY timestamp = TBUCKET(1 minute)
```

### Network Inbound Change Point Detection
Detects anomalies in inbound traffic.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.network.io IS NOT NULL
  AND direction == "receive"
| STATS value = SUM(RATE(k8s.node.network.io))
  BY timestamp = TBUCKET(1 minute)
| CHANGE_POINT value ON timestamp AS type, pvalue
| WHERE type IS NOT NULL
| KEEP timestamp, type, pvalue
```

### Network Outbound Change Point Detection
Detects anomalies in outbound traffic.

```esql
TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.network.io IS NOT NULL
  AND direction == "transmit"
| STATS value = SUM(RATE(k8s.node.network.io))
  BY timestamp = TBUCKET(1 minute)
| CHANGE_POINT value ON timestamp AS type, pvalue
| WHERE type IS NOT NULL
| KEEP timestamp, type, pvalue
```

### Workload Resources Table
Per-workload resource usage aggregated by workload name, type, and namespace.

```esql
FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
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

