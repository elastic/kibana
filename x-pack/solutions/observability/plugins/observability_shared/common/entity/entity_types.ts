/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const createKubernetesEntity = <T extends string>(base: T) => ({
  ecs: `k8s.${base}.ecs` as const,
  semconv: `k8s.${base}.semconv` as const,
});

const createKubernetesV2Entity = <T extends string>(base: T) => ({
  ecs: `built_in_kubernetes_${base}_ecs` as const,
  semconv: `built_in_kubernetes_${base}_semconv` as const,
});

export const BUILT_IN_ENTITY_TYPES = {
  HOST_V2: 'built_in_hosts_from_ecs_data',
  CONTAINER_V2: 'built_in_containers_from_ecs_data',
  SERVICE_V2: 'built_in_services_from_ecs_data',
  KUBERNETES_V2: {
    CLUSTER: createKubernetesV2Entity('cluster'),
    CRON_JOB: createKubernetesV2Entity('cron_job'),
    DAEMON_SET: createKubernetesV2Entity('daemon_set'),
    DEPLOYMENT: createKubernetesV2Entity('deployment'),
    JOB: createKubernetesV2Entity('job'),
    NODE: createKubernetesV2Entity('node'),
    POD: createKubernetesV2Entity('pod'),
    REPLICA_SET: createKubernetesV2Entity('replica_set'),
    STATEFUL_SET: createKubernetesV2Entity('stateful_set'),
    SERVICE: 'built_in_kubernetes_service_ecs',
  },
  HOST: 'host',
  CONTAINER: 'container',
  SERVICE: 'service',
  KUBERNETES: {
    CLUSTER: createKubernetesEntity('cluster'),
    CONTAINER: createKubernetesEntity('container'),
    CRONJOB: createKubernetesEntity('cron_job'),
    DAEMONSET: createKubernetesEntity('daemonset'),
    DEPLOYMENT: createKubernetesEntity('deployment'),
    JOB: createKubernetesEntity('job'),
    NAMESPACE: createKubernetesEntity('namespace'),
    NODE: createKubernetesEntity('node'),
    POD: createKubernetesEntity('pod'),
    SERVICE: createKubernetesEntity('service'),
    STATEFULSET: createKubernetesEntity('statefulset'),
  },
} as const;
