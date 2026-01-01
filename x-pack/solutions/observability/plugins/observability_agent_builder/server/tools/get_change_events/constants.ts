/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_COMBINED_EVENTS = 20;

export const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};

export const ALL_CHANGE_TYPES = ['deployment', 'configuration', 'feature_flag', 'scaling'] as const;
export type ChangeType = (typeof ALL_CHANGE_TYPES)[number];

export const DEFAULT_CHANGE_EVENT_FIELDS = [
  '@timestamp',
  'message',
  'body',
  // OTel standard for event names
  'event.name',
  // ECS standards
  'event.action',
  'event.category',
  'event.kind',
  // K8s & Service context
  'k8s.event.reason',
  'k8s.object.kind',
  'service.name',
  'service.version',
  'service.instance.id', // Critical for correlating a specific pod/host
  'service.environment',
  'deployment.environment.name',
  'k8s.deployment.name',
  'k8s.namespace.name',
  'k8s.object.name', // Captures ConfigMap, HPA, Rollout changes not tied to Deployment
  'deployment.id',
  'deployment.name',
  'deployment.version',
  'host.name',
  'container.image.name',
  'container.image.tag',
  // Feature flags (OTel SemConv)
  'feature_flag.key',
  'feature_flag.variant',
  'feature_flag.provider.name',
  // Feature flags (ECS fallback)
  'labels.feature_flag_key',
];
