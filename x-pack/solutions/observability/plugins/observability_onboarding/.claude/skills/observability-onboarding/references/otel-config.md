# OTel Collector Config Templates

Use these templates as the base config for the EDOT Collector. Substitute `${ES_HOST}` and `${ES_ONBOARDING_KEY}` from environment variables.

## Host Config

For bare-metal or VM hosts collecting logs and metrics:

```yaml
receivers:
  filelog/system:
    include:
      - /var/log/syslog
      - /var/log/messages
      - /var/log/auth.log
    include_file_path: true
    operators:
      - type: move
        from: attributes["log.file.path"]
        to: resource["log.file.path"]

  # Add detected service logs here, e.g.:
  # filelog/nginx:
  #   include:
  #     - /var/log/nginx/access.log
  #     - /var/log/nginx/error.log
  #   include_file_path: true

  hostmetrics:
    collection_interval: 60s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
      disk: {}
      filesystem: {}
      network: {}
      process:
        metrics:
          process.cpu.utilization:
            enabled: true
      load: {}

processors:
  resourcedetection:
    detectors: [system]
    system:
      hostname_sources: ["os"]
      resource_attributes:
        host.id:
          enabled: true
  batch:
    send_batch_size: 1000
    timeout: 10s

exporters:
  elasticsearch:
    endpoint: "${ES_HOST}"
    api_key: "${ES_ONBOARDING_KEY}"
    logs_dynamic_index:
      enabled: true
    metrics_dynamic_index:
      enabled: true
    mapping:
      mode: ecs

service:
  pipelines:
    logs:
      receivers: [filelog/system]
      processors: [resourcedetection, batch]
      exporters: [elasticsearch]
    metrics:
      receivers: [hostmetrics]
      processors: [resourcedetection, batch]
      exporters: [elasticsearch]
```

## Docker Config

For hosts running Docker containers:

```yaml
receivers:
  filelog/containers:
    include:
      - /var/lib/docker/containers/*/*.log
    include_file_path: true
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"
      - type: move
        from: attributes.log
        to: body
      - type: move
        from: attributes["log.file.path"]
        to: resource["log.file.path"]

  docker_stats:
    collection_interval: 60s
    endpoint: unix:///var/run/docker.sock

  hostmetrics:
    collection_interval: 60s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
      network: {}

processors:
  resourcedetection:
    detectors: [system]
    system:
      hostname_sources: ["os"]
  batch:
    send_batch_size: 1000
    timeout: 10s

exporters:
  elasticsearch:
    endpoint: "${ES_HOST}"
    api_key: "${ES_ONBOARDING_KEY}"
    logs_dynamic_index:
      enabled: true
    metrics_dynamic_index:
      enabled: true
    mapping:
      mode: ecs

service:
  pipelines:
    logs:
      receivers: [filelog/containers]
      processors: [resourcedetection, batch]
      exporters: [elasticsearch]
    metrics:
      receivers: [docker_stats, hostmetrics]
      processors: [resourcedetection, batch]
      exporters: [elasticsearch]
```

## Kubernetes Config

When using the Helm chart, config is managed via Helm values. If deploying manually, use this config:

```yaml
receivers:
  filelog:
    include:
      - /var/log/pods/*/*/*.log
    include_file_path: true
    operators:
      - type: container
        id: container-parser

  k8s_cluster:
    collection_interval: 60s

  k8s_events:
    namespaces: []

  kubeletstats:
    collection_interval: 60s
    auth_type: serviceAccount
    endpoint: "https://${env:K8S_NODE_NAME}:10250"
    insecure_skip_verify: true

  hostmetrics:
    collection_interval: 60s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
      network: {}
      filesystem: {}

processors:
  k8sattributes:
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.pod.name
        - k8s.node.name
        - k8s.container.name
    passthrough: false
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip
  resourcedetection:
    detectors: [env, system]
  batch:
    send_batch_size: 1000
    timeout: 10s

exporters:
  elasticsearch:
    endpoint: "${ES_HOST}"
    api_key: "${ES_ONBOARDING_KEY}"
    logs_dynamic_index:
      enabled: true
    metrics_dynamic_index:
      enabled: true
    mapping:
      mode: ecs

service:
  pipelines:
    logs:
      receivers: [filelog, k8s_events]
      processors: [k8sattributes, resourcedetection, batch]
      exporters: [elasticsearch]
    metrics:
      receivers: [k8s_cluster, kubeletstats, hostmetrics]
      processors: [k8sattributes, resourcedetection, batch]
      exporters: [elasticsearch]
```

## Customization

When detected services are found, add additional `filelog` receivers. Example for nginx:

```yaml
receivers:
  filelog/nginx:
    include:
      - /var/log/nginx/access.log
      - /var/log/nginx/error.log
    include_file_path: true
```

Then add `filelog/nginx` to the `service.pipelines.logs.receivers` list.
