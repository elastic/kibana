/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Curated list of observability fields to check for existence in a cluster.
 * Used to quickly determine:
 * 1. Which common fields are available for filtering/grouping
 * 2. Whether the cluster uses ECS or OTel naming conventions
 */

export interface CuratedField {
  /** ECS field name */
  ecs: string;
  /** OpenTelemetry equivalent (if different) */
  otel?: string;
}

export const CURATED_OBSERVABILITY_FIELDS: CuratedField[] = [
  // Timestamp
  { ecs: '@timestamp' },

  // Service identity
  { ecs: 'service.name', otel: 'resource.attributes.service.name' },
  { ecs: 'service.environment', otel: 'resource.attributes.deployment.environment' },
  { ecs: 'service.version', otel: 'resource.attributes.service.version' },

  // Host infrastructure
  { ecs: 'host.name', otel: 'resource.attributes.host.name' },
  { ecs: 'host.ip', otel: 'resource.attributes.host.ip' },

  // Container
  { ecs: 'container.id', otel: 'resource.attributes.container.id' },
  { ecs: 'container.name', otel: 'resource.attributes.container.name' },

  // Kubernetes
  { ecs: 'kubernetes.namespace', otel: 'resource.attributes.k8s.namespace.name' },
  { ecs: 'kubernetes.pod.name', otel: 'resource.attributes.k8s.pod.name' },
  { ecs: 'kubernetes.node.name', otel: 'resource.attributes.k8s.node.name' },
  { ecs: 'kubernetes.deployment.name', otel: 'resource.attributes.k8s.deployment.name' },

  // Cloud
  { ecs: 'cloud.provider', otel: 'resource.attributes.cloud.provider' },
  { ecs: 'cloud.region', otel: 'resource.attributes.cloud.region' },
  { ecs: 'cloud.availability_zone', otel: 'resource.attributes.cloud.availability_zone' },

  // Traces
  { ecs: 'trace.id', otel: 'trace_id' },
  { ecs: 'span.id', otel: 'span_id' },
  { ecs: 'transaction.id' },
  { ecs: 'transaction.name' },
  { ecs: 'transaction.type' },
  { ecs: 'span.name' },

  // HTTP
  { ecs: 'http.request.method', otel: 'attributes.http.request.method' },
  { ecs: 'http.response.status_code', otel: 'attributes.http.response.status_code' },
  { ecs: 'url.path', otel: 'attributes.url.path' },

  // Event
  { ecs: 'event.outcome' },

  // Errors
  { ecs: 'error.type', otel: 'attributes.exception.type' },
  { ecs: 'error.message', otel: 'attributes.exception.message' },

  // Log severity
  { ecs: 'log.level', otel: 'severity_text' },
  { ecs: 'message', otel: 'body.text' },
];
