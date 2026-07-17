/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FixtureFeature } from './types';

export const features: FixtureFeature[] = [
  {
    "id": "cloudbeat",
    "uuid": "6bb10cfe-4b78-5ba6-bd47-74fc01f13a2e",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "Cloudbeat CSPM",
    "description": "Cloudbeat CSPM is the Cloudbeat-based cloud security posture workload running under the agentless service in the sampled GCP/GKE environment. These samples add direct evidence of cis_gcp runtime activ",
    "properties": {
      "name": "cloudbeat",
      "role": "cspm"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "cloudbeat",
      "cspm",
      "gcp"
    ]
  },
  {
    "id": "connectors",
    "uuid": "c6c185e3-5d73-596d-b760-8a493bdb3684",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "Connectors",
    "description": "Connectors is a Python-based service component under agentless for Elastic connector integrations. These samples add direct runtime evidence for a connectors-py deployment using the Zoom policy templa",
    "properties": {
      "name": "connectors",
      "technology": "python"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "connectors",
      "python"
    ]
  },
  {
    "id": "httpjson",
    "uuid": "8ff4aac5-dc7e-5789-a65e-cd2c2239c359",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "HTTPJSON Input",
    "description": "HTTPJSON is a Filebeat-based polling component under agentless for external API integrations. These samples add direct runtime evidence for another Okta workload repeatedly polling the Okta system log",
    "properties": {
      "name": "httpjson",
      "technology": "filebeat"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "filebeat",
      "httpjson"
    ]
  },
  {
    "id": "agentless",
    "uuid": "5bddf46b-63b1-5ba5-9d0e-2fb992a3c68e",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "Agentless",
    "description": "Agentless is the parent orchestration service supervising embedded workloads in the sampled GCP/GKE environment. These samples add direct evidence that it hosts cloudbeat CSPM and hello world workload",
    "properties": {
      "name": "agentless"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "agentless",
      "orchestrator"
    ]
  },
  {
    "id": "synthetics-http",
    "uuid": "9cbfec76-fcd6-5cfe-8d6d-acbef0a87432",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "Synthetics HTTP",
    "description": "Synthetics HTTP is a Heartbeat-based synthetic monitoring component running under the hello world agentless workload. These samples add another explicit lifecycle transition showing the HTTP synthetic",
    "properties": {
      "name": "synthetics-http",
      "technology": "heartbeat"
    },
    "confidence": 82,
    "tags": [
      "entity",
      "service",
      "heartbeat",
      "synthetics"
    ]
  },
  {
    "id": "dmc-media-information",
    "uuid": "b3eada16-af34-528c-8493-8d95857915e4",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "dmc-media-information",
    "description": "dmc-media-information is an upstream Ruby service instrumented with Elastic APM Ruby 4.5.1 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicit in the Ruby AP",
    "properties": {
      "name": "dmc-media-information",
      "technology": "ruby"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "ruby",
      "elastic-apm"
    ]
  },
  {
    "id": "elastic-operator",
    "uuid": "8ffb143d-d0c6-5d8f-a871-ddf6fc5ac1d5",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "elastic-operator",
    "description": "elastic-operator is an upstream Go service or workload instrumented with apm-agent-go 2.7.12 and sending Elastic APM intake traffic to motel-ingest-collector. The user agent explicitly names elastic-o",
    "properties": {
      "name": "elastic-operator",
      "technology": "go"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "go",
      "elastic-apm"
    ]
  },
  {
    "id": "motel-ingest-collector",
    "uuid": "eaab9c02-ee1d-53e3-948f-3ce5072fd20c",
    "stream_name": "logging-managed-inputs",
    "type": "entity",
    "subtype": "service",
    "title": "Motel Ingest Collector",
    "description": "motel-ingest-collector is an OpenTelemetry collector-based ingest service receiving APM intake and OTLP traffic over HTTP and gRPC in production Kubernetes across AWS and GCP. Current samples add addi",
    "properties": {
      "name": "motel-ingest-collector",
      "technology": "opentelemetry-collector"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "opentelemetry-collector",
      "ingest"
    ]
  },
  {
    "id": "market4u-socket-api",
    "uuid": "3bb22bd6-6e83-556a-b0fc-0cd54327e643",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "market4u-socket-api",
    "description": "market4u-socket-api is an upstream Node.js service instrumented with Elastic APM Node.js agent 4.15.0 and sending Elastic APM intake traffic to motel-ingest-collector. The sample explicitly identifies",
    "properties": {
      "name": "market4u-socket-api",
      "technology": "nodejs"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "dmc-external-get",
    "uuid": "6e6118f7-666b-5fa8-abe2-a2b7c7a3fe2e",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "dmc-external-get",
    "description": "dmc-external-get is an upstream Ruby service instrumented with Elastic APM Ruby 4.5.1 and sending Elastic APM intake traffic to motel-ingest-collector. This sample provides direct production-environme",
    "properties": {
      "name": "dmc-external-get",
      "technology": "ruby"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "ruby",
      "apm"
    ]
  },
  {
    "id": "motel-aggregation-collector",
    "uuid": "d818479d-3354-59b6-9e11-8394b6646c50",
    "stream_name": "logging-managed-inputs",
    "type": "entity",
    "subtype": "service",
    "title": "Motel Aggregation Collector",
    "description": "motel-aggregation-collector is an OpenTelemetry collector-based aggregation service running in production Kubernetes on GCP. Current samples add explicit Kafka receiver rebalance and heartbeat-loop ac",
    "properties": {
      "name": "motel-aggregation-collector",
      "technology": "opentelemetry-collector"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "opentelemetry-collector",
      "kafka",
      "aggregation"
    ]
  },
  {
    "id": "motel-index-collector",
    "uuid": "fa068cee-2ec4-5e9c-b44e-427ba3393502",
    "stream_name": "logging-managed-inputs",
    "type": "entity",
    "subtype": "service",
    "title": "Motel Index Collector",
    "description": "motel-index-collector is an OpenTelemetry collector-based indexing service running in production Kubernetes on GCP. Current samples add a canary metrics-export context showing Elasticsearch index conf",
    "properties": {
      "name": "motel-index-collector",
      "technology": "opentelemetry-collector"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "opentelemetry-collector",
      "indexing",
      "elasticsearch"
    ]
  },
  {
    "id": "es-es-search",
    "uuid": "e5aa1e5b-9e3c-50a8-b177-89b3b3057e06",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "ES Search Tier",
    "description": "Elasticsearch search-tier service runs as the es-es-search deployment and serves read-oriented Elasticsearch workloads across multiple serverless projects. This sample adds more direct GC-log evidence",
    "properties": {
      "name": "es-es-search",
      "technology": "elasticsearch",
      "tier": "search"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "elasticsearch",
      "search-tier"
    ]
  },
  {
    "id": "proxy",
    "uuid": "1f758a46-0914-5f8f-a84b-c49555e161fc",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Ingress Proxy",
    "description": "Ingress proxy is the internal HTTPS routing layer that forwards requests to Elasticsearch backends across zones. This sample adds explicit Kibana and Metricbeat traffic routed to Elasticsearch search-",
    "properties": {
      "name": "proxy",
      "role": "ingress-proxy",
      "technology": "http-proxy"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "proxy",
      "ingress",
      "http"
    ]
  },
  {
    "id": "kibana",
    "uuid": "27118d79-e62f-53de-a38c-aa4825e64a65",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "Kibana",
    "description": "Kibana is explicitly observed as an upstream Node.js service sending Elastic APM intake traffic to motel-ingest-collector. This sample adds direct evidence for 9.3.8-SNAPSHOT and 9.6.0-SNAPSHOT builds",
    "properties": {
      "name": "kibana",
      "technology": "nodejs"
    },
    "confidence": 86,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "es-es-index",
    "uuid": "af57b5be-9eda-560a-93e3-7f6b2b5f8938",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "ES Index Tier",
    "description": "Elasticsearch index-tier service runs as the es-es-index deployment and handles write-oriented Elasticsearch storage workloads. This sample adds more direct GC-log evidence from multiple projects and ",
    "properties": {
      "name": "es-es-index",
      "technology": "elasticsearch",
      "tier": "index"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "elasticsearch",
      "index-tier"
    ]
  },
  {
    "id": "docker-registry",
    "uuid": "86af7baa-85e9-512a-a682-f4f2907f64e8",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Docker Registry",
    "description": "Docker Registry serves container image and signature artifacts for docker.elastic.co in the container-library namespace. This sample adds both successful and failed manifest authorization events, rein",
    "properties": {
      "name": "docker-registry",
      "technology": "docker-registry"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "registry"
    ]
  },
  {
    "id": "heartbeat",
    "uuid": "690a304e-2c0e-5156-bd05-8de704f1694a",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Heartbeat",
    "description": "Heartbeat remains present as a Beats-based monitoring or probing service in the cluster. This sample contributes indirect corroboration through Kibana task-manager entity extraction reading an entity-",
    "properties": {
      "name": "heartbeat",
      "technology": "beats"
    },
    "confidence": 34,
    "tags": [
      "entity",
      "service",
      "beats",
      "inferred"
    ]
  },
  {
    "id": "o11y-launch-demo-elastic-launch-demo",
    "uuid": "e66a107f-af8b-5c74-b45d-478aef7a074d",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "O11y Launch Demo",
    "description": "o11y-launch-demo-elastic-launch-demo is a demo observability workload deployed in its own Kubernetes namespace. The sample shows it emitting trace-generation activity and reporting large cumulative tr",
    "properties": {
      "name": "o11y-launch-demo-elastic-launch-demo"
    },
    "confidence": 76,
    "tags": [
      "entity",
      "service",
      "observability",
      "demo"
    ]
  },
  {
    "id": "usage-api",
    "uuid": "08a38272-08f5-5429-a18a-77309db6e146",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Usage API",
    "description": "usage-api is a control-plane service running in the usage-api namespace that serves POST requests to /api/v1/usage and produces records to Kafka queues. This sample adds direct HTTP request handling e",
    "properties": {
      "name": "usage-api",
      "technology": "go"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "kafka",
      "go"
    ]
  },
  {
    "id": "deco-green-kafka",
    "uuid": "120851d1-396a-5fdc-b746-0701e2184735",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "message_queue",
    "title": "Kafka Broker",
    "description": "Kafka broker service runs as the deco-green-kafka StatefulSet in the green namespace. The sampled log shows broker-side replication-factor errors for the offsets topic, confirming an active Kafka depl",
    "properties": {
      "name": "deco-green-kafka",
      "technology": "kafka"
    },
    "confidence": 84,
    "tags": [
      "entity",
      "message-queue",
      "kafka"
    ]
  },
  {
    "id": "f5-nginx-ingress-controller",
    "uuid": "265ed9a7-03ff-5bc3-ba55-62026575ee82",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "NGINX Ingress",
    "description": "F5 NGINX Ingress Controller runs in the elastic-apps namespace and serves HTTPS traffic for Docker registry content. This sample adds another direct registry request handled on docker.elastic.co for a",
    "properties": {
      "name": "f5-nginx-ingress-controller",
      "technology": "nginx-ingress"
    },
    "confidence": 82,
    "tags": [
      "entity",
      "service",
      "ingress",
      "nginx"
    ]
  },
  {
    "id": "zwischending-production",
    "uuid": "a9d39f2e-17a3-5377-9f32-7a77e1af13f3",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Zwischending",
    "description": "zwischending-production is a deployed application service running in its own Kubernetes namespace on the elastic-apps-web cluster. This sample adds direct HTTP handling evidence for a POST request to ",
    "properties": {
      "name": "zwischending-production"
    },
    "confidence": 80,
    "tags": [
      "entity",
      "service",
      "web"
    ]
  },
  {
    "id": "autoops-analyzer",
    "uuid": "bc57be7d-66dc-5cbc-be95-aa4456cf882d",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "AutoOps Analyzer",
    "description": "autoops-analyzer is an AutoOps service running in the autoops namespace in production. This sample adds direct MetricsFetcher completion evidence for a cluster-health fetch operation from the analyzer",
    "properties": {
      "name": "autoops-analyzer",
      "technology": "java"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "autoops",
      "analyzer",
      "java"
    ]
  },
  {
    "id": "es-es-ml",
    "uuid": "d2b31cfd-944a-55c1-8d72-dc40cf04f9e8",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "ES ML Tier",
    "description": "Elasticsearch ML tier runs as the es-es-ml deployment and represents a distinct machine-learning tier within the Elasticsearch project architecture. This sample adds another direct GC-log record from ",
    "properties": {
      "name": "es-es-ml",
      "technology": "elasticsearch",
      "tier": "ml"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "elasticsearch",
      "ml"
    ]
  },
  {
    "id": "agentless-api",
    "uuid": "d74a9c5f-1fdb-5122-8f57-7b39980b9662",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "Agentless API",
    "description": "Agentless API is the Go-based Kubernetes service serving liveness checks and Kibana-origin serverless deployments API traffic. These samples add direct evidence that the service continues handling GET",
    "properties": {
      "name": "agentless-api",
      "technology": "go",
      "service_type": "agentless-api"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "go",
      "kubernetes",
      "serverless"
    ]
  },
  {
    "id": "api-market4u-mobile",
    "uuid": "a365a531-8800-5f55-9fdc-4da438e22913",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "api-market4u-mobile",
    "description": "api-market4u-mobile is an upstream Node.js service instrumented with Elastic APM Node.js agent 4.18.0 and sending Elastic APM intake traffic to motel-ingest-collector. The service name and application",
    "properties": {
      "name": "api-market4u-mobile",
      "technology": "nodejs"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "fbp-tournament-signup-ms",
    "uuid": "770749b4-eb23-5852-90e8-a9873933964a",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "fbp-tournament-signup-ms",
    "description": "fbp-tournament-signup-ms is an upstream Node.js service instrumented with Elastic APM Node.js agent 4.15.0 and sending Elastic APM intake traffic to motel-ingest-collector. The user agent explicitly n",
    "properties": {
      "name": "fbp-tournament-signup-ms",
      "technology": "nodejs"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "pay2-server",
    "uuid": "2084b933-84af-5802-82fc-d031b066356b",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "pay2-server",
    "description": "pay2-server is an upstream PHP service instrumented with Elastic APM PHP agent 1.16.0 and sending Elastic APM intake traffic to motel-ingest-collector. This sample adds explicit evidence from a revers",
    "properties": {
      "name": "pay2-server",
      "technology": "php"
    },
    "confidence": 88,
    "tags": [
      "entity",
      "service",
      "php",
      "apm"
    ]
  },
  {
    "id": "travel-service",
    "uuid": "16e42dac-d40b-5f08-bd2f-15c21384f3e9",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "travel-service",
    "description": "travel-service is an upstream Node.js service instrumented with Elastic APM Node.js agent 4.15.0 and sending Elastic APM intake traffic to motel-ingest-collector. The service name and version are expl",
    "properties": {
      "name": "travel-service",
      "technology": "nodejs"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "entry-admin",
    "uuid": "11055a14-4e8b-5071-a07b-fad92557d7f0",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "entry-admin",
    "description": "entry-admin is an upstream Ruby service instrumented with Elastic APM Ruby 4.7.3 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicit in the Ruby APM user age",
    "properties": {
      "name": "entry-admin",
      "technology": "ruby"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "ruby",
      "apm"
    ]
  },
  {
    "id": "srv-ts-document-api",
    "uuid": "2bd3a90d-4b6c-587b-9d40-d89310bbab2a",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "srv-ts-document-api",
    "description": "srv-ts-document-api is an upstream Node.js service instrumented with Elastic APM Node.js agent 4.15.0 and sending Elastic APM intake traffic to motel-ingest-collector. The service name and version are",
    "properties": {
      "name": "srv-ts-document-api",
      "technology": "nodejs"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "avendrepay-avendrepay-backoffice",
    "uuid": "92c73616-e3d8-5d97-907e-455160c5cf30",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "AVENDREPAY Backoffice",
    "description": "AVENDREPAY-AVENDREPAY-BACKOFFICE is an upstream Node.js service sending Elastic APM intake traffic to motel-ingest-collector. The logs explicitly identify the service in the Node.js APM user agent and",
    "properties": {
      "name": "AVENDREPAY-AVENDREPAY-BACKOFFICE",
      "technology": "nodejs"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "sln-fraud-detection-service",
    "uuid": "e9436851-a6db-5e00-9165-118cefb05ff6",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "sln-fraud-detection-service",
    "description": "sln-fraud-detection-service is an upstream Python service sending Elastic APM intake traffic to motel-ingest-collector. The service name and version are explicitly present in the Python APM user agent",
    "properties": {
      "name": "sln-fraud-detection-service",
      "technology": "python"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "python",
      "apm"
    ]
  },
  {
    "id": "bet-track-pages-ssr",
    "uuid": "b305572d-6ebf-5ecc-a5e1-d0a692714e6a",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "bet-track-pages-ssr",
    "description": "bet-track-pages-ssr is an upstream Node.js service sending Elastic APM intake traffic to motel-ingest-collector. The service name and version are explicitly present in the Node.js APM user agent on th",
    "properties": {
      "name": "bet-track-pages-ssr",
      "technology": "nodejs"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "nar-es-stream",
    "uuid": "0506963e-6dcf-50a7-84d3-97f24fc96ecb",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "nar-es-stream",
    "description": "nar-es-stream is an upstream Python service sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicit in the Python APM user agent on the collector root intake endpoin",
    "properties": {
      "name": "nar-es-stream",
      "technology": "python"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "python",
      "apm"
    ]
  },
  {
    "id": "controlle-audit",
    "uuid": "5c537d80-6de2-5178-a449-4242be90b0c6",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "controlle-audit",
    "description": "controlle-audit is an upstream Node.js service instrumented with Elastic APM Node.js agent 4.13.0 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicit in both",
    "properties": {
      "name": "controlle-audit",
      "technology": "nodejs"
    },
    "confidence": 96,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "elastic-apm"
    ]
  },
  {
    "id": "srs-apirecharge-live-59",
    "uuid": "16cb12d4-81aa-5c9c-952f-04918b301b24",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "SRS_APIRecharge_Live_59",
    "description": "SRS_APIRecharge_Live_59 is an upstream .NET service instrumented with Elastic APM .NET agent 1.23.0 and sending APM intake traffic to motel-ingest-collector. This sample adds further evidence for the ",
    "properties": {
      "name": "SRS_APIRecharge_Live_59",
      "technology": "dotnet"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "dotnet",
      "apm"
    ]
  },
  {
    "id": "cel",
    "uuid": "62644075-8819-5c2b-878e-90d0bfa5fcad",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "CEL Input",
    "description": "CEL is a Filebeat-based input component running under agentless for API-backed or generic integrations. These samples add another direct lifecycle transition for the CEL component in the agentless hel",
    "properties": {
      "name": "cel",
      "technology": "filebeat"
    },
    "confidence": 90,
    "tags": [
      "entity",
      "service",
      "cel",
      "filebeat"
    ]
  },
  {
    "id": "uiam",
    "uuid": "1ed666ae-dab8-56f6-afc7-a5e61db51c89",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "UIAM",
    "description": "UIAM is a control-plane authentication service handling POST requests to /uiam/api/v1/authentication/_authenticate in the uiam-regional namespace. This sample adds repeated direct access-log evidence ",
    "properties": {
      "name": "uiam",
      "technology": "java",
      "role": "authentication-service"
    },
    "confidence": 97,
    "tags": [
      "entity",
      "service",
      "authentication",
      "java",
      "quarkus"
    ]
  },
  {
    "id": "elasticsearch-controller",
    "uuid": "9ebb6523-57cb-5736-88de-d54ac26a44c3",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "ES Controller",
    "description": "elasticsearch-controller is a Kubernetes control-plane service that reconciles ElasticsearchAutoscaler and ElasticsearchAppConfig resources for serverless Elasticsearch and observability projects. Thi",
    "properties": {
      "name": "elasticsearch-controller",
      "technology": "elasticsearch"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "controller",
      "elasticsearch"
    ]
  },
  {
    "id": "srs-apirecharge-live-53",
    "uuid": "16cb12d4-81aa-5c9c-952f-04918b301b24",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "SRS_APIRecharge_Live_53",
    "description": "SRS_APIRecharge_Live_53 is an upstream .NET service instrumented with Elastic APM .NET agent 1.23.0 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicitly pre",
    "properties": {
      "name": "SRS_APIRecharge_Live_53",
      "technology": "dotnet"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "dotnet",
      "elastic-apm"
    ]
  },
  {
    "id": "vuuklecore",
    "uuid": "1b0ca95e-e958-5dbd-b06e-907abe2e800f",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "VuukleCore",
    "description": "VuukleCore is an upstream .NET service instrumented with Elastic APM .NET agent 1.34.1 and sending Elastic APM intake traffic to motel-ingest-collector. This sample adds further evidence for the exist",
    "properties": {
      "name": "VuukleCore",
      "technology": "dotnet"
    },
    "confidence": 87,
    "tags": [
      "entity",
      "service",
      "dotnet",
      "apm"
    ]
  },
  {
    "id": "zon-es-stream",
    "uuid": "e1ab1615-c110-50e8-93ad-372820ad3e2d",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "zon-es-stream",
    "description": "zon-es-stream is an upstream Python service instrumented with Elastic APM Python agent 6.26.1 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicitly present i",
    "properties": {
      "name": "zon-es-stream",
      "technology": "python"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "python",
      "elastic-apm"
    ]
  },
  {
    "id": "booking",
    "uuid": "1865764e-75ff-5c05-aaf9-9ba007e39e75",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "booking",
    "description": "booking is an upstream Node.js service instrumented with Elastic APM Node.js agent 4.15.0 and sending Elastic APM intake traffic to motel-ingest-collector. The service is explicitly identified in the ",
    "properties": {
      "name": "booking",
      "technology": "nodejs"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "inscricao-concurso",
    "uuid": "fb4c0b85-1d49-5edc-80e3-32bfdc21ee9a",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "inscricao-concurso",
    "description": "inscricao-concurso is an upstream .NET service instrumented with Elastic APM .NET agent 1.34.1 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicitly present ",
    "properties": {
      "name": "inscricao-concurso",
      "technology": "dotnet"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "dotnet",
      "apm"
    ]
  },
  {
    "id": "payment",
    "uuid": "ae948d76-52bd-5d5f-8fc9-ba53eeb7cda7",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "payment",
    "description": "payment is an upstream Node.js service instrumented with Elastic APM Node.js agent 4.15.0 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicit in both the que",
    "properties": {
      "name": "payment",
      "technology": "nodejs"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "surl-api",
    "uuid": "57d65599-f501-5875-9976-51912a13cb6e",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "surl-api",
    "description": "surl-api is an upstream Ruby service instrumented with Elastic APM Ruby 4.7.3 and sending APM intake traffic to motel-ingest-collector. The service name is explicitly present in both the query string ",
    "properties": {
      "name": "surl-api",
      "technology": "ruby"
    },
    "confidence": 89,
    "tags": [
      "entity",
      "service",
      "ruby",
      "apm"
    ]
  },
  {
    "id": "optimus-api",
    "uuid": "0daa3a4b-92c7-56d7-8541-875dd13f60d8",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "optimus-api",
    "description": "optimus-api is an upstream Node.js service instrumented with Elastic APM Node.js agent 4.13.0 and sending APM intake traffic to motel-ingest-collector. The service name is explicit in both the query s",
    "properties": {
      "name": "optimus-api",
      "technology": "nodejs"
    },
    "confidence": 88,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "functional-tests",
    "uuid": "62918a74-3c3f-5709-b4fc-89a570d9d603",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "functional-tests",
    "description": "functional-tests is explicitly observed as an upstream Node.js workload sending Elastic APM intake traffic to motel-ingest-collector. This sample reinforces version 9.6.0 and service.environment=ci wh",
    "properties": {
      "name": "functional-tests",
      "technology": "nodejs"
    },
    "confidence": 85,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "flight-worker",
    "uuid": "4a804bc5-cc47-55e7-b936-1d1288ae4e8f",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "flight-worker",
    "description": "flight-worker is an upstream Node.js service sending Elastic APM intake traffic to motel-ingest-collector. The service is explicitly identified in the APM Node.js user agent on the collector's /intake",
    "properties": {
      "name": "flight-worker",
      "technology": "nodejs"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "srv-ts-auth-api",
    "uuid": "313540e6-975f-5bd5-9736-3c782ee9634d",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "srv-ts-auth-api",
    "description": "srv-ts-auth-api is an upstream Node.js service sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicitly present in the APM Node.js user agent on the collector's /in",
    "properties": {
      "name": "srv-ts-auth-api",
      "technology": "nodejs"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "agentless-cleaner",
    "uuid": "7aa2a008-8baf-5c71-bd05-e2f7c23c214b",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "Agentless Cleaner",
    "description": "Agentless Cleaner is a Go-based batch job in the agentless-api namespace that loads configuration through shared config helpers and runs as a Kubernetes Job. These samples add direct evidence of anoth",
    "properties": {
      "name": "agentless-cleaner",
      "technology": "go",
      "service_type": "agentless-cleaner"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "batch",
      "go",
      "kubernetes"
    ]
  },
  {
    "id": "log",
    "uuid": "fb62d84b-c0e4-58c6-a42a-2a2f8e69a0df",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "Log Input",
    "description": "Log is a distinct Filebeat-based input component running under agentless for log-oriented integrations. These samples add direct evidence of an Elastic Security workload using the log component, inclu",
    "properties": {
      "name": "log",
      "technology": "filebeat"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "filebeat",
      "log"
    ]
  },
  {
    "id": "cilium-agent",
    "uuid": "5692f844-a0ec-574a-800f-f2a82dea3208",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Cilium Agent",
    "description": "Cilium agent runs as the anetd DaemonSet in kube-system and manages cluster networking datapath and policy updates. This sample adds direct control-plane policy processing evidence on GKE nodes.",
    "properties": {
      "name": "cilium-agent",
      "technology": "cilium"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "cilium",
      "networking"
    ]
  },
  {
    "id": "gcp-pubsubbeat",
    "uuid": "9f496b5a-d820-5a1b-8b39-6a78e621401c",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Pubsubbeat",
    "description": "GCP Pubsubbeat consumes Google Cloud logs and attempts to index them into Elasticsearch. This sample reinforces its ingest role by showing repeated indexing failures caused by the Elasticsearch maximu",
    "properties": {
      "name": "gcp-pubsubbeat",
      "technology": "beats"
    },
    "confidence": 80,
    "tags": [
      "entity",
      "service",
      "beats",
      "ingest"
    ]
  },
  {
    "id": "kyverno-reports-controller",
    "uuid": "c2782446-872c-5935-87ea-ca2aebee25ba",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Kyverno Reports",
    "description": "Kyverno reports-controller service runs in the kyverno namespace and evaluates Kubernetes resources against policy rules, producing policy report outcomes. The observed logs show it processing Deploym",
    "properties": {
      "name": "kyverno-reports-controller",
      "technology": "kyverno"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "kyverno",
      "policy-controller",
      "kubernetes"
    ]
  },
  {
    "id": "fn-auto-ready",
    "uuid": "b73b0be8-9195-535c-a061-cd37e331f158",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Crossplane Auto Ready",
    "description": "Crossplane fn-auto-ready service runs in the crossplane namespace and automatically determines readiness for composed infrastructure resources. This sample adds direct evidence that it is running as t",
    "properties": {
      "name": "fn-auto-ready",
      "technology": "crossplane"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "crossplane",
      "control-plane"
    ]
  },
  {
    "id": "fn-vars",
    "uuid": "6ba5113e-05fd-5d37-9e71-3e7f8f06d56c",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Crossplane Vars",
    "description": "Crossplane fn-vars service runs in the crossplane namespace and executes variable-processing logic for infrastructure compositions. This sample adds another direct successful execution on an XGKENodep",
    "properties": {
      "name": "fn-vars",
      "technology": "crossplane"
    },
    "confidence": 89,
    "tags": [
      "entity",
      "service",
      "crossplane"
    ]
  },
  {
    "id": "fn-cue",
    "uuid": "f17ff611-e118-50a8-8c53-487fd6f2845d",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Crossplane CUE",
    "description": "Crossplane fn-cue service runs in the crossplane namespace and executes CUE modules as part of infrastructure composition workflows. The logs show it operating on GKE nodepool custom resources in the ",
    "properties": {
      "name": "fn-cue",
      "technology": "crossplane"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "crossplane",
      "function",
      "control-plane"
    ]
  },
  {
    "id": "docker-auth",
    "uuid": "0f8178ff-ebaa-5150-bf3a-032aed5edc9e",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Docker Auth",
    "description": "docker-auth is an authentication service running in the container-library namespace. The current sample shows it making static ACL authorization decisions for image pull access, reinforcing its role i",
    "properties": {
      "name": "docker-auth",
      "technology": "docker-auth"
    },
    "confidence": 81,
    "tags": [
      "entity",
      "service",
      "authentication",
      "registry"
    ]
  },
  {
    "id": "usage-shipper",
    "uuid": "f83a2dbe-64bb-5056-a7ad-f76ac406b223",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Usage Shipper",
    "description": "usage-shipper is a control-plane service that batches usage data into Firehose and is configured with a Google Managed Kafka bootstrap endpoint. The current sample adds failover-enabled Firehose submi",
    "properties": {
      "name": "usage-shipper",
      "technology": "firehose"
    },
    "confidence": 81,
    "tags": [
      "entity",
      "service",
      "firehose",
      "kafka"
    ]
  },
  {
    "id": "autoops",
    "uuid": "8e757faa-d3e9-5185-84ff-5a386452678c",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "AutoOps",
    "description": "AutoOps is an observability-side service deployed as autoops and backed by Metricbeat. The sampled log shows it attempting DNS resolution for a project-scoped Elasticsearch hostname, indicating monito",
    "properties": {
      "name": "autoops",
      "technology": "metricbeat"
    },
    "confidence": 87,
    "tags": [
      "entity",
      "service",
      "observability",
      "metricbeat"
    ]
  },
  {
    "id": "motel-provisioner",
    "uuid": "ffcb2581-aafd-54cd-83c3-7a94a3147b1a",
    "stream_name": "logging-managed-inputs",
    "type": "entity",
    "subtype": "service",
    "title": "Motel Provisioner",
    "description": "motel-provisioner is a distinct OpenTelemetry collector-based service running in hosted GCP production clusters. Current logs add another explicit resolve request in us-east1-b from an Elastic Managed",
    "properties": {
      "name": "motel-provisioner",
      "technology": "opentelemetry-collector"
    },
    "confidence": 86,
    "tags": [
      "entity",
      "service",
      "opentelemetry-collector",
      "gcp",
      "provisioning"
    ]
  },
  {
    "id": "metricbeat",
    "uuid": "7597d86d-66d2-5b86-936d-6a60af66a74e",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "Metricbeat AWS",
    "description": "Metricbeat is running as an AWS log and metrics collection component under agentless. These samples add direct evidence of the aws-cloudwatch workload starting a CloudWatch poller for AWS ELB log grou",
    "properties": {
      "name": "metricbeat",
      "role": "aws_metrics"
    },
    "confidence": 88,
    "tags": [
      "entity",
      "service",
      "aws",
      "cloudwatch",
      "filebeat"
    ]
  },
  {
    "id": "mki-cluster-autoscaler",
    "uuid": "7052e1c7-1875-51c1-8c2f-f50c456565fc",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Cluster Autoscaler",
    "description": "mki-cluster-autoscaler is a Kubernetes control-plane service running in the cluster-autoscaler namespace that tracks node startup timing for GKE nodes. The logs show it operating as the cluster-autosc",
    "properties": {
      "name": "mki-cluster-autoscaler",
      "technology": "cluster-autoscaler"
    },
    "confidence": 96,
    "tags": [
      "entity",
      "service",
      "kubernetes",
      "autoscaling",
      "gcp"
    ]
  },
  {
    "id": "srv-ts-event-receiver",
    "uuid": "f82acd2f-171d-5d06-ae74-0745553b47c2",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "srv-ts-event-receiver",
    "description": "srv-ts-event-receiver is an upstream Node.js service instrumented with Elastic APM agent 4.15.0 and sending APM intake traffic to motel-ingest-collector. The logs show it contacting the collector via ",
    "properties": {
      "name": "srv-ts-event-receiver",
      "technology": "nodejs"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "entry-api-db",
    "uuid": "345a3c0b-5a2c-52f6-b750-33799e3192c5",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "entry-api-db",
    "description": "entry-api-db is an upstream Ruby service instrumented with Elastic APM Ruby 4.8.0 and sending APM intake traffic to motel-ingest-collector. The service is explicitly named in the user agent and appear",
    "properties": {
      "name": "entry-api-db",
      "technology": "ruby"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "ruby",
      "apm"
    ]
  },
  {
    "id": "commerce-gateway",
    "uuid": "1a515d80-f1df-5a31-ad0e-5d590e74009a",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "commerce-gateway",
    "description": "commerce-gateway is an upstream Java service instrumented with Elastic APM Java agent 1.54.0 and sending APM intake traffic to motel-ingest-collector. The service name is explicitly present in the use",
    "properties": {
      "name": "commerce-gateway",
      "technology": "java"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "java",
      "apm"
    ]
  },
  {
    "id": "eportal-apm2",
    "uuid": "107b397c-a9d8-50de-b27a-f6a7fa433729",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "Eportal-APM2",
    "description": "Eportal-APM2 is an upstream PHP service instrumented with Elastic APM PHP agent 1.15.1 and sending APM intake traffic to motel-ingest-collector. The service name is explicit in the user agent on Elast",
    "properties": {
      "name": "Eportal-APM2",
      "technology": "php"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "php",
      "apm"
    ]
  },
  {
    "id": "sso",
    "uuid": "804344d7-a7de-5e61-8892-1378b41de16d",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "sso",
    "description": "sso is an upstream PHP service instrumented with Elastic APM PHP agent 1.16.0 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicit in the agent user agent on ",
    "properties": {
      "name": "sso",
      "technology": "php"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "php",
      "elastic-apm"
    ]
  },
  {
    "id": "surl-service",
    "uuid": "2e47f056-016f-5382-8de8-d221e05e4e69",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "surl-service",
    "description": "surl-service is an upstream Ruby service instrumented with Elastic APM Ruby 4.7.3 and sending APM intake traffic to motel-ingest-collector. The service name and production environment are explicitly p",
    "properties": {
      "name": "surl-service",
      "technology": "ruby"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "ruby",
      "elastic-apm"
    ]
  },
  {
    "id": "web-recursos-questoes-objetiva-pnd",
    "uuid": "da34b956-e5b0-534c-9e6e-33cc8040287b",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "Web Recursos PND",
    "description": "Web Recursos Questoes Objetiva - PND is an upstream .NET service instrumented with Elastic APM .NET agent 1.34.1 and sending APM intake traffic to motel-ingest-collector. The logs explicitly expose th",
    "properties": {
      "name": "Web Recursos Questoes Objetiva - PND",
      "technology": "dotnet"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "dotnet",
      "elastic-apm"
    ]
  },
  {
    "id": "fgv-sistema-de-correncneo",
    "uuid": "ff9dea3a-26b0-5048-afe5-5f00d23f8560",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "FGV Sistema de CorreNCNEo",
    "description": "FGV Sistema de CorreNCNEo is an upstream PHP service instrumented with Elastic APM PHP agent 1.15.1 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicitly exp",
    "properties": {
      "name": "FGV Sistema de CorreNCNEo",
      "technology": "php"
    },
    "confidence": 88,
    "tags": [
      "entity",
      "service",
      "php",
      "apm"
    ]
  },
  {
    "id": "kafka",
    "uuid": "5f803cd8-9ca5-5308-bf34-faf3d84a7cf7",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "message_queue",
    "title": "Kafka",
    "description": "Kafka is an explicit downstream messaging component used by motel-ingest-collector through its kafka/small exporter for metrics. This sample adds direct hosted GCP evidence that the exporter is active",
    "properties": {
      "name": "kafka",
      "technology": "kafka"
    },
    "confidence": 86,
    "tags": [
      "entity",
      "message-queue",
      "kafka",
      "inferred",
      "message_queue"
    ]
  },
  {
    "id": "connect-service-chattr",
    "uuid": "199429b4-35cb-5697-9bf8-b01382de2093",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "connect-service_chattr",
    "description": "connect-service_chattr is an upstream Java service instrumented with Elastic APM Java agent 1.55.6 and sending Elastic APM intake traffic to motel-ingest-collector. The service name and version 1.2.0 ",
    "properties": {
      "name": "connect-service_chattr",
      "technology": "java"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "java",
      "apm"
    ]
  },
  {
    "id": "autoops-scheduler",
    "uuid": "4e356f4c-67cc-5208-b9d6-648dc9cdd90a",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "AutoOps Scheduler",
    "description": "autoops-scheduler is a distinct AutoOps service running in the autoops namespace and handling scheduler resource activity such as returning clusters to work on request and acknowledging analysis-task ",
    "properties": {
      "name": "autoops-scheduler",
      "technology": "java",
      "role": "scheduler"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "autoops",
      "scheduler",
      "java"
    ]
  },
  {
    "id": "elastic-csi-driver",
    "uuid": "5b5bba4c-4077-5b70-9fdc-535ffead2863",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Elastic CSI Driver",
    "description": "elastic-csi-driver is a Kubernetes storage-related service running as a DaemonSet in the elastic-csi-driver namespace. The logs show it managing CSI volume lifecycle on GKE nodes and stopping manageme",
    "properties": {
      "name": "elastic-csi-driver",
      "technology": "csi-driver",
      "role": "storage-driver"
    },
    "confidence": 87,
    "tags": [
      "entity",
      "service",
      "storage",
      "csi",
      "kubernetes"
    ]
  },
  {
    "id": "warpstream-agent",
    "uuid": "34a43659-03c8-558f-9610-ac69d28ed9b3",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Warpstream Agent",
    "description": "warpstream-agent is a distinct service running in the mis-warpstream-agent namespace that discovers agent IP addresses and executes stream-processing jobs such as compaction. The logs show it exposing",
    "properties": {
      "name": "warpstream-agent",
      "technology": "warpstream",
      "role": "streaming-agent"
    },
    "confidence": 87,
    "tags": [
      "entity",
      "service",
      "warpstream",
      "streaming",
      "kafka"
    ]
  },
  {
    "id": "okta-proxy",
    "uuid": "c7a55f90-76d4-562b-b687-7deb57dff4e1",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Okta Proxy",
    "description": "okta-proxy is a distinct service running in the infra-services namespace on GKE. The sampled application log shows it serving the partners.eden.elastic.dev domain through an infra-services-vouch-proxy",
    "properties": {
      "name": "okta-proxy",
      "technology": "vouch-proxy",
      "role": "access-proxy"
    },
    "confidence": 79,
    "tags": [
      "entity",
      "service",
      "proxy"
    ]
  },
  {
    "id": "inscricao-web",
    "uuid": "37141213-d923-56d8-bd95-8858bf470174",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "inscricao-web",
    "description": "inscricao-web is an upstream .NET service instrumented with Elastic APM .NET agent 1.34.1 and sending APM intake traffic to motel-ingest-collector. The service name and version 1.0.0 are explicit in t",
    "properties": {
      "name": "inscricao-web",
      "technology": "dotnet"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "dotnet",
      "apm"
    ]
  },
  {
    "id": "dmc-clear-user",
    "uuid": "d53d6f3d-6207-5cc5-945a-9adb1f76c1d9",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "dmc-clear-user",
    "description": "dmc-clear-user is an upstream Ruby service instrumented with elastic-apm-ruby 4.5.1 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicit in the Ruby APM user ",
    "properties": {
      "name": "dmc-clear-user",
      "technology": "ruby"
    },
    "confidence": 89,
    "tags": [
      "entity",
      "service",
      "ruby",
      "apm"
    ]
  },
  {
    "id": "sln-transaction-service",
    "uuid": "32cdb9c7-4f6d-546a-8213-86bb45dedb8a",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "sln-transaction-service",
    "description": "sln-transaction-service is an upstream Java service instrumented with Elastic APM Java agent 1.50.0 and sending APM intake traffic to motel-ingest-collector. The service name and application version 3",
    "properties": {
      "name": "sln-transaction-service",
      "technology": "java"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "java",
      "apm"
    ]
  },
  {
    "id": "opbeans-java",
    "uuid": "674f2528-5535-5462-95d0-60970ce56183",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "opbeans-java",
    "description": "opbeans-java is an upstream Java service instrumented with Elastic APM Java agent 1.52.1 and sending Elastic APM intake traffic to motel-ingest-collector. The logs explicitly identify the service name",
    "properties": {
      "name": "opbeans-java",
      "technology": "java"
    },
    "confidence": 93,
    "tags": [
      "entity",
      "service",
      "java",
      "apm"
    ]
  },
  {
    "id": "controlle-banking-integration",
    "uuid": "384d9e06-80ef-5c78-bef3-f892199fd808",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "controlle-banking-integration",
    "description": "controlle-banking-integration is an upstream Node.js service instrumented with Elastic APM Node.js agent 3.52.2 and sending Elastic APM intake traffic to motel-ingest-collector. The service name and v",
    "properties": {
      "name": "controlle-banking-integration",
      "technology": "nodejs"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "artifactory",
    "uuid": "441bf23d-14b5-5b30-b94a-d4466a4f0026",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Artifactory",
    "description": "Artifactory is a repository service running in the artifactory namespace as a StatefulSet-backed workload. The observed access log shows it serving Maven Central cached artifacts, indicating an active",
    "properties": {
      "name": "artifactory",
      "technology": "artifactory",
      "role": "artifact-repository"
    },
    "confidence": 88,
    "tags": [
      "entity",
      "service",
      "repository",
      "artifacts",
      "maven"
    ]
  },
  {
    "id": "ordereat-backend-api",
    "uuid": "8cf20358-be9d-584c-b0d0-f1cab57d74f9",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "OrderEAT Backend",
    "description": "OrderEAT_Backend_API is an upstream .NET service instrumented with Elastic APM .NET agent 1.31.0 and sending intake traffic to motel-ingest-collector. The logs explicitly expose the service name, prod",
    "properties": {
      "name": "OrderEAT_Backend_API",
      "technology": "dotnet"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "dotnet",
      "apm"
    ]
  },
  {
    "id": "ras-ops-bkg",
    "uuid": "671b8b33-fa3c-5ba0-8262-92842ce71235",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "RAS_OPS_BKG",
    "description": "RAS_OPS_BKG is an upstream .NET service instrumented with Elastic APM .NET agent 1.34.1 and sending Elastic APM intake traffic to motel-ingest-collector. The service name and application version 1.0.0",
    "properties": {
      "name": "RAS_OPS_BKG",
      "technology": "dotnet"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "dotnet",
      "apm"
    ]
  },
  {
    "id": "opbeans-dotnet",
    "uuid": "5b4b8925-69c7-5fe8-852e-601e9e00188e",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "opbeans-dotnet",
    "description": "opbeans-dotnet is an upstream .NET service instrumented with Elastic APM .NET agent 1.31.0 and sending Elastic APM intake traffic to motel-ingest-collector. The user agent explicitly names the service",
    "properties": {
      "name": "opbeans-dotnet",
      "technology": "dotnet"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "upstream",
      "dotnet",
      "apm"
    ]
  },
  {
    "id": "connect-client-v3-chattrtemplates-fs-1551",
    "uuid": "eb735455-7119-5701-973c-fd2d145a1cd1",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "connect-client-v3",
    "description": "connect-client-v3_ChattrTemplates_FS-1551 is an upstream Java service instrumented with Elastic APM Java agent 1.55.6 and sending intake traffic to motel-ingest-collector. The service name and applica",
    "properties": {
      "name": "connect-client-v3_ChattrTemplates_FS-1551",
      "technology": "java"
    },
    "confidence": 90,
    "tags": [
      "entity",
      "service",
      "upstream",
      "java",
      "apm"
    ]
  },
  {
    "id": "synthetics-tcp",
    "uuid": "e81f60f9-3ce7-5514-be3e-08f668ecf991",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "entity",
    "subtype": "service",
    "title": "Synthetics TCP",
    "description": "A TCP-oriented synthetics component is present under agentless in the hello world workload. The current sample adds another direct lifecycle transition showing the synthetics TCP unit moving from FAIL",
    "properties": {
      "name": "synthetics-tcp",
      "technology": "heartbeat"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "synthetics",
      "heartbeat"
    ]
  },
  {
    "id": "archive-csi-driver",
    "uuid": "ae467e91-fe4d-52ff-ba87-8acbdcc4e4b8",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Archive CSI Driver",
    "description": "archive-csi-driver is a Kubernetes node-side storage/log archival service running as a DaemonSet in the archive-csi-driver namespace. The logs show it managing volumes and uploaded Elasticsearch log f",
    "properties": {
      "name": "archive-csi-driver",
      "technology": "csi-driver",
      "role": "log-archive-storage"
    },
    "confidence": 94,
    "tags": [
      "entity",
      "service",
      "storage",
      "csi-driver",
      "archive"
    ]
  },
  {
    "id": "backstage-api-proxy",
    "uuid": "a75e402f-0782-5449-94e0-17de77f452c5",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "Backstage API Proxy",
    "description": "backstage-api-proxy is a Backstage-facing HTTP service in the backstage namespace serving catalog entity API requests. The logs show it as a deployed Kubernetes workload returning successful GET respo",
    "properties": {
      "name": "backstage-api-proxy",
      "role": "api-proxy"
    },
    "confidence": 91,
    "tags": [
      "entity",
      "service",
      "api",
      "proxy",
      "backstage"
    ]
  },
  {
    "id": "ea-ingress-nginx-controller",
    "uuid": "d5f03893-3e85-5922-958c-092f06ae3135",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "entity",
    "subtype": "service",
    "title": "EA Ingress NGINX",
    "description": "ea-ingress-nginx-controller is an ingress controller service running in the elastic-apps namespace. The logs show it as the ingress-nginx controller workload reporting Kubernetes Service endpoint stat",
    "properties": {
      "name": "ea-ingress-nginx-controller",
      "technology": "ingress-nginx",
      "role": "ingress-controller"
    },
    "confidence": 89,
    "tags": [
      "entity",
      "service",
      "ingress",
      "nginx"
    ]
  },
  {
    "id": "notification",
    "uuid": "064ec426-451c-589b-b202-3543c2d64636",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "notification",
    "description": "notification is an upstream Node.js service instrumented with Elastic APM Node.js agent 4.15.0 and sending Elastic APM intake traffic to motel-ingest-collector. The service name and application versio",
    "properties": {
      "name": "notification",
      "technology": "nodejs"
    },
    "confidence": 89,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "surl-admin",
    "uuid": "36ca35fc-ef69-5adb-9d89-e959a46450e8",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "surl-admin",
    "description": "surl-admin is an upstream Ruby service instrumented with elastic-apm-ruby 4.5.1 and sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicit in the Ruby APM user agen",
    "properties": {
      "name": "surl-admin",
      "technology": "ruby"
    },
    "confidence": 89,
    "tags": [
      "entity",
      "service",
      "ruby",
      "apm"
    ]
  },
  {
    "id": "insurance-api-uat",
    "uuid": "c054db05-9c27-5286-9aeb-5277094f73a2",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "insurance-api-uat",
    "description": "insurance-api-uat is an upstream Node.js service sending Elastic APM intake traffic to motel-ingest-collector. The logs explicitly expose the service name and a staging environment through the intake ",
    "properties": {
      "name": "insurance-api-uat",
      "technology": "nodejs"
    },
    "confidence": 96,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "unity-individuals",
    "uuid": "6b87b5e7-e27f-525a-8a31-e23d4ba6f3c9",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "unity_individuals",
    "description": "unity_individuals is an upstream .NET service sending Elastic APM intake traffic to motel-ingest-collector. The service name and application version 1.0.0 are explicit in the .NET APM user agent on th",
    "properties": {
      "name": "unity_individuals",
      "technology": "dotnet"
    },
    "confidence": 95,
    "tags": [
      "entity",
      "service",
      "dotnet",
      "apm"
    ]
  },
  {
    "id": "pricing-service",
    "uuid": "48047e10-d631-5b12-b59a-128c4a403c4d",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "pricing-service",
    "description": "pricing-service is an upstream Java service sending Elastic APM intake traffic to motel-ingest-collector. The service name is explicit in the Java APM user agent on the collector intake endpoint.",
    "properties": {
      "name": "pricing-service",
      "technology": "java"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "java",
      "apm"
    ]
  },
  {
    "id": "clientbook-meta-imports",
    "uuid": "1c606fb5-739f-5ad9-93ca-34f96401051c",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "clientbook-meta-imports",
    "description": "clientbook-meta-imports is an upstream Node.js service sending Elastic APM intake traffic to motel-ingest-collector. The service name and application version 1.0.1-11 are explicit in the Node.js APM u",
    "properties": {
      "name": "clientbook-meta-imports",
      "technology": "nodejs"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "nodejs",
      "apm"
    ]
  },
  {
    "id": "connect-service-snowflake",
    "uuid": "91ac876b-3d31-5cab-b4ee-1a9e6cfe893c",
    "stream_name": "logging-motel-ingest-collector",
    "type": "entity",
    "subtype": "service",
    "title": "connect-service_snowflake",
    "description": "connect-service_snowflake is an upstream Java service sending Elastic APM intake traffic to motel-ingest-collector. The service name and version 1.0.0 are explicit in the Java APM user agent on the co",
    "properties": {
      "name": "connect-service_snowflake",
      "technology": "java"
    },
    "confidence": 92,
    "tags": [
      "entity",
      "service",
      "java",
      "apm"
    ]
  },
  {
    "id": "motel-ingest-collector-to-kafka",
    "uuid": "42187aef-39c8-5f8d-b4ae-1d13a2cfc68a",
    "stream_name": "logging-managed-inputs",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "ingest → Kafka",
    "description": "motel-ingest-collector has an explicit Kafka dependency through its kafka/small exporter path for telemetry export. Current samples add another metrics-side metadata refresh with UNKNOWN_TOPIC_OR_PART",
    "properties": {
      "source": "motel-ingest-collector",
      "target": "kafka",
      "protocol": "kafka"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "kafka",
      "exporter",
      "export"
    ],
    "dependency_targets": [
      "kafka"
    ]
  },
  {
    "id": "connectors-to-elasticsearch",
    "uuid": "d5759268-b0e9-5b17-a3c8-c60728ab725f",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "connectors → Elasticsearch",
    "description": "The Connectors service depends on Elasticsearch indices for connector sync job execution. These samples explicitly show the connectors runtime calling the Elasticsearch async client and failing on a m",
    "properties": {
      "source": "connectors",
      "target": "elasticsearch",
      "protocol": "https"
    },
    "confidence": 86,
    "tags": [
      "dependency",
      "service",
      "elasticsearch",
      "python"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "httpjson-to-1password",
    "uuid": "00837621-60cc-5126-8b95-5b03adeca875",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "httpjson → 1Password",
    "description": "The HTTPJSON component integrates with the 1Password Events API over HTTPS. These samples add another direct endpoint association for the itemusages path, including explicit unauthorized request failu",
    "properties": {
      "source": "httpjson",
      "target": "1password",
      "protocol": "https"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "api",
      "https",
      "1password",
      "api_integration",
      "httpjson"
    ],
    "dependency_targets": [
      "1password"
    ]
  },
  {
    "id": "dmc-media-information-to-motel-ingest-collector",
    "uuid": "bc60632c-04df-52cc-af1c-f56605a73329",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "dmc-media-information → collector",
    "description": "dmc-media-information has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The Ruby APM user agent identifies the upstream service and the intake path identif",
    "properties": {
      "source": "dmc-media-information",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 94,
    "tags": [
      "dependency",
      "http",
      "elastic-apm",
      "ruby"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "elastic-operator-to-motel-ingest-collector",
    "uuid": "b86c469e-465b-53bf-bd1c-c7848b052ee3",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "elastic-operator → collector",
    "description": "elastic-operator has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Go APM user agent identifies the upstream workload and the intake path identifies the re",
    "properties": {
      "source": "elastic-operator",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "elastic-apm",
      "go"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "cloudbeat-to-gcp-compute",
    "uuid": "3a6d6ec0-8c7d-5bd6-973d-d7ce3d58e8fa",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cloudbeat → GCP Compute",
    "description": "The Cloudbeat CSPM workload explicitly interacts with Google Compute Engine resources as part of cis_gcp posture collection. The samples show cloud-compute resources identified from compute.googleapis",
    "properties": {
      "source": "cloudbeat",
      "target": "gcp-compute",
      "protocol": "https"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "api",
      "gcp",
      "compute"
    ],
    "dependency_targets": [
      "gcp-compute"
    ]
  },
  {
    "id": "kibana-to-motel-ingest-collector",
    "uuid": "2f9704e9-ae9c-54ff-9ed2-1312fe9f86f7",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "kibana → motel-ingest-collector",
    "description": "Kibana is explicitly sending Elastic APM intake traffic to motel-ingest-collector over HTTP. This sample adds new evidence for 9.3.8-SNAPSHOT, 9.5.0-SNAPSHOT, and 9.6.0-SNAPSHOT builds targeting the c",
    "properties": {
      "source": "kibana",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "http",
      "apm",
      "nodejs"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "eportal-apm2-to-motel-ingest-collector",
    "uuid": "a50de0ef-94a6-5cdd-a2d5-a5197967e2ce",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Eportal-APM2 → collector",
    "description": "Eportal-APM2 has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The PHP APM user agent identifies the upstream service and the intake path identifies the re",
    "properties": {
      "source": "Eportal-APM2",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "httpjson-to-m365-defender",
    "uuid": "1e56db2c-5f4f-5b75-944e-c3ab754b251f",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "httpjson → M365 Defender",
    "description": "The HTTPJSON component integrates with the Microsoft Graph Security incidents API over HTTPS for Microsoft 365 Defender collection. The logs explicitly show the incidents endpoint together with HTTPJS",
    "properties": {
      "source": "httpjson",
      "target": "m365-defender",
      "protocol": "https"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "api",
      "https",
      "m365_defender"
    ],
    "dependency_targets": [
      "m365-defender"
    ]
  },
  {
    "id": "dmc-image-delete-to-motel-ingest-collector",
    "uuid": "7a6969d1-da0c-5252-b29e-80af9b657f52",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "dmc-image-delete → collector",
    "description": "dmc-image-delete has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The query parameter and Ruby APM user agent directly identify the upstream service and i",
    "properties": {
      "source": "dmc-image-delete",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "market4u-socket-api-to-motel-ingest-collector",
    "uuid": "773b05cd-e94f-50b1-b1d8-25fb665bd7b7",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "market4u-socket-api → collector",
    "description": "market4u-socket-api has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The Node.js APM user agent and root intake query parameter directly identify the upst",
    "properties": {
      "source": "market4u-socket-api",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "dmc-external-get-to-motel-ingest-collector",
    "uuid": "3de4f379-8ab6-5a2a-8cd6-35d162fcbcaa",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "dmc-external-get → collector",
    "description": "dmc-external-get has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The root intake query parameter and Ruby APM user agent directly identify the upstream s",
    "properties": {
      "source": "dmc-external-get",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 94,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "motel-index-collector-to-elasticsearch",
    "uuid": "45d5fff9-a0af-517e-acb5-080eff468d41",
    "stream_name": "logging-managed-inputs",
    "type": "dependency",
    "subtype": "database_connection",
    "title": "index → Elasticsearch",
    "description": "motel-index-collector has an explicit Elasticsearch dependency through its exporter path. Current samples add a metrics indexing failure with Elasticsearch version-conflict errors on a data stream bac",
    "properties": {
      "source": "motel-index-collector",
      "target": "elasticsearch",
      "protocol": "elasticsearch"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "elasticsearch",
      "exporter",
      "indexing"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "motel-index-collector-to-kafka",
    "uuid": "8de2bec6-42aa-532c-b4c9-9e5295c467fb",
    "stream_name": "logging-managed-inputs",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "index → Kafka",
    "description": "motel-index-collector has an explicit Kafka dependency via its kafka receiver. Current samples add more direct consumer-group lifecycle evidence for logs, including new group-session creation and coop",
    "properties": {
      "source": "motel-index-collector",
      "target": "kafka",
      "protocol": "kafka"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "kafka",
      "service_dependency"
    ],
    "dependency_targets": [
      "kafka"
    ]
  },
  {
    "id": "motel-aggregation-collector-to-kafka",
    "uuid": "5e4d92c2-d405-55aa-8f6d-0158d7264577",
    "stream_name": "logging-managed-inputs",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "aggregation → Kafka",
    "description": "motel-aggregation-collector has an explicit Kafka dependency through its kafka receiver path. Current samples add log-signal consumer group rebalance evidence, strengthening the existing picture of Ka",
    "properties": {
      "source": "motel-aggregation-collector",
      "target": "kafka",
      "protocol": "kafka"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "kafka",
      "service_dependency",
      "receiver"
    ],
    "dependency_targets": [
      "kafka"
    ]
  },
  {
    "id": "kibana-to-es-es-search",
    "uuid": "1c3836e5-0cf7-5d36-aafd-741443e26584",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Kibana → ES search",
    "description": "Kibana depends on the Elasticsearch search tier over HTTP through the ingress proxy for security, document fetch, routing, and task-manager search operations. This sample adds more explicit routed req",
    "properties": {
      "source": "kibana",
      "target": "es-es-search",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "kibana",
      "elasticsearch"
    ],
    "dependency_targets": [
      "es-es-search"
    ]
  },
  {
    "id": "metricbeat-to-es-es-search",
    "uuid": "86da35cb-7a27-55f6-ad8a-b7f8e6bc2205",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Metricbeat → ES search",
    "description": "Metricbeat depends on the Elasticsearch search tier over HTTP through the ingress proxy for read and cluster-inspection operations. This sample adds an explicit _cat request from Metricbeat 9.3.7 rout",
    "properties": {
      "source": "metricbeat",
      "target": "es-es-search",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "metricbeat",
      "elasticsearch"
    ],
    "dependency_targets": [
      "es-es-search"
    ]
  },
  {
    "id": "kibana-to-es-es-index",
    "uuid": "46715499-745c-5889-9458-500fc04cb324",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Kibana → ES index",
    "description": "Kibana depends on the Elasticsearch index tier over HTTP through the ingress proxy for task-manager bulk writes. This sample adds explicit Kibana 9.6.0 bulk traffic routed to an es-es-index backend.",
    "properties": {
      "source": "kibana",
      "target": "es-es-index",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "kibana",
      "elasticsearch"
    ],
    "dependency_targets": [
      "es-es-index"
    ]
  },
  {
    "id": "apm-agent-nodejs-to-motel-ingest-collector",
    "uuid": "e46b924f-5181-5786-8cf2-f674ecd72599",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Node APM → motel-ingest-collector",
    "description": "A Node.js APM agent has an explicit HTTP dependency on the motel-ingest-collector service for APM intake. The sample shows external compressed intake traffic accepted through the ingress proxy and rou",
    "properties": {
      "source": "apm-agent-nodejs",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "proxy-to-es-es-search",
    "uuid": "9bc6b19e-84e1-5152-ae69-3b80451968b0",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "proxy → ES search",
    "description": "Ingress proxy forwards HTTPS traffic to Elasticsearch search-tier backends over HTTP/1.1. This sample adds additional routed search, security, task-manager, telemetry, Metricbeat, and nodes requests a",
    "properties": {
      "source": "proxy",
      "target": "es-es-search",
      "protocol": "http"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "http",
      "proxy",
      "elasticsearch"
    ],
    "dependency_targets": [
      "es-es-search"
    ]
  },
  {
    "id": "usage-api-to-kafka",
    "uuid": "752b757e-e959-5716-85a9-c5b317747b01",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "usage-api → Kafka",
    "description": "usage-api has an explicit Kafka dependency for producing usage records. The logs show the service writing a Kafka Produce v10 request through franz-go to a broker.",
    "properties": {
      "source": "usage-api",
      "target": "kafka",
      "protocol": "kafka"
    },
    "confidence": 84,
    "tags": [
      "dependency",
      "kafka",
      "usage-api"
    ],
    "dependency_targets": [
      "kafka"
    ]
  },
  {
    "id": "kibana-to-agentless-api",
    "uuid": "27887310-d49a-566a-b24b-2352581c85ca",
    "stream_name": "logging-gcp-us-central1-logs-agentless-api-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "Kibana → Agentless API",
    "description": "Kibana is explicitly observed calling Agentless API over HTTPS with mutual TLS for the serverless deployments API. These samples add direct evidence that the same integration continues across producti",
    "properties": {
      "source": "kibana",
      "target": "agentless-api",
      "protocol": "https"
    },
    "confidence": 96,
    "tags": [
      "dependency",
      "https",
      "mtls",
      "kibana",
      "serverless",
      "api_integration"
    ],
    "dependency_targets": [
      "agentless-api"
    ]
  },
  {
    "id": "api-market4u-mobile-to-motel-ingest-collector",
    "uuid": "d132e6d3-81f8-52d3-aecc-8fa2ca5aae96",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "api-market4u-mobile → collector",
    "description": "api-market4u-mobile has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Node.js APM user agent identifies the upstream service and the intake endpoint identi",
    "properties": {
      "source": "api-market4u-mobile",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 95,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "fbp-tournament-signup-ms-to-motel-ingest-collector",
    "uuid": "16e0876f-dc32-5174-bebf-71d668056d20",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "fbp-tournament-signup-ms → collector",
    "description": "fbp-tournament-signup-ms has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The Node.js APM user agent identifies the upstream service and the intake path i",
    "properties": {
      "source": "fbp-tournament-signup-ms",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "apm-aws-lambda-to-motel-ingest-collector",
    "uuid": "2c1124ca-2b43-57fa-b359-52667078aced",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Lambda APM → collector",
    "description": "An AWS Lambda Elastic APM client has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The user agent identifies the Lambda APM producer type, but the sample d",
    "properties": {
      "source": "apm-aws-lambda",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 75,
    "tags": [
      "dependency",
      "http",
      "apm",
      "inferred"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "httpjson-to-sentinelone",
    "uuid": "11cb181b-98b0-5919-9660-771e55403cdd",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "httpjson → SentinelOne",
    "description": "The HTTPJSON component integrates with SentinelOne over HTTPS. These samples add another direct endpoint variant for the SentinelOne activities API under the SentinelOne package workload.",
    "properties": {
      "source": "httpjson",
      "target": "sentinelone",
      "protocol": "https"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "api",
      "https"
    ],
    "dependency_targets": [
      "sentinelone"
    ]
  },
  {
    "id": "cloudbeat-to-gcp-bigquery",
    "uuid": "41c5118f-2a7f-59af-9586-1250e5504515",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cloudbeat → BigQuery",
    "description": "The Cloudbeat CSPM workload explicitly interacts with Google BigQuery resources as part of GCP posture collection. The sampled logs show Cloudbeat discovering multiple BigQuery table resources classif",
    "properties": {
      "source": "cloudbeat",
      "target": "gcp-bigquery",
      "protocol": "https"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "api",
      "gcp",
      "bigquery",
      "cspm"
    ],
    "dependency_targets": [
      "gcp-bigquery"
    ]
  },
  {
    "id": "cloudbeat-to-gcp-logging",
    "uuid": "be664527-6e7f-5045-99a5-1cc48b2cb9be",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cloudbeat → GCP Logging",
    "description": "The Cloudbeat cis_gcp CSPM workload explicitly interacts with Google Cloud Logging resource types as part of posture collection. Current samples show fetching GCP LogSink resources under logging.googl",
    "properties": {
      "source": "cloudbeat",
      "target": "gcp-logging",
      "protocol": "https"
    },
    "confidence": 86,
    "tags": [
      "dependency",
      "api",
      "gcp",
      "logging"
    ],
    "dependency_targets": [
      "gcp-logging"
    ]
  },
  {
    "id": "cloudbeat-to-gcp-storage",
    "uuid": "ca247209-9f05-500a-a551-7b3eeaffc30d",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cloudbeat → GCP Storage",
    "description": "The Cloudbeat cis_gcp CSPM workload explicitly interacts with Google Cloud Storage resources as part of posture collection. Current samples show cloud-storage resources identified by storage.googleapi",
    "properties": {
      "source": "cloudbeat",
      "target": "gcp-storage",
      "protocol": "https"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "api",
      "gcp",
      "storage"
    ],
    "dependency_targets": [
      "gcp-storage"
    ]
  },
  {
    "id": "httpjson-to-github",
    "uuid": "b1ba9c36-54b7-5900-9861-09f43e65312f",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "httpjson → GitHub",
    "description": "The HTTPJSON component integrates with the GitHub API over HTTPS. These samples add direct evidence of a GitHub organization audit log endpoint together with repeated request processing under the GitH",
    "properties": {
      "source": "httpjson",
      "target": "github",
      "protocol": "https"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "api",
      "https",
      "github"
    ],
    "dependency_targets": [
      "github"
    ]
  },
  {
    "id": "pay2-server-to-motel-ingest-collector",
    "uuid": "6d9491ce-0c3a-5718-afc8-c2ca25333a40",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "pay2-server → collector",
    "description": "pay2-server has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake traffic. The PHP APM user agent identifies the upstream service and the /intake/v2/events path identifies t",
    "properties": {
      "source": "pay2-server",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 83,
    "tags": [
      "dependency",
      "http",
      "apm",
      "php"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "travel-service-to-motel-ingest-collector",
    "uuid": "ceff8f4f-6211-5e7f-ab73-cf01904ba427",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "travel-service → collector",
    "description": "travel-service has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Node.js APM user agent identifies the upstream service and the intake path identifies the ",
    "properties": {
      "source": "travel-service",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 94,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "entry-admin-to-motel-ingest-collector",
    "uuid": "7ea52664-3740-5747-bf42-76e744f9dd19",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "entry-admin → collector",
    "description": "entry-admin has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake traffic. The Ruby APM user agent names the upstream service directly while the request path identifies ",
    "properties": {
      "source": "entry-admin",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "srv-ts-document-api-to-motel-ingest-collector",
    "uuid": "09754ba8-8ac0-5664-9702-4be2df0db704",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "srv-ts-document-api → collector",
    "description": "srv-ts-document-api has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The Node.js APM user agent identifies the upstream service and the intake path identi",
    "properties": {
      "source": "srv-ts-document-api",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "artifact-client-to-docker-registry",
    "uuid": "aad8a416-c91d-553e-b491-4682f6feba2f",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Client → Registry",
    "description": "External clients fetch artifacts from the Docker Registry over HTTP(S) on docker.elastic.co. The sample shows both Go HTTP client and cosign/go-containerregistry-based access to registry content, conf",
    "properties": {
      "source": "artifact-client",
      "target": "docker-registry",
      "protocol": "http"
    },
    "confidence": 83,
    "tags": [
      "dependency",
      "http",
      "registry"
    ],
    "dependency_targets": [
      "docker-registry"
    ]
  },
  {
    "id": "proxy-to-es-es-index",
    "uuid": "f1eecacd-ecfc-5d67-a533-039cc3aa8ae1",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "proxy → ES index",
    "description": "Ingress proxy forwards internal HTTPS write traffic to Elasticsearch index-tier backends over HTTP/1.1. This sample adds explicit Kibana update traffic routed to es-es-index pods in us-central1-c.",
    "properties": {
      "source": "proxy",
      "target": "es-es-index",
      "protocol": "http"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "http",
      "proxy",
      "elasticsearch"
    ],
    "dependency_targets": [
      "es-es-index"
    ]
  },
  {
    "id": "fleet-server-to-es-es-search",
    "uuid": "eaadeedb-2ad7-5318-a828-c2ec32d3a551",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Fleet Server → ES search",
    "description": "Fleet Server depends on the Elasticsearch search tier over HTTP(S) through the ingress proxy. The observed request is an internal multi-search call routed to an es-es-search backend in a security proj",
    "properties": {
      "source": "fleet-server",
      "target": "es-es-search",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "elasticsearch",
      "search",
      "fleet-server"
    ],
    "dependency_targets": [
      "es-es-search"
    ]
  },
  {
    "id": "falcosidekick-to-es-es-index",
    "uuid": "58246c2f-7a1f-5711-af92-ea3c36650b11",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Falcosidekick → ES index",
    "description": "Falcosidekick has an explicit HTTP bulk-ingest dependency on the Elasticsearch index tier through the ingress proxy. The observed request is external traffic routed by the proxy to an es-es-index back",
    "properties": {
      "source": "falcosidekick",
      "target": "es-es-index",
      "protocol": "http"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "http",
      "ingest",
      "security"
    ],
    "dependency_targets": [
      "es-es-index"
    ]
  },
  {
    "id": "cloudbeat-to-gcp-monitoring",
    "uuid": "01ee730e-68ba-5236-a436-3bc351eb010d",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cloudbeat → GCP Monitoring",
    "description": "The Cloudbeat CSPM workload explicitly interacts with Google Cloud Monitoring resource inventory during posture collection. The logs show Cloudbeat listing AlertPolicy assets from the monitoring.googl",
    "properties": {
      "source": "cloudbeat",
      "target": "gcp-monitoring",
      "protocol": "https"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "api",
      "gcp",
      "cloudbeat",
      "cspm"
    ],
    "dependency_targets": [
      "gcp-monitoring"
    ]
  },
  {
    "id": "avendrepay-avendrepay-backoffice-to-motel-ingest-collector",
    "uuid": "8c8f12e3-c60a-5b99-8ddd-f0b8a9a22d1f",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "AVENDREPAY Backoffice → collector",
    "description": "AVENDREPAY-AVENDREPAY-BACKOFFICE has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The Node.js APM user agent identifies the upstream service and the intak",
    "properties": {
      "source": "AVENDREPAY-AVENDREPAY-BACKOFFICE",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "apm",
      "nodejs"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "sln-fraud-detection-service-to-motel-ingest-collector",
    "uuid": "a79886b6-b6d9-566a-9742-c2f320122ebc",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "sln-fraud-detection-service → collector",
    "description": "sln-fraud-detection-service has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Python APM user agent identifies the upstream service and the intake path ide",
    "properties": {
      "source": "sln-fraud-detection-service",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "apm",
      "python"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "bet-track-pages-ssr-to-motel-ingest-collector",
    "uuid": "0e85377a-4307-5c36-9abb-6c967cd6c408",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "bet-track-pages-ssr → collector",
    "description": "bet-track-pages-ssr has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Node.js APM user agent identifies the upstream service and the intake endpoint identi",
    "properties": {
      "source": "bet-track-pages-ssr",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "apm",
      "nodejs"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "nar-es-stream-to-motel-ingest-collector",
    "uuid": "b2c6bccf-b455-53f2-9f1a-b646bf61bebe",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "nar-es-stream → collector",
    "description": "nar-es-stream has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake traffic. The Python APM user agent identifies the upstream service and the root intake path shows the",
    "properties": {
      "source": "nar-es-stream",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "apm",
      "python"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "inscricao-concurso-to-motel-ingest-collector",
    "uuid": "1b6188f2-2f71-5f77-88cc-c684c1fdc134",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "inscricao-concurso → collector",
    "description": "inscricao-concurso has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The .NET APM user agent directly identifies the upstream service and the intake path i",
    "properties": {
      "source": "inscricao-concurso",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "controlle-audit-to-motel-ingest-collector",
    "uuid": "6511caa1-88ca-5b2e-8899-768a534693f2",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "controlle-audit → collector",
    "description": "controlle-audit has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The root intake query parameter and Node.js APM user agent directly identify the upstream",
    "properties": {
      "source": "controlle-audit",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 95,
    "tags": [
      "dependency",
      "http",
      "elastic-apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "srs-apirecharge-live-59-to-motel-ingest-collector",
    "uuid": "3730224f-dd81-53c4-8273-98f1397e147b",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "SRS_APIRecharge → collector",
    "description": "SRS_APIRecharge_Live_59 has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The .NET APM user agent identifies the upstream service name variant and the inta",
    "properties": {
      "source": "SRS_APIRecharge_Live_59",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "http",
      "apm",
      "dotnet"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "motel-ingest-collector-to-internal-ingress-proxy",
    "uuid": "0463ade5-1cb8-5388-a91a-3f28b674114e",
    "stream_name": "logging-managed-inputs",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "ingest → ingress proxy",
    "description": "motel-ingest-collector explicitly uses an internal ingress or reverse-proxy path for handling HTTP intake traffic. Current samples add another GCP us-central1-a reverse-proxy failure on the APM intake",
    "properties": {
      "source": "motel-ingest-collector",
      "target": "internal-ingress-proxy",
      "protocol": "http"
    },
    "confidence": 84,
    "tags": [
      "dependency",
      "http",
      "ingress",
      "reverse-proxy"
    ],
    "dependency_targets": [
      "internal-ingress-proxy"
    ]
  },
  {
    "id": "elasticsearch-py-to-es-es-search",
    "uuid": "37650c6d-59f1-5dd4-907c-bdeb05c1432b",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "elasticsearch-py → ES search",
    "description": "An external application using the Python Elasticsearch client accesses the Elasticsearch search tier over HTTP(S) through the ingress proxy. The request shown is routed to an es-es-search backend usin",
    "properties": {
      "source": "elasticsearch-py",
      "target": "es-es-search",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "python",
      "elasticsearch"
    ],
    "dependency_targets": [
      "es-es-search"
    ]
  },
  {
    "id": "srs-apirecharge-live-53-to-motel-ingest-collector",
    "uuid": "3730224f-dd81-53c4-8273-98f1397e147b",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "SRS_APIRecharge_Live_53 → collector",
    "description": "SRS_APIRecharge_Live_53 has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake traffic. The .NET APM user agent identifies the upstream service and the intake path identifies",
    "properties": {
      "source": "SRS_APIRecharge_Live_53",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "http",
      "elastic-apm",
      "dotnet"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "vuuklecore-to-motel-ingest-collector",
    "uuid": "cd91b671-f7ee-51a8-a66c-53842b0c757e",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "VuukleCore → collector",
    "description": "VuukleCore has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The .NET APM user agent names the upstream service directly and the intake path identifies the col",
    "properties": {
      "source": "VuukleCore",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "http",
      "elastic-apm",
      "dotnet"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "zon-es-stream-to-motel-ingest-collector",
    "uuid": "eeb817fe-77b1-57f8-a048-d363359f3a7a",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "zon-es-stream → collector",
    "description": "zon-es-stream has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Python APM user agent identifies the upstream service and the intake path identifies the re",
    "properties": {
      "source": "zon-es-stream",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "http",
      "elastic-apm",
      "python"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "booking-to-motel-ingest-collector",
    "uuid": "c755ff19-3484-5bb4-9274-9daee9fafa5b",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "booking → collector",
    "description": "booking has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake traffic. The Node.js APM user agent identifies the upstream service and the intake endpoint identifies the rece",
    "properties": {
      "source": "booking",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm",
      "nodejs"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "payment-to-motel-ingest-collector",
    "uuid": "423d6877-a6cd-54b0-a2f0-b64dc050a172",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "payment → collector",
    "description": "payment has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The service is directly identified by the query parameter and Node.js APM user agent.",
    "properties": {
      "source": "payment",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "surl-api-to-motel-ingest-collector",
    "uuid": "3ac3ec00-d966-5e68-92a7-a4e1a23f0810",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "surl-api → collector",
    "description": "surl-api has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Ruby APM user agent and query parameter service.name directly identify the upstream workload and",
    "properties": {
      "source": "surl-api",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "optimus-api-to-motel-ingest-collector",
    "uuid": "bca2fb99-adcd-5021-b938-84a5259cd0dc",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "optimus-api → collector",
    "description": "optimus-api has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The query parameter and Node.js APM user agent directly identify the upstream service and des",
    "properties": {
      "source": "optimus-api",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 87,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "functional-tests-to-motel-ingest-collector",
    "uuid": "7da2dd2a-c0e9-50ab-a9bd-eb14a6ad68e0",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "functional-tests → motel-ingest-collector",
    "description": "functional-tests is explicitly sending Elastic APM intake traffic to motel-ingest-collector over HTTP. The sample reinforces the CI environment and shows requests hitting both root-style and /intake/v",
    "properties": {
      "source": "functional-tests",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "http",
      "apm",
      "nodejs"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "flight-worker-to-motel-ingest-collector",
    "uuid": "0653bc61-b876-53a3-9709-439be213ed2b",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "flight-worker → collector",
    "description": "flight-worker has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Node.js APM user agent names the upstream service and the intake path identifies the receiv",
    "properties": {
      "source": "flight-worker",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "apm",
      "nodejs"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "srv-ts-auth-api-to-motel-ingest-collector",
    "uuid": "07b23b6f-a2fc-5d05-b672-e97131df894a",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "srv-ts-auth-api → collector",
    "description": "srv-ts-auth-api has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The Node.js APM user agent identifies the upstream service and the intake path identifies",
    "properties": {
      "source": "srv-ts-auth-api",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "apm",
      "nodejs"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "cloudbeat-to-elasticsearch",
    "uuid": "dd4b6603-c7bb-548b-b150-366d2c007c3a",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "cloudbeat → Elasticsearch",
    "description": "The Cloudbeat CSPM workload connects to an internal Elasticsearch endpoint over HTTPS for output. The sample explicitly prints the Elasticsearch URL from the Cloudbeat elasticsearch client, making the",
    "properties": {
      "source": "cloudbeat",
      "target": "elasticsearch",
      "protocol": "https"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "https",
      "elasticsearch",
      "cloudbeat"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "cel-to-virustotal",
    "uuid": "edf22da7-1319-5000-89ca-7dd661d3ff08",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cel → VirusTotal",
    "description": "The CEL input integrates with the VirusTotal API for Google Threat Intelligence collection. Monitoring fields explicitly track batch processing and HTTP timings against www.virustotal.com for the phis",
    "properties": {
      "source": "cel",
      "target": "virustotal",
      "protocol": "https"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "api",
      "https",
      "virustotal"
    ],
    "dependency_targets": [
      "virustotal"
    ]
  },
  {
    "id": "httpjson-to-okta",
    "uuid": "e354cc07-69f6-50a9-a1b2-5b2ecfec6589",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "httpjson → Okta API",
    "description": "The HTTPJSON component integrates with the Okta logs API over HTTPS for system log collection. This sample adds another direct tenant-specific endpoint and ongoing repeated request processing under th",
    "properties": {
      "source": "httpjson",
      "target": "okta",
      "protocol": "https"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "https",
      "api",
      "okta",
      "httpjson"
    ],
    "dependency_targets": [
      "okta"
    ]
  },
  {
    "id": "cel-to-elasticsearch",
    "uuid": "6dad1eb1-3b0f-52ed-8099-3a469aac0eda",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "cel → Elasticsearch state",
    "description": "CEL workloads use Elasticsearch-backed state storage for registry and cursor cleanup. The samples explicitly show 404 Not Found responses while removing entries from package-specific agentless-state i",
    "properties": {
      "source": "cel",
      "target": "elasticsearch",
      "protocol": "https"
    },
    "confidence": 84,
    "tags": [
      "dependency",
      "elasticsearch",
      "state-store"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "agentless-hello-world-to-elasticsearch",
    "uuid": "4856d0d0-5a16-5b60-ae3c-26927de5b1d0",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "hello world → Elasticsearch",
    "description": "The agentless hello world workload connects to an internal Elasticsearch endpoint over HTTPS through an elasticsearch_storage extension. The sample explicitly prints the Elasticsearch URL while the wo",
    "properties": {
      "source": "agentless_hello_world",
      "target": "elasticsearch",
      "protocol": "https"
    },
    "confidence": 94,
    "tags": [
      "dependency",
      "elasticsearch",
      "https",
      "agentless_hello_world"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "log-to-elasticsearch",
    "uuid": "66a3979f-dc7b-5c93-b9af-e156135bb9e7",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "log → Elasticsearch",
    "description": "The log input component depends on an internal Elasticsearch-backed output over HTTPS. The current samples explicitly identify the log component and show it being configured under the internal default",
    "properties": {
      "source": "log",
      "target": "elasticsearch",
      "protocol": "https"
    },
    "confidence": 72,
    "tags": [
      "dependency",
      "elasticsearch",
      "https",
      "inferred"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "cel-to-o365",
    "uuid": "8de07ec0-2ff9-5372-b9e8-f2233e21ef57",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cel → O365",
    "description": "The CEL input integrates with the Microsoft Office 365 Management API over HTTPS for O365 audit collection. Monitoring metrics explicitly reference the manage.office.com endpoint on an o365 CEL worklo",
    "properties": {
      "source": "cel",
      "target": "o365",
      "protocol": "https"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "api",
      "https",
      "o365"
    ],
    "dependency_targets": [
      "o365"
    ]
  },
  {
    "id": "cloudbeat-to-gcp",
    "uuid": "89cba45f-86e8-5733-ba97-5ec5556eb0a1",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cloudbeat → GCP API",
    "description": "The Cloudbeat cis_gcp CSPM workload explicitly depends on GCP APIs for posture collection. The logs show a startup failure during GCP configuration initialization with invalid credentials JSON, direct",
    "properties": {
      "source": "cloudbeat",
      "target": "gcp",
      "protocol": "https"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "api",
      "gcp",
      "cloudbeat"
    ],
    "dependency_targets": [
      "gcp"
    ]
  },
  {
    "id": "cloudbeat-to-aws",
    "uuid": "5d4b9050-3d3a-5bb6-9150-c46bdffb9f49",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cloudbeat → AWS APIs",
    "description": "The Cloudbeat CSPM workload depends on AWS APIs for posture discovery. The logs explicitly show a cis_aws Cloudbeat component handling an AWS RDS resource ARN, confirming AWS resource collection.",
    "properties": {
      "source": "cloudbeat",
      "target": "aws",
      "protocol": "https"
    },
    "confidence": 80,
    "tags": [
      "dependency",
      "api",
      "aws",
      "cspm"
    ],
    "dependency_targets": [
      "aws"
    ]
  },
  {
    "id": "connectors-to-confluence",
    "uuid": "fa613caa-7ab8-5d69-9c60-df694b737693",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "connectors → Confluence",
    "description": "The connectors service integrates with Atlassian Confluence through its Python Confluence client during remote configuration validation. The sampled error shows the connectors runtime invoking Conflue",
    "properties": {
      "source": "connectors",
      "target": "confluence",
      "protocol": "https"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "api",
      "confluence",
      "python"
    ],
    "dependency_targets": [
      "confluence"
    ]
  },
  {
    "id": "cloudbeat-to-gcp-serviceusage",
    "uuid": "342833c1-297b-5415-b0bd-9b3cdf59357f",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cloudbeat → GCP Service Usage",
    "description": "The Cloudbeat CSPM workload explicitly interacts with GCP Service Usage data as part of cis_gcp posture collection. These samples add direct monitoring resource activity for a gcp-service-usage asset ",
    "properties": {
      "source": "cloudbeat",
      "target": "gcp-serviceusage",
      "protocol": "https"
    },
    "confidence": 82,
    "tags": [
      "dependency",
      "api",
      "gcp",
      "serviceusage"
    ],
    "dependency_targets": [
      "gcp-serviceusage"
    ]
  },
  {
    "id": "cloudbeat-to-agentless",
    "uuid": "f7aac4c4-dd4c-5391-b88e-488fc136531f",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "cloudbeat → agentless",
    "description": "The Cloudbeat CSPM workload is explicitly supervised by the parent agentless runtime. The sampled logs show Cloudbeat component lifecycle and state transitions while service.name remains agentless, ma",
    "properties": {
      "source": "cloudbeat",
      "target": "agentless",
      "protocol": "internal"
    },
    "confidence": 87,
    "tags": [
      "dependency",
      "service",
      "management",
      "cloudbeat",
      "elastic-agent",
      "internal",
      "agentless"
    ],
    "dependency_targets": [
      "agentless"
    ]
  },
  {
    "id": "cel-to-cisco-duo",
    "uuid": "948af239-90ce-5a06-8e1f-2057c50d3c9d",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cel → Cisco Duo",
    "description": "The CEL input integrates with Cisco Duo over HTTPS for authentication log collection. These samples add direct request-evaluation failure evidence against the Duo admin authentication logs path on a C",
    "properties": {
      "source": "cel",
      "target": "cisco-duo",
      "protocol": "https"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "api",
      "cel",
      "cisco_duo",
      "https",
      "cisco-duo"
    ],
    "dependency_targets": [
      "cisco-duo"
    ]
  },
  {
    "id": "gcp-pubsubbeat-to-elasticsearch",
    "uuid": "e18f5fca-025d-528c-91f9-5149942d4aa4",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Pubsubbeat → Elasticsearch",
    "description": "Pubsubbeat depends on Elasticsearch for indexing ingested events. The current sample explicitly shows repeated indexing attempts failing with an Elasticsearch validation exception because the cluster ",
    "properties": {
      "source": "gcp-pubsubbeat",
      "target": "elasticsearch",
      "protocol": "http"
    },
    "confidence": 76,
    "tags": [
      "dependency",
      "http",
      "elasticsearch",
      "beats"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "usage-shipper-to-kafka",
    "uuid": "6ea8372a-50e2-569f-b93a-aa0c0b0fe084",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "usage-shipper → Kafka",
    "description": "usage-shipper is configured to use a Google Managed Kafka bootstrap endpoint on port 9092. This indicates an explicit messaging dependency for usage-data transport in addition to its Firehose batching",
    "properties": {
      "source": "usage-shipper",
      "target": "kafka",
      "protocol": "kafka"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "kafka",
      "managed-kafka"
    ],
    "dependency_targets": [
      "kafka"
    ]
  },
  {
    "id": "autoops-to-elasticsearch",
    "uuid": "6fae7332-bb8c-5310-9eb0-effc5eb31f60",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "autoops → Elasticsearch",
    "description": "AutoOps depends on an internal Elasticsearch endpoint identified by a project-scoped .es.us-central1.gcp.internal.elastic.cloud hostname. The observed failure is at DNS resolution time, but it explici",
    "properties": {
      "source": "autoops",
      "target": "elasticsearch",
      "protocol": "http"
    },
    "confidence": 85,
    "tags": [
      "dependency",
      "elasticsearch",
      "dns"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "httpjson-to-aws-guardduty",
    "uuid": "b756c550-786a-5c5b-a497-7838ea24deea",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "httpjson → AWS GuardDuty",
    "description": "The HTTPJSON component integrates with the AWS GuardDuty findings API over HTTPS. The logs show a concrete GuardDuty detector findings endpoint together with HTTPJSON component metadata and AWS packag",
    "properties": {
      "source": "httpjson",
      "target": "aws-guardduty",
      "protocol": "https"
    },
    "confidence": 94,
    "tags": [
      "dependency",
      "api",
      "httpjson",
      "aws",
      "guardduty"
    ],
    "dependency_targets": [
      "aws-guardduty"
    ]
  },
  {
    "id": "httpjson-to-google-workspace",
    "uuid": "be52f712-bc91-5106-8d2d-5e6b43696dd9",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "httpjson → Google Workspace",
    "description": "The HTTPJSON component integrates with the Google Workspace Alert Center API over HTTPS. The logs show a concrete alertcenter.googleapis.com endpoint together with HTTPJSON runtime activity and Google",
    "properties": {
      "source": "httpjson",
      "target": "google-workspace",
      "protocol": "https"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "api",
      "https",
      "google-workspace"
    ],
    "dependency_targets": [
      "google-workspace"
    ]
  },
  {
    "id": "opentelemetry-collector-to-es-es-index",
    "uuid": "0086db0f-571c-53b5-8b13-2e35e32b8803",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "OTel Collector → ES index",
    "description": "Elastic Managed OpenTelemetry Collector depends on the Elasticsearch index tier over HTTP for bulk ingestion. The current sample shows repeated _bulk requests routed by the ingress proxy to es-es-inde",
    "properties": {
      "source": "opentelemetry-collector",
      "target": "es-es-index",
      "protocol": "http"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "http",
      "opentelemetry",
      "bulk-ingest",
      "elasticsearch"
    ],
    "dependency_targets": [
      "es-es-index"
    ]
  },
  {
    "id": "filebeat-to-es-es-index",
    "uuid": "e9b28937-6cd0-5fb1-aec3-b0d40b88e715",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Filebeat → ES index",
    "description": "Filebeat depends on the Elasticsearch index tier over HTTP(S) through the ingress proxy for bulk ingestion. The sampled proxy log shows external Filebeat bulk traffic routed to an es-es-index backend ",
    "properties": {
      "source": "filebeat",
      "target": "es-es-index",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "filebeat",
      "elasticsearch"
    ],
    "dependency_targets": [
      "es-es-index"
    ]
  },
  {
    "id": "apm-agent-php-to-motel-ingest-collector",
    "uuid": "f326d42f-56f0-54eb-ae98-a756f14bc746",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "PHP APM Agent → motel-ingest-collector",
    "description": "A PHP APM agent sends HTTP intake traffic to the motel-ingest-collector service behind the ingress proxy. The logs show external APM events being routed to the collector namespace over the APM intake ",
    "properties": {
      "source": "apm-agent-php",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "elasticsearch-js-to-es-es-search",
    "uuid": "6e3690e2-9d72-56cb-b364-a6c19a17c8a7",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "elasticsearch-js → ES search",
    "description": "An external application using the Elasticsearch JavaScript client sends HTTP search requests through the ingress proxy to the Elasticsearch search tier. The logs explicitly show search API traffic rou",
    "properties": {
      "source": "elasticsearch-js",
      "target": "es-es-search",
      "protocol": "http"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "http",
      "elasticsearch-client",
      "javascript"
    ],
    "dependency_targets": [
      "es-es-search"
    ]
  },
  {
    "id": "cloudbeat-to-gcp-cloudkms",
    "uuid": "6d35c5db-fca8-52c3-aa79-15e73055d20d",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cloudbeat → GCP Cloud KMS",
    "description": "The Cloudbeat CSPM workload explicitly processes Google Cloud KMS resources as part of GCP posture collection. The logs show Cloudbeat handling a cloudkms.googleapis.com crypto key resource in us-cent",
    "properties": {
      "source": "cloudbeat",
      "target": "gcp-cloudkms",
      "protocol": "https"
    },
    "confidence": 86,
    "tags": [
      "dependency",
      "gcp",
      "kms",
      "cloudbeat"
    ],
    "dependency_targets": [
      "gcp-cloudkms"
    ]
  },
  {
    "id": "motel-provisioner-to-ingest-endpoint-resolution-api",
    "uuid": "a0e70f46-5c5e-5d9c-b259-83e131817de8",
    "stream_name": "logging-managed-inputs",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "provisioner → ingest endpoint",
    "description": "motel-provisioner has an explicit dependency on an ingest endpoint resolution API used to retrieve the latest ingest target. Current logs add another hosted GCP request resolving a us-west2 GCP Elasti",
    "properties": {
      "source": "motel-provisioner",
      "target": "ingest-endpoint-resolution-api",
      "protocol": "http"
    },
    "confidence": 82,
    "tags": [
      "dependency",
      "http",
      "api",
      "resolution",
      "ingest-endpoint"
    ],
    "dependency_targets": [
      "ingest-endpoint-resolution-api"
    ]
  },
  {
    "id": "crossplane-to-docker-registry",
    "uuid": "b17f05eb-5205-578e-ae7e-583613eb716f",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Crossplane → Registry",
    "description": "A Crossplane client fetches function packages over HTTP from the Docker registry service at docker.elastic.co. The observed request targets a mirrored Crossplane function artifact, showing an explicit",
    "properties": {
      "source": "crossplane",
      "target": "docker-registry",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "registry",
      "crossplane"
    ],
    "dependency_targets": [
      "docker-registry"
    ]
  },
  {
    "id": "fluent-bit-to-es-es-index",
    "uuid": "b77562fd-0f54-5d08-9aa3-d9b1baba39ea",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Fluent Bit → ES index",
    "description": "Fluent Bit sends HTTP bulk ingestion traffic through the ingress proxy to the Elasticsearch index tier. This sample adds another explicit external bulk request routed to an es-es-index backend in an o",
    "properties": {
      "source": "fluent-bit",
      "target": "es-es-index",
      "protocol": "http"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "http",
      "fluent-bit",
      "elasticsearch"
    ],
    "dependency_targets": [
      "es-es-index"
    ]
  },
  {
    "id": "logstash-to-es-es-index",
    "uuid": "ec19f7da-c2a4-52f4-94a5-c5043d2444fc",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Logstash → ES index",
    "description": "Logstash depends on the Elasticsearch index tier over HTTP for bulk ingestion through the ingress proxy. The sampled request shows compressed external bulk traffic routed to an es-es-index backend in ",
    "properties": {
      "source": "logstash",
      "target": "es-es-index",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "bulk",
      "ingest"
    ],
    "dependency_targets": [
      "es-es-index"
    ]
  },
  {
    "id": "metricbeat-to-aws-cloudwatch",
    "uuid": "3bc14cd9-77be-5354-93cf-3f2eb6edad21",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "Metricbeat AWS → CloudWatch",
    "description": "The Metricbeat-style AWS CloudWatch collection stack is explicitly configured for an AWS RDS target over AWS CloudWatch APIs. The logs reveal the aws-rds collector path through awscredentialsprovider ",
    "properties": {
      "source": "metricbeat",
      "target": "aws-cloudwatch",
      "protocol": "https"
    },
    "confidence": 77,
    "tags": [
      "dependency",
      "api",
      "aws",
      "cloudwatch"
    ],
    "dependency_targets": [
      "aws-cloudwatch"
    ]
  },
  {
    "id": "auditbeat-to-elasticsearch",
    "uuid": "1931feb7-f76a-5009-9972-64cc71d65b5b",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Auditbeat → Elasticsearch",
    "description": "Auditbeat shows an explicit output dependency on Elasticsearch-compatible ingestion, with monitoring metrics reporting acknowledged output batches and write activity. The evidence is indirect about th",
    "properties": {
      "source": "auditbeat",
      "target": "elasticsearch",
      "protocol": "http"
    },
    "confidence": 63,
    "tags": [
      "dependency",
      "beats",
      "http",
      "inferred"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "srv-ts-event-receiver-to-motel-ingest-collector",
    "uuid": "bb3eef81-a862-5669-a5c7-22e14dcbe26e",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "srv-ts-event-receiver → collector",
    "description": "srv-ts-event-receiver has an explicit upstream-to-collector HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The relationship is directly identified by the service.name q",
    "properties": {
      "source": "srv-ts-event-receiver",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "entry-api-db-to-motel-ingest-collector",
    "uuid": "ff14c57b-fbe5-53e9-a5de-a36520e8d577",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "entry-api-db → collector",
    "description": "entry-api-db has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake traffic. The Ruby APM user agent names the upstream service directly while the request path identifies",
    "properties": {
      "source": "entry-api-db",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "apm",
      "ruby"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "commerce-gateway-to-motel-ingest-collector",
    "uuid": "a90cd31b-ef7c-558c-ad16-504a986043de",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "commerce-gateway → collector",
    "description": "commerce-gateway has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake traffic. The APM Java user agent identifies the upstream service and the intake path identifies the re",
    "properties": {
      "source": "commerce-gateway",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "apm",
      "java"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "sso-to-motel-ingest-collector",
    "uuid": "421d7638-28fd-51bb-b8b6-a12df521f189",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "sso → collector",
    "description": "sso has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The PHP APM user agent identifies the upstream service and the intake path identifies the receiving colle",
    "properties": {
      "source": "sso",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 95,
    "tags": [
      "dependency",
      "http",
      "elastic-apm",
      "php"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "surl-service-to-motel-ingest-collector",
    "uuid": "7a7d84a3-8bcb-5d09-b58b-902c0ff888e5",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "surl-service → collector",
    "description": "surl-service has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The Ruby APM user agent and query parameter service.name directly identify the upstream work",
    "properties": {
      "source": "surl-service",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 95,
    "tags": [
      "dependency",
      "http",
      "elastic-apm",
      "ruby"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "web-recursos-questoes-objetiva-pnd-to-motel-ingest-collector",
    "uuid": "48f60346-af5e-5da9-bb1c-54b95ed1d712",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Web Recursos PND → collector",
    "description": "Web Recursos Questoes Objetiva - PND has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake root requests. The query parameter service.name and the .NET APM user agent both i",
    "properties": {
      "source": "Web Recursos Questoes Objetiva - PND",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 94,
    "tags": [
      "dependency",
      "http",
      "elastic-apm",
      "dotnet"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "fgv-sistema-de-correncneo-to-motel-ingest-collector",
    "uuid": "9637635a-803c-5ad8-a650-1296ffa3eac8",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "FGV Sistema → collector",
    "description": "FGV Sistema de CorreNCNEo has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The PHP APM user agent identifies the upstream service and the intake path iden",
    "properties": {
      "source": "FGV Sistema de CorreNCNEo",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "http",
      "apm",
      "php"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "httpjson-to-cisco-duo",
    "uuid": "a46ec283-da5a-5573-a4de-fefaf3806960",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "httpjson → Cisco Duo",
    "description": "The HTTPJSON component integrates with Cisco Duo as an external API-backed source. Current logs explicitly tie the HTTPJSON receiver to the cisco_duo package and an offline enrollment collection path.",
    "properties": {
      "source": "httpjson",
      "target": "cisco-duo",
      "protocol": "https"
    },
    "confidence": 77,
    "tags": [
      "dependency",
      "api",
      "httpjson",
      "cisco-duo",
      "inferred"
    ],
    "dependency_targets": [
      "cisco-duo"
    ]
  },
  {
    "id": "cel-to-ti-abusech",
    "uuid": "cb2da7e4-d1aa-5660-be2c-0e863b3f2b16",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cel → TI AbuseCH",
    "description": "The CEL input integrates with the TI AbuseCH package as an external feed source. Current logs explicitly tie the CEL receiver to a ti_abusech URL path under agentless.",
    "properties": {
      "source": "cel",
      "target": "ti-abusech",
      "protocol": "https"
    },
    "confidence": 74,
    "tags": [
      "dependency",
      "api",
      "cel",
      "ti-abusech",
      "inferred"
    ],
    "dependency_targets": [
      "ti-abusech"
    ]
  },
  {
    "id": "cel-to-ess-billing",
    "uuid": "0c08c6fc-dcf8-5290-b6f1-431935c23031",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cel → ESS Billing",
    "description": "The CEL input integrates with the Elastic Cloud billing API over HTTPS for ESS billing collection. Monitoring fields include a concrete billing API URL and the workload is labeled with the ess_billing",
    "properties": {
      "source": "cel",
      "target": "ess-billing",
      "protocol": "https"
    },
    "confidence": 95,
    "tags": [
      "dependency",
      "api",
      "https",
      "billing",
      "cel"
    ],
    "dependency_targets": [
      "ess-billing"
    ]
  },
  {
    "id": "cel-to-sentinel-one",
    "uuid": "059b8634-e7f3-5cff-a72b-2c45c9dd86d2",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cel → SentinelOne",
    "description": "The CEL input integrates with SentinelOne as an external API-backed source. The logs explicitly tie a CEL receiver component to the sentinel_one package and application dataset, showing SentinelOne co",
    "properties": {
      "source": "cel",
      "target": "sentinel-one",
      "protocol": "https"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "api",
      "https",
      "cel",
      "security"
    ],
    "dependency_targets": [
      "sentinel-one"
    ]
  },
  {
    "id": "metricbeat-to-aws-securityhub",
    "uuid": "f7482249-7671-50dd-802a-7ce9e4669b93",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "metricbeat → AWS SecurityHub",
    "description": "The Metricbeat AWS metrics component depends on an AWS SecurityHub endpoint over HTTPS. The logs show an attempted connection to a SecurityHub hostname that fails DNS resolution, which still explicitl",
    "properties": {
      "source": "metricbeat",
      "target": "aws-securityhub",
      "protocol": "https"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "api",
      "https",
      "aws",
      "securityhub"
    ],
    "dependency_targets": [
      "aws-securityhub"
    ]
  },
  {
    "id": "aws-billing-to-elasticsearch",
    "uuid": "fdc86691-3bd5-5550-b6b7-e8c117f24eb9",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "aws billing → Elasticsearch",
    "description": "An agentless AWS billing workload connects to an internal Elasticsearch endpoint over HTTPS. The logs explicitly print the Elasticsearch URL while the workload is labeled as the AWS billing integratio",
    "properties": {
      "source": "aws-billing",
      "target": "elasticsearch",
      "protocol": "https"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "https",
      "elasticsearch",
      "aws",
      "billing"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "httpjson-to-aws-securityhub",
    "uuid": "9104d61e-2af6-57ba-9643-79af41f76525",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "httpjson → AWS SecurityHub",
    "description": "The HTTPJSON component integrates with an AWS SecurityHub insights endpoint over HTTPS. The logs explicitly show POST requests to the SecurityHub insights API failing during DNS resolution, which stil",
    "properties": {
      "source": "httpjson",
      "target": "aws-securityhub",
      "protocol": "https"
    },
    "confidence": 89,
    "tags": [
      "dependency",
      "api",
      "https",
      "aws",
      "securityhub"
    ],
    "dependency_targets": [
      "aws-securityhub"
    ]
  },
  {
    "id": "synthetics-http-to-elasticsearch",
    "uuid": "f516ce63-9e28-58a5-945d-bacd01721f41",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "synthetics → Elasticsearch",
    "description": "The synthetics HTTP workload depends on an internal Elasticsearch endpoint over HTTPS. The logs explicitly print the Elasticsearch URL from the heartbeat-based synthetics component.",
    "properties": {
      "source": "synthetics-http",
      "target": "elasticsearch",
      "protocol": "https"
    },
    "confidence": 86,
    "tags": [
      "dependency",
      "https",
      "elasticsearch",
      "synthetics"
    ],
    "dependency_targets": [
      "elasticsearch"
    ]
  },
  {
    "id": "connect-service-chattr-to-motel-ingest-collector",
    "uuid": "7f45cffa-986e-5918-94e0-a63d2d400b91",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "connect-service_chattr → collector",
    "description": "connect-service_chattr has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Java APM user agent identifies the upstream service and the intake path identifies",
    "properties": {
      "source": "connect-service_chattr",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "elasticsearch-metering-to-usage-api",
    "uuid": "00e3d16f-14fc-54be-9112-2da8db459029",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "usage-api → metering client",
    "description": "The usage-api service handles HTTP requests from an Elasticsearch metering client at its /api/v1/usage endpoint. This is an explicit inbound integration to usage-api over HTTP from a metering-related ",
    "properties": {
      "source": "elasticsearch-metering",
      "target": "usage-api",
      "protocol": "http"
    },
    "confidence": 77,
    "tags": [
      "dependency",
      "http",
      "inferred"
    ],
    "dependency_targets": [
      "usage-api"
    ]
  },
  {
    "id": "inscricao-web-to-motel-ingest-collector",
    "uuid": "96d31cd1-da0b-51b2-a2c6-5def15fa3faa",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "inscricao-web → collector",
    "description": "inscricao-web has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The .NET APM user agent names the upstream service and the intake path identifies the recei",
    "properties": {
      "source": "inscricao-web",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 95,
    "tags": [
      "dependency",
      "http",
      "apm",
      "dotnet"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "unknown-go-client-to-motel-ingest-collector",
    "uuid": "936004b7-8d02-5e4a-b59e-28ccd05395e1",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Go client → collector",
    "description": "An unidentified Go-based client has an explicit HTTP dependency on motel-ingest-collector via the Elastic APM intake endpoint. The user agent shows Go-http-client/1.1 but does not expose a service nam",
    "properties": {
      "source": "unknown-go-client",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 52,
    "tags": [
      "dependency",
      "http",
      "go",
      "inferred"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "dmc-clear-user-to-motel-ingest-collector",
    "uuid": "92c4119b-fc64-55a4-85f3-c5afe5ae0a3b",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "dmc-clear-user → collector",
    "description": "dmc-clear-user has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Ruby APM user agent identifies the upstream service and the intake endpoint identifies the",
    "properties": {
      "source": "dmc-clear-user",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "http",
      "ruby",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "sln-transaction-service-to-motel-ingest-collector",
    "uuid": "954db8c0-b8ad-5bb5-a475-fecb3cd2e943",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "sln-transaction-service → collector",
    "description": "sln-transaction-service has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The Java APM user agent names the upstream service and the intake path identifies",
    "properties": {
      "source": "sln-transaction-service",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm",
      "service_dependency"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "opbeans-java-to-motel-ingest-collector",
    "uuid": "4193f671-ee12-5fa2-a7b4-400fe91517c7",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "opbeans-java → collector",
    "description": "opbeans-java has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Java APM user agent names the upstream service and the intake endpoint identifies the receiv",
    "properties": {
      "source": "opbeans-java",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "controlle-banking-integration-to-motel-ingest-collector",
    "uuid": "0ca7be4f-70ec-563d-a86e-9dd243420305",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "controlle-banking-integration → collector",
    "description": "controlle-banking-integration has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The Node.js APM user agent directly identifies the upstream service and the",
    "properties": {
      "source": "controlle-banking-integration",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "docker-to-docker-registry",
    "uuid": "84a04b2b-ac2f-5a0a-a8f0-77c45ff17c57",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Docker → Registry",
    "description": "A Docker client depends on the Docker Registry service over HTTP(S) to fetch container image manifests from docker.elastic.co. The access log shows an explicit HEAD request for a Metricbeat Wolfi imag",
    "properties": {
      "source": "docker",
      "target": "docker-registry",
      "protocol": "http"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "http",
      "registry"
    ],
    "dependency_targets": [
      "docker-registry"
    ]
  },
  {
    "id": "containerd-to-docker-registry",
    "uuid": "b73fd9a6-2f46-55f5-bae0-e0b1564e7d38",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "containerd → Registry",
    "description": "containerd depends on the Docker Registry service over HTTP(S) to fetch image manifests from docker.elastic.co. The access log shows a direct registry manifest request from a containerd 2.1.7 client f",
    "properties": {
      "source": "containerd",
      "target": "docker-registry",
      "protocol": "http"
    },
    "confidence": 88,
    "tags": [
      "dependency",
      "http",
      "registry"
    ],
    "dependency_targets": [
      "docker-registry"
    ]
  },
  {
    "id": "ordereat-backend-api-to-motel-ingest-collector",
    "uuid": "2dabacad-8826-55df-8d7c-b3a2eee4de70",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "OrderEAT → collector",
    "description": "OrderEAT_Backend_API has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The intake query string and .NET APM user agent directly identify the upstream servi",
    "properties": {
      "source": "OrderEAT_Backend_API",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "apm-intake"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "web-recursos-questoes-objetiva-to-motel-ingest-collector",
    "uuid": "9a5e3f24-6d74-5397-9e72-6f10742ee1b2",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "Web Recursos → collector",
    "description": "Web Recursos Questoes Objetiva has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The current sample shows the upstream service on a Homolog environment wit",
    "properties": {
      "source": "Web Recursos Questoes Objetiva",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "http",
      "apm-intake"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "ras-ops-bkg-to-motel-ingest-collector",
    "uuid": "aef7301e-ca75-5e34-bcdc-3977b8889934",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "RAS_OPS_BKG → collector",
    "description": "RAS_OPS_BKG has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The .NET APM user agent identifies the upstream service and the intake path identifies the receiv",
    "properties": {
      "source": "RAS_OPS_BKG",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 94,
    "tags": [
      "dependency",
      "http",
      "apm",
      "dotnet"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "opbeans-dotnet-to-motel-ingest-collector",
    "uuid": "c2979c1a-1741-5708-a6f3-cc03674b6078",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "opbeans-dotnet → collector",
    "description": "opbeans-dotnet has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The .NET APM user agent names the upstream service and the intake path identifies the rece",
    "properties": {
      "source": "opbeans-dotnet",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "apm",
      "service_dependency"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "connect-client-v3-chattrtemplates-fs-1551-to-motel-ingest-collector",
    "uuid": "e607f65b-89e6-5091-a793-6133183ef1ca",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "connect-client-v3 → collector",
    "description": "connect-client-v3_ChattrTemplates_FS-1551 has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake traffic. The Java APM user agent identifies the upstream service and the ",
    "properties": {
      "source": "connect-client-v3_ChattrTemplates_FS-1551",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 90,
    "tags": [
      "dependency",
      "http",
      "apm",
      "service_dependency"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "elastic-managed-opentelemetry-collector-to-motel-provisioner",
    "uuid": "ceb6ce4e-6238-5ec2-82b0-6644c8c1a236",
    "stream_name": "logging-managed-inputs",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "provisioner → Managed OTel",
    "description": "motel-provisioner has an explicit interaction with Elastic Managed OpenTelemetry Collector clients through its resolve API. Current samples add a new managed collector build identifier calling the pro",
    "properties": {
      "source": "elastic-managed-opentelemetry-collector",
      "target": "motel-provisioner",
      "protocol": "http"
    },
    "confidence": 91,
    "tags": [
      "dependency",
      "http",
      "provisioning",
      "managed-collector"
    ],
    "dependency_targets": [
      "motel-provisioner"
    ]
  },
  {
    "id": "ecs-clients-to-motel-ingest-collector",
    "uuid": "420ef280-848b-5f0c-8b3a-0b5f5654990f",
    "stream_name": "logging-managed-inputs",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "ingest → ECS clients",
    "description": "motel-ingest-collector explicitly enforces an ECS mapping-mode requirement on at least part of its ingress surface. Current samples show a request rejected because the required X-Elastic-Mapping-Mode ",
    "properties": {
      "source": "ecs-clients",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 83,
    "tags": [
      "dependency",
      "http",
      "ecs",
      "ingress"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "elastic-opentelemetry-collector-distribution-to-motel-ingest-collector",
    "uuid": "2f007587-e867-5f62-bf63-cb129cd0beaa",
    "stream_name": "logging-managed-inputs",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "ingest → unresolved host",
    "description": "motel-ingest-collector is explicitly observed handling export attempts toward an unresolved hosted ingest hostname. Current samples add a trace export request from Elastic OpenTelemetry Collector dist",
    "properties": {
      "source": "elastic-opentelemetry-collector-distribution",
      "target": "motel-ingest-collector",
      "protocol": "grpc"
    },
    "confidence": 74,
    "tags": [
      "dependency",
      "grpc",
      "hosted",
      "error"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "docker-registry-to-docker-auth",
    "uuid": "a10e5ec4-db59-59dd-a85e-bbd64b5d3b71",
    "stream_name": "logging-gcp-us-central1-logs-all",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "docker-auth → Docker Registry",
    "description": "Docker Registry depends on the Docker Auth service for authorization decisions in the container-library environment. The sampled logs show registry authorization failures alongside docker-auth static ",
    "properties": {
      "source": "docker-registry",
      "target": "docker-auth",
      "protocol": "http"
    },
    "confidence": 76,
    "tags": [
      "dependency",
      "registry",
      "auth"
    ],
    "dependency_targets": [
      "docker-auth"
    ]
  },
  {
    "id": "notification-to-motel-ingest-collector",
    "uuid": "b247ec91-971c-576f-ab2d-98faf6e093eb",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "notification → collector",
    "description": "notification has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The Node.js APM user agent identifies the upstream service and the intake endpoint identifies th",
    "properties": {
      "source": "notification",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 87,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "surl-admin-to-motel-ingest-collector",
    "uuid": "1178453c-f964-5e91-befc-3b5b87950f93",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "surl-admin → collector",
    "description": "surl-admin has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The Ruby APM user agent identifies the upstream service and the intake endpoint identifies the",
    "properties": {
      "source": "surl-admin",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 87,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "cloudbeat-to-gcp-iam",
    "uuid": "05060be6-6bbe-50f3-9bd9-5edc468dd5c5",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "api_integration",
    "title": "cloudbeat → GCP IAM",
    "description": "The Cloudbeat CSPM workload explicitly interacts with Google IAM resources during cis_gcp posture collection. The samples show identity-management resources derived from iam.googleapis.com service acc",
    "properties": {
      "source": "cloudbeat",
      "target": "gcp-iam",
      "protocol": "https"
    },
    "confidence": 86,
    "tags": [
      "dependency",
      "api",
      "gcp",
      "iam"
    ],
    "dependency_targets": [
      "gcp-iam"
    ]
  },
  {
    "id": "insurance-api-uat-to-motel-ingest-collector",
    "uuid": "bd486e72-e5ba-5d6e-9867-19e93af5846e",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "insurance-api-uat → collector",
    "description": "insurance-api-uat has an explicit HTTP dependency on motel-ingest-collector through Elastic APM intake requests. The query string names the upstream service and staging environment while the APM user ",
    "properties": {
      "source": "insurance-api-uat",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "unity-individuals-to-motel-ingest-collector",
    "uuid": "b337f154-3058-5770-923e-71770de7c05e",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "unity_individuals → collector",
    "description": "unity_individuals has an explicit HTTP dependency on motel-ingest-collector via Elastic APM intake requests. The .NET APM user agent names the upstream service and the intake path identifies the recei",
    "properties": {
      "source": "unity_individuals",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "apm",
      "dotnet"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "pricing-service-to-motel-ingest-collector",
    "uuid": "f3b1a01d-d8c5-538e-8118-d027a0e68532",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "pricing-service → motel-ingest-collector",
    "description": "pricing-service sends Elastic APM intake traffic to motel-ingest-collector over HTTP using the Java APM agent. The collector log explicitly identifies the upstream service from the user agent on the /",
    "properties": {
      "source": "pricing-service",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 93,
    "tags": [
      "dependency",
      "http",
      "apm",
      "java"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "clientbook-meta-imports-to-motel-ingest-collector",
    "uuid": "ac1e345f-6459-5d41-85fb-6635f86f41ae",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "clientbook-meta-imports → motel-ingest-collector",
    "description": "clientbook-meta-imports sends Elastic APM intake traffic to motel-ingest-collector over HTTP on the /intake/v2/events path. The collector log explicitly identifies the source service and Node.js APM a",
    "properties": {
      "source": "clientbook-meta-imports",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "apm",
      "nodejs"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "connect-service-snowflake-to-motel-ingest-collector",
    "uuid": "9e8c03d3-8b41-5907-b0eb-d2f0c829092f",
    "stream_name": "logging-motel-ingest-collector",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "connect-service_snowflake → motel-ingest-collector",
    "description": "connect-service_snowflake sends Elastic APM intake traffic to motel-ingest-collector over HTTP. The collector log explicitly identifies the upstream Java service from the user agent on the root intake",
    "properties": {
      "source": "connect-service_snowflake",
      "target": "motel-ingest-collector",
      "protocol": "http"
    },
    "confidence": 92,
    "tags": [
      "dependency",
      "http",
      "apm",
      "java"
    ],
    "dependency_targets": [
      "motel-ingest-collector"
    ]
  },
  {
    "id": "synthetics-tcp-to-agentless-metrics-endpoint",
    "uuid": "f2e783f4-132b-5aaf-8140-8c805bd7c8f8",
    "stream_name": "logging-gcp-us-central1-logs-agentless-log-default",
    "type": "dependency",
    "subtype": "service_dependency",
    "title": "synthetics tcp → agentless metrics",
    "description": "The synthetics TCP input depends on an internal agentless metrics or stats endpoint exposed over a Unix domain socket. The samples show the endpoint being opened by agentless and the synthetics unit l",
    "properties": {
      "source": "synthetics-tcp",
      "target": "agentless-metrics-endpoint",
      "protocol": "unix"
    },
    "confidence": 82,
    "tags": [
      "dependency",
      "unix-socket",
      "internal",
      "synthetics"
    ],
    "dependency_targets": [
      "agentless-metrics-endpoint"
    ]
  }
];
