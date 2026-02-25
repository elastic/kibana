/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateInventoryViewAttributes } from './apis/inventory_views/types';

export const DATE_WITH_HOSTS_DATA_FROM = '2023-03-28T18:20:00.000Z';
export const DATE_WITH_HOSTS_DATA_TO = '2023-03-28T18:21:00.000Z';
export const DATE_WITH_HOSTS_DATA = '03/28/2023 6:20:59 PM';
export const DATE_WITH_HOSTS_DATA_TIMESTAMP = 1680027659000;

export const HOST1_NAME = 'host-1';
export const HOST2_NAME = 'host-2';
export const HOST3_NAME = 'host-3';
export const HOST4_NAME = 'host-4';
export const HOST5_NAME = 'host-5';
export const HOST6_NAME = 'host-6';

export const HOSTS_METADATA_FIELD = 'host.name';

export const LOG_LEVELS = [
  { message: 'A simple log', level: 'info' },
  { message: 'Yet another debug log', level: 'debug' },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
];

export const HOST_NAME_WITH_SERVICES = HOST1_NAME;
export const SERVICE_PER_HOST_COUNT = 3;

export const HOSTS = [
  {
    hostName: HOST1_NAME,
    cpuValue: 0.5,
  },
  {
    hostName: HOST2_NAME,
    cpuValue: 0.7,
  },
  {
    hostName: HOST3_NAME,
    cpuValue: 0.9,
  },
  {
    hostName: HOST4_NAME,
    cpuValue: 0.3,
  },
  {
    hostName: HOST5_NAME,
    cpuValue: 0.1,
  },
  {
    hostName: HOST6_NAME,
    cpuValue: 0.4,
  },
];
export const DEFAULT_HOSTS_INVENTORY_VIEW_NAME = 'Hosts Default View';

export const DATE_WITH_HOSTS_WITHOUT_DATA_FROM = '2023-03-29T18:20:00.000Z';
export const DATE_WITH_HOSTS_WITHOUT_DATA_TO = '2023-03-29T18:21:00.000Z';
export const DATE_WITH_HOSTS_WITHOUT_DATA = '03/29/2023 6:20:59 PM';

export const HOST7_NAME = 'host-7';

export const HOSTS_WITHOUT_DATA = [
  {
    hostName: HOST7_NAME,
  },
];

export const DATE_WITH_K8S_HOSTS_DATA_FROM = '2023-03-30T18:20:00.000Z';
export const DATE_WITH_K8S_HOSTS_DATA_TO = '2023-03-30T18:21:00.000Z';
export const DATE_WITH_K8S_HOSTS_DATA = '03/30/2023 6:20:59 PM';

export const K8S_POD_NAME = 'demo-stack-kubernetes-pod-1';
export const K8S_HOST_NAME = 'demo-stack-kubernetes-01';

// cpuValue is sent to the generator to simulate different 'system.cpu.total.norm.pct' metric
// that is the default metric in inventory and hosts view and host details page
export const K8S_HOSTS = [
  {
    hostName: K8S_HOST_NAME,
    cpuValue: 0.5,
  },
];

export const DATE_WITH_DOCKER_DATA_FROM = '2023-03-31T18:20:00.000Z';
export const DATE_WITH_DOCKER_DATA_TO = '2023-03-31T18:21:00.000Z';
export const DATE_WITH_DOCKER_DATA = '03/31/2023 6:20:59 PM';
export const DATE_WITH_DOCKER_DATA_TIMESTAMP = 1680286859000;
export const CONTAINER_COUNT = 1;
export const CONTAINER_IDS = Array.from({ length: CONTAINER_COUNT }, (_, i) => `cont-${i}`);
export const CONTAINER_NAMES = Array.from(
  { length: CONTAINER_COUNT },
  (_, i) => `container-cont-${i}`
);

export const CONTAINER_METADATA_FIELD = 'container.id';

export const DEFAULT_CONTAINERS_INVENTORY_VIEW_NAME = 'Containers Default View';

export const DATE_WITH_POD_DATA_FROM = '2023-04-01T18:20:00.000Z';
export const DATE_WITH_POD_DATA_TO = '2023-04-01T18:21:00.000Z';
export const DATE_WITH_POD_DATA = '04/01/2023 6:20:59 PM';
export const POD_COUNT = 1;
export const POD_NAMES = Array.from({ length: POD_COUNT }, (_, i) => `pod-${i}`);

export const DATE_WITHOUT_DATA = '04/01/2024 6:20:59 PM';

export const EXTENDED_TIMEOUT = 45000; // 45 seconds

export const KUBERNETES_TOUR_STORAGE_KEY = 'isKubernetesTourSeen';
export const KUBERNETES_CARD_DISMISSED_STORAGE_KEY = 'infra.inventory.k8sCardDismissed';
export const KUBERNETES_TOAST_STORAGE_KEY = 'kubernetesToastKey';

export const BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES: Omit<
  CreateInventoryViewAttributes,
  'nodeType' | 'name' | 'time' | 'metric'
> = {
  groupBy: [],
  view: 'map',
  customOptions: [],
  customMetrics: [],
  boundsOverride: {
    max: 1,
    min: 0,
  },
  autoBounds: true,
  accountId: '',
  region: '',
  legend: {
    palette: 'cool',
    reverseColors: false,
    steps: 10,
  },
  sort: {
    by: 'name',
    direction: 'desc',
  },
  timelineOpen: false,
  autoReload: false,
  filterQuery: {
    expression: '',
    kind: 'kuery',
  },
  preferredSchema: 'ecs',
};
