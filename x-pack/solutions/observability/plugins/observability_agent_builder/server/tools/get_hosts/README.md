# get_hosts

Retrieves a list of hosts with their infrastructure metrics (CPU, memory, disk, network). Use this tool to get an overview of host health and resource utilization.

## When to use

- Getting a high-level view of infrastructure health
- Identifying hosts with high CPU/memory usage or disk space issues
- Checking network throughput across hosts
- Answering questions like "which hosts are under heavy load?" or "what's the memory usage of my servers?"

## Response

Returns hosts with:

- **name**: Host name
- **hasSystemMetrics**: Boolean indicating if the host has system integration metrics
- **metrics**: Array of metric objects with name and value
  - `cpuV2`: CPU usage percentage (0-1)
  - `memory`: Memory usage percentage (0-1)
  - `memoryFree`: Free memory in bytes
  - `diskSpaceUsage`: Disk usage percentage (0-1)
  - `rxV2`: Network receive rate in bytes/sec
  - `txV2`: Network transmit rate in bytes/sec
  - `normalizedLoad1m`: Normalized 1-minute load average
- **metadata**: Host metadata
  - `host.os.name`: Operating system name
  - `cloud.provider`: Cloud provider (aws, gcp, azure)
  - `host.ip`: Host IP address

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
