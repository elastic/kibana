# Docker Onboarding

## Prerequisites

- Docker or Docker Compose installed
- Running containers to monitor

## Installation Steps

### 1. Create config directory

```bash
mkdir -p /tmp/edot-collector
```

### 2. Write OTel config

Write the config from `otel-config.md` (Docker variant) to `/tmp/edot-collector/otel.yml`.

### 3. Run the EDOT Collector as a container

```bash
docker run -d \
  --name edot-collector \
  --restart unless-stopped \
  -v /tmp/edot-collector/otel.yml:/etc/otelcol/otel.yml:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
  -v /var/log:/var/log:ro \
  --pid host \
  docker.elastic.co/elastic-otel-collector/elastic-otel-collector:latest \
  --config /etc/otelcol/otel.yml
```

### 4. Verify the collector is running

```bash
docker logs edot-collector --tail 20
docker ps --filter name=edot-collector
```

## Docker Compose Alternative

If the user manages their stack with Docker Compose, suggest adding the collector as a service:

```yaml
services:
  edot-collector:
    image: docker.elastic.co/elastic-otel-collector/elastic-otel-collector:latest
    container_name: edot-collector
    restart: unless-stopped
    volumes:
      - ./otel.yml:/etc/otelcol/otel.yml:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/log:/var/log:ro
    pid: host
    command: ["--config", "/etc/otelcol/otel.yml"]
```

## Collected Data

- **Logs**: Container stdout/stderr from all running containers via Docker log driver
- **Metrics**: Container CPU, memory, network, and block I/O via Docker stats receiver
- **Host metrics**: If `--pid host` is used, host-level CPU, memory, disk metrics

## Troubleshooting

- If the collector cannot read Docker logs, ensure `/var/lib/docker/containers` is mounted
- If Docker socket is not accessible, the user may need to add the collector to the `docker` group
- For rootless Docker, mount paths will differ — check `docker info | grep "Docker Root Dir"`
