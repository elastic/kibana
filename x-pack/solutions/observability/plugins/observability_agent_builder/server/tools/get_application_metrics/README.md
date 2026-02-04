# get_application_metrics

Retrieves application-level runtime metrics (CPU usage, heap/non-heap memory, thread count) for a service's instances.

**Currently only supports JVM (Java) services.** Non-Java services will return no data. 

## When to Use

- Identifying application-level resource bottlenecks (high CPU, memory exhaustion)
- Correlating service performance issues with runtime health
- Correlating latency issues with CPU saturation
- Answering questions like "What is the CPU usage of the 'ad' service?"

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_application_metrics",
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
  "tool_id": "observability.get_application_metrics",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "serviceName": "frontend",
    "kqlFilter": "host.name: web-*"
  }
}
```

## Response

Returns an array of application instances with:

| Field | Description |
|-------|-------------|
| `name` | Service node/instance name |
| `cpu` | CPU utilization (0-1 scale) |
| `heapMemory` | Heap memory usage in bytes |
| `nonHeapMemory` | Non-heap memory usage in bytes |
| `threadCount` | Number of threads |
| `hostName` | Host where the instance is running |
