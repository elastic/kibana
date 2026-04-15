# get_runtime_metrics

Retrieves runtime metrics (CPU usage, heap/non-heap memory with limits, thread count, GC duration) for service instances.

**Currently only supports JVM (Java) services.** Non-Java services will return no data. 

## When to Use

- Identifying application-level resource bottlenecks (high CPU, memory exhaustion)
- Correlating service performance issues with runtime health
- Correlating latency issues with CPU saturation or GC pauses
- Answering questions like "What is the CPU usage of the 'ad' service?"
- Diagnosing memory pressure by comparing used vs max memory

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_runtime_metrics",
  "tool_params": {
    "start": "now-15m",
    "end": "now",
    "serviceName": "ad",
    "serviceEnvironment": "production"
  }
}
```

## With KQL Filter

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_runtime_metrics",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.name: frontend AND host.name: web-*",
    "limit": 50
  }
}
```

## Response

Returns `{ total, nodes }` where `nodes` is an array of service nodes:

```json
{
  "total": 1,
  "nodes": [
    {
      "serviceName": "ad",
      "serviceNodeName": "ad-7f9b8c4d5-abc12",
      "hostName": "web-01",
      "runtime": "jvm",
      "cpuUtilization": 0.45,
      "heapMemoryBytes": 536870912,
      "heapMemoryMaxBytes": 1073741824,
      "heapMemoryUtilization": 0.5,
      "nonHeapMemoryBytes": 67108864,
      "nonHeapMemoryMaxBytes": 268435456,
      "nonHeapMemoryUtilization": 0.25,
      "threadCount": 42,
      "gcDurationMs": 150
    }
  ]
}
```

### Fields

| Field | Description |
|-------|-------------|
| `serviceName` | Name of the service |
| `serviceNodeName` | Service node/instance identifier |
| `hostName` | Host where the instance is running |
| `runtime` | Runtime type (e.g., "jvm") |
| `cpuUtilization` | CPU utilization (0-1 scale) |
| `heapMemoryBytes` | Heap memory usage in bytes |
| `heapMemoryMaxBytes` | Maximum heap memory in bytes |
| `heapMemoryUtilization` | Heap memory utilization (0-1 scale) |
| `nonHeapMemoryBytes` | Non-heap memory usage in bytes |
| `nonHeapMemoryMaxBytes` | Maximum non-heap memory in bytes |
| `nonHeapMemoryUtilization` | Non-heap memory utilization (0-1 scale) |
| `threadCount` | Number of threads |
| `gcDurationMs` | Total GC duration in milliseconds |
