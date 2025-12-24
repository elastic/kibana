/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export const DATE_WITH_HOSTS_DATA_FROM = moment().subtract(11, 'minutes').toISOString();
export const DATE_WITH_HOSTS_DATA_TO = moment().subtract(1, 'minute').toISOString();
export const DATE_WITH_HOSTS_DATA = moment()
  .subtract(1, 'minute')
  .subtract(1, 'second')
  .format('MM/DD/YYYY h:mm:ss A');

export const HOST1_NAME = 'host-1';
export const HOST2_NAME = 'host-2';
export const HOST3_NAME = 'host-3';
export const HOST4_NAME = 'host-4';
export const HOST5_NAME = 'host-5';
export const HOST6_NAME = 'host-6';

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

export const DATE_WITH_HOSTS_WITHOUT_DATA_FROM = moment().subtract(22, 'minutes').toISOString();
export const DATE_WITH_HOSTS_WITHOUT_DATA_TO = moment().subtract(12, 'minutes').toISOString();
export const DATE_WITH_HOSTS_WITHOUT_DATA = moment()
  .subtract(12, 'minutes')
  .subtract(1, 'second')
  .format('MM/DD/YYYY h:mm:ss A');

export const HOST7_NAME = 'host-7';

export const HOSTS_WITHOUT_DATA = [
  {
    hostName: HOST7_NAME,
  },
];

export const DATE_WITH_K8S_HOSTS_DATA_FROM = moment().subtract(33, 'minutes').toISOString();
export const DATE_WITH_K8S_HOSTS_DATA_TO = moment().subtract(23, 'minutes').toISOString();
export const DATE_WITH_K8S_HOSTS_DATA = moment()
  .subtract(23, 'minutes')
  .subtract(1, 'second')
  .format('MM/DD/YYYY h:mm:ss A');

export const K8S_POD_NAME = 'pod-1';
export const K8S_HOST_NAME = 'demo-stack-kubernetes-01';

// cpuValue is sent to the generator to simulate different 'system.cpu.total.norm.pct' metric
// that is the default metric in inventory and hosts view and host details page
export const K8S_HOSTS = [
  {
    hostName: K8S_HOST_NAME,
    cpuValue: 0.5,
  },
];

export const DATE_WITH_POD_DATA_FROM = moment().subtract(44, 'minutes').toISOString();
export const DATE_WITH_POD_DATA_TO = moment().subtract(34, 'minutes').toISOString();
export const DATE_WITH_POD_DATA = moment()
  .subtract(34, 'minutes')
  .subtract(1, 'second')
  .format('MM/DD/YYYY h:mm:ss A');
export const POD_COUNT = 1;
