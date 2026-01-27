# get_hosts

Retrieves a list of hosts with their infrastructure metrics (CPU, memory, disk, network). Use this tool to get an overview of host health and resource utilization.

## When to use

- Getting a high-level view of infrastructure health
- Identifying hosts with high CPU/memory usage or disk space issues
- Checking network throughput across hosts
- Answering questions like "which hosts are under heavy load?" or "what's the memory usage of my servers?"

## Examples

### Get hosts in the last 4 hours

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_hosts",
  "tool_params": {
    "start": "now-4h",
    "end": "now"
  }
}
```

### Get metrics for specific hosts

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_hosts",
  "tool_params": {
    "hostNames": ["web-server-01", "web-server-02"]
  }
}
```

### Filter hosts by service name

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_hosts",
  "tool_params": {
    "kqlFilter": "service.name: frontend"
  }
}
```

### Filter hosts by cloud provider

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_hosts",
  "tool_params": {
    "kqlFilter": "cloud.provider: aws",
    "limit": 50
  }
}
```
