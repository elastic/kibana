/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATES = {
  '7.0.0': {
    hosts: {
      min: '01/15/2019 04:54:21 PM',
      max: '01/15/2019 05:03:51 PM',
    },
  },
  '6.6.0': {
    docker: {
      min: '01/15/2019 06:48:52 PM',
      max: '01/15/2019 07:04:50 PM',
    },
  },
  metricsAndLogs: {
    hosts: {
      withData: '10/17/2018 7:58:03 PM',
      withoutData: '10/09/2018 10:00:00 PM',
      min: '2018-10-17T19:42:21.208Z',
      max: '2018-10-17T19:58:03.952Z',
      processesDataStartDate: '2023-03-28T18:20:00.000Z',
      processesDataEndDate: '2023-03-28T18:21:00.000Z',
      kubernetesSectionStartDate: '2023-09-19T07:20:00.000Z',
      kubernetesSectionEndDate: '2023-09-19T07:21:00.000Z',
    },
    pods: {
      withData: '01/20/2022 5:10:00 PM',
    },
    stream: {
      startWithData: '2018-10-17T19:42:22.000Z',
      endWithData: '2018-10-17T19:57:21.000Z',
    },
  },
};

export const ML_JOB_IDS = [
  'kibana-metrics-ui-default-default-hosts_memory_usage',
  'kibana-metrics-ui-default-default-hosts_network_out',
  'kibana-metrics-ui-default-default-hosts_network_in',
  'kibana-metrics-ui-default-default-k8s_network_out',
  'kibana-metrics-ui-default-default-k8s_network_in',
  'kibana-metrics-ui-default-default-k8s_memory_usage',
];

export const HOSTS_LINK_LOCAL_STORAGE_KEY = 'inventoryUI:hostsLinkClicked';

export const INVENTORY_PATH = 'metrics/inventory';
export const NODE_DETAILS_PATH = 'detail';
export const HOSTS_VIEW_PATH = 'metrics/hosts';

export const DATE_PICKER_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

// synthtrace date constants

export const DATE_WITH_DOCKER_DATA_FROM = '2023-03-28T18:20:00.000Z';
export const DATE_WITH_DOCKER_DATA_TO = '2023-03-28T18:21:00.000Z';
export const DATE_WITH_DOCKER_DATA = '03/28/2023 6:20:59 PM';

export const DATE_WITH_HOSTS_DATA_FROM = '2023-03-28T18:20:00.000Z';
export const DATE_WITH_HOSTS_DATA_TO = '2023-03-28T18:21:00.000Z';
export const DATE_WITH_HOSTS_DATA = '03/28/2023 6:20:59 PM';

export const DATE_WITH_POD_DATA_FROM = '2023-09-19T07:20:00.000Z';
export const DATE_WITH_POD_DATA_TO = '2023-09-19T07:21:00.000Z';
export const DATE_WITH_POD_DATA = '09/19/2023 7:20:59 AM';
